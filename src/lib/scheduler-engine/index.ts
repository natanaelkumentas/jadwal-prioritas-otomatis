import { supabaseAdmin } from '../supabase';
import { CandidateRecommendation, Staff, Shift, GapEvent } from './types';
import { 
  checkRatingEligibility, 
  checkAvailability, 
  checkRestPeriod, 
  checkConsecutiveShifts 
} from './filters';
import { scoreCandidates } from './scoring';

if (!supabaseAdmin) {
  throw new Error('Supabase Admin client must be initialized (requires SUPABASE_SERVICE_ROLE_KEY)');
}

/**
 * Main function to generate ranked candidate recommendations for a given gap event.
 * 
 * @param gapEventId The ID of the gap event database record
 */
export async function getReplacementRecommendations(
  gapEventId: string
): Promise<CandidateRecommendation[]> {
  console.log(`[scheduler-engine] Generating recommendations for gap_event: ${gapEventId}`);

  // 1. Fetch Gap Event and Shift Details
  const { data: gapEventData, error: gapErr } = await supabaseAdmin!
    .from('gap_events')
    .select('*, shift:shifts(*, staff:staff(*))')
    .eq('id', gapEventId)
    .single();

  if (gapErr || !gapEventData) {
    throw new Error(`Failed to retrieve gap event: ${gapErr?.message || 'Not found'}`);
  }

  const gapEvent = gapEventData as any;
  const targetShift = gapEvent.shift as Shift;
  const absentStaff = targetShift.staff_id; // Original staff scheduled
  const targetDate = targetShift.date;
  const targetShiftCode = targetShift.shift_code;
  const targetGroup = targetShift.group;

  // Retrieve details of the original absent staff profile
  const absentStaffProfile = gapEvent.shift.staff as Staff;
  const targetSubGroup = absentStaffProfile.sub_group;

  // 2. Fetch the required ratings (inherited from the absent technician)
  const { data: absentRatingsData, error: ratingErr } = await supabaseAdmin!
    .from('staff_ratings')
    .select('rating:ratings(code)')
    .eq('staff_id', absentStaff);

  if (ratingErr) {
    throw new Error(`Failed to retrieve ratings for absent technician: ${ratingErr.message}`);
  }

  const requiredRatingCodes = (absentRatingsData as any[] || []).map(r => r.rating?.code).filter(Boolean);
  console.log(`[scheduler-engine] Shift requires ratings: ${JSON.stringify(requiredRatingCodes)}`);

  // 3. Fetch all staff members in the same group (CNS or ESS) along with their ratings
  const { data: staffData, error: staffErr } = await supabaseAdmin!
    .from('staff')
    .select('*, staff_ratings(rating:ratings(code))')
    .eq('group', targetGroup);

  if (staffErr || !staffData) {
    throw new Error(`Failed to retrieve staff listings: ${staffErr?.message}`);
  }

  const allStaff: Staff[] = (staffData as any[]).map(s => ({
    id: s.id,
    name: s.name,
    group: s.group,
    sub_group: s.sub_group,
    role_level: s.role_level,
    location: s.location,
    ratings: s.staff_ratings?.map((sr: any) => sr.rating?.code).filter(Boolean) || []
  }));

  // 4. Fetch all shifts for the month to calculate workload & rest periods
  const { data: shiftsData, error: shiftsErr } = await supabaseAdmin!
    .from('shifts')
    .select('*')
    .eq('group', targetGroup);

  if (shiftsErr || !shiftsData) {
    throw new Error(`Failed to retrieve shifts database records: ${shiftsErr?.message}`);
  }

  const allShifts = shiftsData as Shift[];

  // 5. Fetch active gap events for leave/absence verification
  const { data: gapEventsData, error: gapEventsErr } = await supabaseAdmin!
    .from('gap_events')
    .select('*')
    .eq('status', 'Pending');

  if (gapEventsErr) {
    throw new Error(`Failed to retrieve active gap events: ${gapEventsErr.message}`);
  }

  const allGapEvents = gapEventsData as GapEvent[];

  // 6. Filter candidates using hard constraints
  console.log(`[scheduler-engine] Evaluating ${allStaff.length} candidates against hard rules...`);
  
  const eligibleCandidates = allStaff.filter(c => {
    // A: Exclude the absent staff member themselves
    if (c.id === absentStaff) return false;

    // B: FR-3 Rating Competency filter
    if (!checkRatingEligibility(c, requiredRatingCodes)) return false;

    // C: FR-4 & FR-7 Availability & Leave filter
    if (!checkAvailability(c.id, targetDate, allShifts, allGapEvents)) return false;

    // D: FR-5 Minimum rest period of 11 hours filter
    if (!checkRestPeriod(c.id, targetDate, targetShiftCode, targetGroup, allShifts)) return false;

    // E: FR-6 Consecutive shift limits filter
    if (!checkConsecutiveShifts(c.id, targetDate, targetShiftCode, allShifts)) return false;

    return true;
  });

  console.log(`[scheduler-engine] Found ${eligibleCandidates.length} eligible candidates.`);

  // 7. Rank candidates using the MCDA scoring model
  const recommendations = scoreCandidates(
    eligibleCandidates,
    targetDate,
    targetShiftCode,
    targetGroup,
    targetSubGroup,
    allShifts
  );

  return recommendations;
}
