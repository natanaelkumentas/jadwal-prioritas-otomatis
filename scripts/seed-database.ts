import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load variables directly from environment (injected via node --env-file=.env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

// Service role client bypasses RLS policies to seed data
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  db: { schema: 'jadwal' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const SEED_DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'seed-data.json');

async function seed() {
  console.log('--- Starting Database Seeding ---');

  if (!fs.existsSync(SEED_DATA_PATH)) {
    console.error(`Error: Seed data file not found at ${SEED_DATA_PATH}`);
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(SEED_DATA_PATH, 'utf-8'));
  const { staff, shifts } = seedData;

  console.log(`Loaded ${staff.length} staff profiles and ${shifts.length} shifts from JSON.`);

  // 1. Clear existing database tables in correct dependency order
  console.log('Clearing existing data from tables...');
  
  const { error: clearAuditError } = await supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearAuditError) console.warn('Warning clearing audit_log:', clearAuditError.message);

  const { error: clearRecsError } = await supabase.from('recommendations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearRecsError) console.warn('Warning clearing recommendations:', clearRecsError.message);

  const { error: clearGapError } = await supabase.from('gap_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearGapError) console.warn('Warning clearing gap_events:', clearGapError.message);

  const { error: clearShiftsError } = await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearShiftsError) console.error('Error clearing shifts:', clearShiftsError.message);

  const { error: clearStaffRatingsError } = await supabase.from('staff_ratings').delete().neq('staff_id', 'dummy');
  if (clearStaffRatingsError) console.error('Error clearing staff_ratings:', clearStaffRatingsError.message);

  const { error: clearRatingsError } = await supabase.from('ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearRatingsError) console.error('Error clearing ratings:', clearRatingsError.message);

  const { error: clearStaffError } = await supabase.from('staff').delete().neq('id', 'dummy');
  if (clearStaffError) console.error('Error clearing staff:', clearStaffError.message);

  console.log('Tables cleared.');

  // 2. Insert Ratings
  console.log('Inserting ratings...');
  const ratingDefinitions = [
    { code: 'C', group: 'CNS', description: 'Communication' },
    { code: 'N', group: 'CNS', description: 'Navigation' },
    { code: 'S', group: 'CNS', description: 'Surveillance' },
    { code: 'D', group: 'CNS', description: 'Data Processing' },
    { code: 'E1', group: 'ESS', description: 'ESS Specialty Rating 1' },
    { code: 'E2', group: 'ESS', description: 'ESS Specialty Rating 2' },
    { code: 'E3', group: 'ESS', description: 'ESS Specialty Rating 3' },
  ];

  const { data: insertedRatings, error: insertRatingsError } = await supabase
    .from('ratings')
    .insert(ratingDefinitions)
    .select();

  if (insertRatingsError || !insertedRatings) {
    console.error('Error inserting ratings:', insertRatingsError?.message);
    process.exit(1);
  }
  console.log(`Inserted ${insertedRatings.length} ratings.`);

  // Create a mapping of (code + group) -> ID for junction table insertion
  const ratingMap = new Map<string, string>();
  for (const r of insertedRatings) {
    ratingMap.set(`${r.code}-${r.group}`, r.id);
  }

  // 3. Insert Staff
  console.log('Inserting staff profiles...');
  const staffToInsert = staff.map((s: any) => ({
    id: s.staff_id,
    name: s.name,
    group: s.group,
    sub_group: s.sub_group,
    role_level: s.role_level,
    location: s.location
  }));

  const { data: insertedStaff, error: insertStaffError } = await supabase
    .from('staff')
    .insert(staffToInsert)
    .select();

  if (insertStaffError || !insertedStaff) {
    console.error('Error inserting staff:', insertStaffError?.message);
    process.exit(1);
  }
  console.log(`Inserted ${insertedStaff.length} staff members.`);

  // 4. Insert Staff Ratings Junctions
  console.log('Linking staff to ratings...');
  const junctionsToInsert: any[] = [];
  for (const s of staff) {
    for (const rCode of s.ratings) {
      const ratingId = ratingMap.get(`${rCode}-${s.group}`);
      if (ratingId) {
        junctionsToInsert.push({
          staff_id: s.staff_id,
          rating_id: ratingId
        });
      } else {
        console.warn(`Warning: Rating ID not found for rating code ${rCode} in group ${s.group}`);
      }
    }
  }

  const { error: insertJunctionsError } = await supabase
    .from('staff_ratings')
    .insert(junctionsToInsert);

  if (insertJunctionsError) {
    console.error('Error inserting staff_ratings:', insertJunctionsError.message);
    process.exit(1);
  }
  console.log(`Created ${junctionsToInsert.length} staff-ratings associations.`);

  // 5. Insert Shifts (in chunks to prevent timeouts/limits)
  console.log('Inserting shift records...');
  
  // Format shifts for Postgres insert
  const shiftsToInsert = shifts.map((sh: any) => ({
    staff_id: sh.staff_id,
    date: sh.date,
    shift_code: sh.shift_code,
    group: sh.group,
    status: sh.is_gap ? 'Gap' : 'Filled'
  }));

  const chunkSize = 100;
  let totalInsertedShifts = 0;
  const insertedShiftsList: any[] = [];

  for (let i = 0; i < shiftsToInsert.length; i += chunkSize) {
    const chunk = shiftsToInsert.slice(i, i + chunkSize);
    const { data: insertedChunk, error: insertShiftsError } = await supabase
      .from('shifts')
      .insert(chunk)
      .select();

    if (insertShiftsError || !insertedChunk) {
      console.error(`Error inserting shifts chunk ${i}-${i + chunkSize}:`, insertShiftsError?.message);
      process.exit(1);
    }
    insertedShiftsList.push(...insertedChunk);
    totalInsertedShifts += insertedChunk.length;
  }
  console.log(`Inserted ${totalInsertedShifts} shift records.`);

  // 6. Generate Gap Events
  // Go through the seeded shifts and identify the ones marked as 'Gap'
  console.log('Generating gap events from leave shifts...');
  const gapEventsToInsert: any[] = [];

  // Re-read json list to find the reason for each shift gap
  const jsonShiftsMap = new Map<string, string>(); // (staff_id + date) -> gap_reason
  for (const sh of shifts) {
    if (sh.is_gap && sh.gap_reason) {
      jsonShiftsMap.set(`${sh.staff_id}-${sh.date}`, sh.gap_reason);
    }
  }

  for (const sh of insertedShiftsList) {
    if (sh.status === 'Gap') {
      const reason = jsonShiftsMap.get(`${sh.staff_id}-${sh.date}`) || 'CUTI';
      gapEventsToInsert.push({
        shift_id: sh.id,
        reason: reason,
        status: 'Pending'
      });
    }
  }

  if (gapEventsToInsert.length > 0) {
    const { data: insertedGaps, error: insertGapsError } = await supabase
      .from('gap_events')
      .insert(gapEventsToInsert)
      .select();

    if (insertGapsError) {
      console.error('Error inserting gap_events:', insertGapsError.message);
      process.exit(1);
    }
    console.log(`Generated ${insertedGaps.length} gap events for scheduling.`);
  } else {
    console.log('No gaps identified in seed shifts.');
  }

  console.log('--- Database Seeding Completed Successfully ---');
}

seed().catch((err) => {
  console.error('Unhandled error during seeding:', err);
  process.exit(1);
});
