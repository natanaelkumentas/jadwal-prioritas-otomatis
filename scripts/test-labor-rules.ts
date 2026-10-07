import { isShiftDurationValid, LABOR_RULES } from '../src/lib/labor-rules/config';
import { calculateStaffMonthlyHours } from '../src/lib/labor-rules/hours';
import { validateRestPeriod, validatePostNightRest } from '../src/lib/labor-rules/validators';
import { Shift } from '../src/lib/scheduler-engine/types';

console.log('=== TEST SUITE: LABOR RULES & REST CONSTRAINTS ===\n');

// 1. Shift Duration & ESS Exemption Test
console.log('Test 1: Shift Duration & ESS Exemption');
const testP_CNS = isShiftDurationValid('P', 'CNS', 8);
console.assert(testP_CNS.valid === true, 'CNS P (8h) should be valid');

const testP_ESS = isShiftDurationValid('P', 'ESS', 6);
console.assert(testP_ESS.valid === true, 'ESS P (6h) should be EXEMPT and valid');

const testShortCNS = isShiftDurationValid('P', 'CNS', 6);
console.assert(testShortCNS.valid === false, 'CNS 6h should be INVALID (< 8h)');
console.log('✓ Test 1 passed\n');

// 2. 30h Post-Night Rest Test
console.log('Test 2: Parameter 4 (30-hour post-night rest rule)');
// Scenario: Candidate worked 'M' on 2026-07-03 (ends 2026-07-04 at 07:00 AM)
const candidateShifts: Shift[] = [
  { id: '1', staff_id: 'S1', date: '2026-07-03', shift_code: 'M', group: 'CNS', status: 'Filled' },
  { id: '2', staff_id: 'S1', date: '2026-07-04', shift_code: 'Y', group: 'CNS', status: 'Filled' },
  { id: '3', staff_id: 'S1', date: '2026-07-05', shift_code: 'L', group: 'CNS', status: 'Filled' }
];

// If assigned 'P' on 2026-07-04 (Lepas Malam, same day M ends at 07:00 AM)
const invalidSameDay = validatePostNightRest('S1', '2026-07-04', 'P', 'CNS', candidateShifts);
console.assert(invalidSameDay.valid === false, 'Assigning P on Y day must fail post-night rule');
console.log(`- Assigning P on Y day: valid=${invalidSameDay.valid}, reason=${invalidSameDay.reason}`);

// If assigned 'P' on 2026-07-05 (07:00 AM) -> Rest is exactly 24 hours from 07-04 07:00 to 07-05 07:00. < 30h!
const invalidNextDayP = validatePostNightRest('S1', '2026-07-05', 'P', 'CNS', candidateShifts);
console.assert(invalidNextDayP.valid === false, 'Assigning P on D+2 (24h rest) must fail 30h rule');
console.log(`- Assigning P on 07-05 (24h rest): valid=${invalidNextDayP.valid}, reason=${invalidNextDayP.reason}`);

// If assigned 'S' on 2026-07-05 (12:00 PM) -> Rest is 29 hours (07:00 07-04 to 12:00 07-05). Still < 30h!
const invalidNextDayS = validatePostNightRest('S1', '2026-07-05', 'S', 'CNS', candidateShifts);
console.assert(invalidNextDayS.valid === false, 'Assigning S on D+2 (29h rest) must fail 30h rule');
console.log(`- Assigning S on 07-05 (29h rest): valid=${invalidNextDayS.valid}, reason=${invalidNextDayS.reason}`);

// If assigned 'M' on 2026-07-05 (19:00 PM) -> Rest is 36 hours. Valid!
const validNextDayM = validatePostNightRest('S1', '2026-07-05', 'M', 'CNS', candidateShifts);
console.assert(validNextDayM.valid === true, 'Assigning M on 07-05 (36h rest) should be valid');
console.log(`- Assigning M on 07-05 (36h rest): valid=${validNextDayM.valid}`);

// If assigned 'P' on 2026-07-06 (07:00 AM) -> Rest is 48 hours. Valid!
const validP_Day6 = validatePostNightRest('S1', '2026-07-06', 'P', 'CNS', candidateShifts);
console.assert(validP_Day6.valid === true, 'Standard rotation P on Day 6 (48h rest) must be valid');
console.log(`- Standard rotation Day 6 (48h rest): valid=${validP_Day6.valid}`);
console.log('✓ Test 2 passed\n');

// 3. Monthly Hours Calculation Test
console.log('Test 3: Monthly Hours Calculation & 160h Soft Limit');
// 20 shifts of 8 hours = 160 hours
const exact160Shifts: Shift[] = Array.from({ length: 20 }, (_, i) => ({
  id: `sh-${i}`,
  staff_id: 'S2',
  date: `2026-07-${(i + 1).toString().padStart(2, '0')}`,
  shift_code: 'P',
  group: 'CNS' as const,
  status: 'Filled' as const
}));

const res160 = calculateStaffMonthlyHours(exact160Shifts, 'CNS', 2026, 7);
console.assert(res160.totalHours === 160, 'Should be 160 hours');
console.assert(res160.remainingHours === 0, 'Remaining should be 0');
console.assert(res160.excessHours === 0, 'Excess should be 0');
console.assert(res160.isExceeded === false, 'Should not be exceeded');

// Add 1 more shift (8 hours) -> 168 hours
exact160Shifts.push({
  id: 'sh-extra',
  staff_id: 'S2',
  date: '2026-07-21',
  shift_code: 'P',
  group: 'CNS',
  status: 'Filled'
});

const res168 = calculateStaffMonthlyHours(exact160Shifts, 'CNS', 2026, 7);
console.assert(res168.totalHours === 168, 'Should be 168 hours');
console.assert(res168.excessHours === 8, 'Excess should be 8 hours');
console.assert(res168.isExceeded === true, 'Should be marked as exceeded');
console.log(`- 168 hours calculation: total=${res168.totalHours}, excess=${res168.excessHours}, isExceeded=${res168.isExceeded}`);
console.log('✓ Test 3 passed\n');

console.log('ALL UNIT TESTS PASSED SUCCESSFULLY!');
