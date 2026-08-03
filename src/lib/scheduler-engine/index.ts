import { supabaseAdmin } from '../supabase';
import { CandidateRecommendation, Staff, Shift, GapEvent } from './types';
import { 
  checkRatingEligibility, 
  checkAvailability, 
  checkRestPeriod, 
  checkConsecutiveShifts,
  checkPostNightConstraint,
  getDaysDiff
} from './filters';
import { scoreCandidates } from './scoring';

if (!supabaseAdmin) {
  throw new Error('Supabase Admin client must be initialized (requires SUPABASE_SERVICE_ROLE_KEY)');
}

/**
 * Generate candidate recommendations directly for a given shift.
 * 
 * @param shiftId The ID of the shift database record
 */
export async function getShiftReplacementRecommendations(
  shiftId: string
): Promise<CandidateRecommendation[]> {
  console.log(`[scheduler-engine] Generating recommendations for shift: ${shiftId}`);

  // 1. Fetch Shift Details
  const { data: shiftData, error: shiftErr } = await supabaseAdmin!
    .from('shifts')
    .select('*, staff:staff(*)')
    .eq('id', shiftId)
    .single();

  if (shiftErr || !shiftData) {
    throw new Error(`Failed to retrieve shift: ${shiftErr?.message || 'Not found'}`);
  }

  const targetShift = shiftData as any;
  const absentStaff = targetShift.staff_id; // Original staff scheduled
  const targetDate = targetShift.date;
  const rawShiftCode = (targetShift.shift_code || '').toUpperCase();
  const targetGroup = targetShift.group;

  // Retrieve details of the original absent staff profile
  const absentStaffProfile = targetShift.staff as Staff;
  
  if (absentStaffProfile?.role_level === 'Manager Teknik') {
    console.log('[scheduler-engine] Shift belongs to Manager Teknik. No replacement suggestions needed.');
    return [];
  }

  const targetSubGroup = absentStaffProfile?.sub_group || 'Grup 1';

  // Determine effective work shift code to be covered (if raw is leave code, derive rotation work shift)
  // Uses the same daysFromAnchor formula as generator.ts, personnel.ts, and scheduler.ts
  const leaveCodes = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
  let effectiveShiftCode = rawShiftCode;
  if (leaveCodes.includes(rawShiftCode) || rawShiftCode === 'L' || rawShiftCode === 'Y') {
    const daysFromAnchor = Math.abs(getDaysDiff('2025-01-01', targetDate));
    if (targetGroup === 'ESS') {
      const essPatterns: Record<string, string[]> = {
        'ESS Grup 1': ['M', 'Y', 'L', 'PS', 'P'],
        'ESS Grup 2': ['P', 'M', 'Y', 'L', 'PS'],
        'ESS Grup 3': ['PS', 'P', 'M', 'Y', 'L'],
        'ESS Grup 4': ['L', 'PS', 'P', 'M', 'Y'],
        'ESS Grup 5': ['Y', 'L', 'PS', 'P', 'M']
      };
      const pat = essPatterns[targetSubGroup] || ['M', 'Y', 'L', 'PS', 'P'];
      effectiveShiftCode = pat[daysFromAnchor % pat.length];
    } else {
      const cnsPatterns: Record<string, string[]> = {
        'Grup 1': ['L', 'P', 'S', 'M', 'Y'],
        'Grup 2': ['P', 'S', 'M', 'Y', 'L'],
        'Grup 3': ['S', 'M', 'Y', 'L', 'P'],
        'Grup 4': ['M', 'Y', 'L', 'P', 'S'],
        'Grup 5': ['Y', 'L', 'P', 'S', 'M']
      };
      const pat = cnsPatterns[targetSubGroup] || ['P', 'S', 'M', 'Y', 'L'];
      effectiveShiftCode = pat[daysFromAnchor % pat.length];
    }
    if (effectiveShiftCode === 'L' || effectiveShiftCode === 'Y') {
      effectiveShiftCode = 'P';
    }
  }

  // 2. Fetch the required ratings (inherited from the technician originally on this shift - CNS only)
  let requiredRatingCodes: string[] = [];
  if (targetGroup === 'CNS') {
    const { data: absentRatingsData, error: ratingErr } = await supabaseAdmin!
      .from('staff_ratings')
      .select('rating:ratings(code)')
      .eq('staff_id', absentStaff);

    if (ratingErr) {
      throw new Error(`Failed to retrieve ratings for technician: ${ratingErr.message}`);
    }

    requiredRatingCodes = (absentRatingsData as any[] || []).map(r => r.rating?.code).filter(Boolean);
  }
  console.log(`[scheduler-engine] Shift requires ratings (${targetGroup}): ${JSON.stringify(requiredRatingCodes)}`);

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

  // 6. Filter candidates using hard constraints (3-Tier Cascade)
  console.log(`[scheduler-engine] Evaluating ${allStaff.length} candidates against hard rules (Tier 1) for shift ${effectiveShiftCode}...`);
  
  // Tier 1: Strict hard rules (cross-group, strict rest, strict post-night Y recovery)
  const tier1Candidates = allStaff.filter(c => {
    if (c.id === absentStaff) return false;
    if (!checkRatingEligibility(c, requiredRatingCodes)) return false;
    if (!checkAvailability(c.id, targetDate, allShifts, allGapEvents)) return false;
    if (!checkRestPeriod(c.id, targetDate, effectiveShiftCode, targetGroup, allShifts)) return false;
    if (!checkConsecutiveShifts(c.id, targetDate, effectiveShiftCode, allShifts)) return false;
    if (c.sub_group === targetSubGroup) return false; // Cross-group rule
    if (c.role_level === 'Manager Teknik') return false;
    if (!checkPostNightConstraint(c.id, targetDate, effectiveShiftCode, allShifts)) return false;
    return true;
  });

  if (tier1Candidates.length > 0) {
    console.log(`[scheduler-engine] Tier 1 found ${tier1Candidates.length} eligible candidates.`);
    return scoreCandidates(
      tier1Candidates,
      targetDate,
      effectiveShiftCode,
      targetGroup,
      targetSubGroup,
      allShifts,
      false,
      ''
    );
  }

  // Tier 2 Fallback: Relax subgroup exclusion (allow same subgroup off-duty staff)
  console.log(`[scheduler-engine] Tier 1 empty. Running Tier 2 (relaxing subgroup exclusion)...`);
  const tier2Candidates = allStaff.filter(c => {
    if (c.id === absentStaff) return false;
    if (c.role_level === 'Manager Teknik') return false;
    if (!checkRatingEligibility(c, requiredRatingCodes)) return false;
    if (!checkAvailability(c.id, targetDate, allShifts, allGapEvents)) return false;
    if (!checkPostNightConstraint(c.id, targetDate, effectiveShiftCode, allShifts)) return false;
    return true;
  });

  if (tier2Candidates.length > 0) {
    console.log(`[scheduler-engine] Tier 2 found ${tier2Candidates.length} fallback candidates.`);
    return scoreCandidates(
      tier2Candidates,
      targetDate,
      effectiveShiftCode,
      targetGroup,
      targetSubGroup,
      allShifts,
      true,
      'Same Subgroup Member'
    );
  }

  // Tier 3 Fallback: Emergency rotation (off-duty staff holding matching rating)
  console.log(`[scheduler-engine] Tier 2 empty. Running Tier 3 (Emergency Rotation Fallback)...`);
  const tier3Candidates = allStaff.filter(c => {
    if (c.id === absentStaff) return false;
    if (c.role_level === 'Manager Teknik') return false;
    if (!checkRatingEligibility(c, requiredRatingCodes)) return false;
    // Must be off-duty on target date
    const candidateShift = allShifts.find(s => s.staff_id === c.id && s.date === targetDate);
    if (candidateShift) {
      const code = candidateShift.shift_code.toUpperCase();
      if (code !== 'L' && code !== 'Y') return false;
    }
    return true;
  });

  if (tier3Candidates.length > 0) {
    console.log(`[scheduler-engine] Tier 3 found ${tier3Candidates.length} emergency candidates.`);
    return scoreCandidates(
      tier3Candidates,
      targetDate,
      effectiveShiftCode,
      targetGroup,
      targetSubGroup,
      allShifts,
      true,
      'Emergency Rotation Fallback'
    );
  }

  // Tier 4 Absolute Fallback: Off-duty staff WITHOUT rating check
  console.log(`[scheduler-engine] Tier 3 empty. Running Tier 4 (Off-Duty Without Rating Check)...`);
  const tier4Candidates = allStaff.filter(c => {
    if (c.id === absentStaff) return false;
    if (c.role_level === 'Manager Teknik') return false;
    const candidateShift = allShifts.find(s => s.staff_id === c.id && s.date === targetDate);
    if (candidateShift) {
      const code = candidateShift.shift_code.toUpperCase();
      if (code !== 'L' && code !== 'Y') return false;
    }
    return true;
  });

  if (tier4Candidates.length > 0) {
    console.log(`[scheduler-engine] Tier 4 found ${tier4Candidates.length} absolute fallback candidates.`);
    return scoreCandidates(
      tier4Candidates,
      targetDate,
      effectiveShiftCode,
      targetGroup,
      targetSubGroup,
      allShifts,
      true,
      'Darurat Tanpa Rating'
    );
  }

  // Tier 5 Last Resort: ANY non-absent, non-Manager staff (regardless of schedule)
  console.log(`[scheduler-engine] Tier 4 empty. Running Tier 5 (Last Resort — All Staff)...`);
  const tier5Candidates = allStaff.filter(c => {
    if (c.id === absentStaff) return false;
    if (c.role_level === 'Manager Teknik') return false;
    // Exclude staff who have active gap events (currently absent)
    const hasAbsence = allGapEvents.some(gap => {
      const gapShift = allShifts.find(s => s.id === gap.shift_id);
      return gapShift && gapShift.staff_id === c.id && gapShift.date === targetDate && gap.status === 'Pending';
    });
    if (hasAbsence) return false;
    return true;
  });

  console.log(`[scheduler-engine] Tier 5 found ${tier5Candidates.length} last-resort candidates.`);
  return scoreCandidates(
    tier5Candidates,
    targetDate,
    effectiveShiftCode,
    targetGroup,
    targetSubGroup,
    allShifts,
    true,
    'Darurat Semua Terisi'
  );
}

/**
 * Generate candidate recommendations for a gap event.
 * Delegates to getShiftReplacementRecommendations.
 */
export async function getReplacementRecommendations(
  gapEventId: string
): Promise<CandidateRecommendation[]> {
  console.log(`[scheduler-engine] Generating recommendations for gap_event: ${gapEventId}`);
  
  const { data: gapEventData, error: gapErr } = await supabaseAdmin!
    .from('gap_events')
    .select('shift_id')
    .eq('id', gapEventId)
    .single();

  if (gapErr || !gapEventData) {
    throw new Error(`Failed to retrieve gap event: ${gapErr?.message || 'Not found'}`);
  }

  return getShiftReplacementRecommendations(gapEventData.shift_id);
}
