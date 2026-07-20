import { getReplacementRecommendations } from '../src/lib/scheduler-engine';
import { supabaseAdmin } from '../src/lib/supabase';

async function test() {
  console.log('--- Testing SAPS Scheduling Engine ---');

  if (!supabaseAdmin) {
    console.error('Error: Supabase Admin client not initialized. Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env');
    process.exit(1);
  }

  // 1. Fetch a pending gap event from the database to test
  console.log('Fetching a pending gap event from database...');
  const { data: gapEvent, error: gapErr } = await supabaseAdmin
    .from('gap_events')
    .select('*, shifts(date, shift_code, staff:staff(name))')
    .eq('status', 'Pending')
    .limit(1)
    .maybeSingle();

  if (gapErr) {
    console.error('Error fetching gap event:', gapErr.message);
    process.exit(1);
  }

  if (!gapEvent) {
    console.log('No pending gap events found in the database. Ensure the database is seeded first.');
    console.log('Run database seeding: npx tsx --env-file=.env scripts/seed-database.ts');
    return;
  }

  const shiftInfo = gapEvent.shifts as any;
  console.log(`\nFound Gap Event ID: ${gapEvent.id}`);
  console.log(`Absent Technician: ${shiftInfo.staff?.name}`);
  console.log(`Shift Date: ${shiftInfo.date}`);
  console.log(`Shift Code: ${shiftInfo.shift_code}`);
  console.log(`Reason for absence: ${gapEvent.reason}`);

  // 2. Run recommendations engine
  try {
    console.log('\nRunning recommendation engine...');
    const recommendations = await getReplacementRecommendations(gapEvent.id);

    console.log(`\n--- Recommendations (Total: ${recommendations.length}) ---`);
    for (const rec of recommendations.slice(0, 5)) {
      console.log(`\nRank #${rec.rank}: ${rec.name} (Score: ${rec.score})`);
      console.log('Breakdown:');
      console.log(`  - Rating Coverage:     ${rec.breakdown.ratingCoverage}`);
      console.log(`  - Workload Balance:    ${rec.breakdown.workloadBalance}`);
      console.log(`  - Fatigue Margin:      ${rec.breakdown.fatigueMargin}`);
      console.log(`  - Recency of Shift:    ${rec.breakdown.recencyOfSameShift}`);
      console.log(`  - Group Continuity:    ${rec.breakdown.groupContinuity}`);
    }
  } catch (err: any) {
    console.error('Engine recommendation run failed:', err.message);
  }
}

test().catch((err) => {
  console.error('Unhandled test execution error:', err);
});
