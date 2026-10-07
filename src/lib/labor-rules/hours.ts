import { Shift, Staff } from '../scheduler-engine/types';
import { StaffGroup, getShiftHours } from '../shift-codes';
import { LABOR_RULES } from './config';

export interface MonthlyHoursResult {
  totalHours: number;
  monthlyLimit: number;
  remainingHours: number; // > 0 if within limit
  excessHours: number;    // > 0 if exceeded limit
  isExceeded: boolean;
  workDaysCount: number;
  nightShiftCount: number;
}

/**
 * Calculates monthly occupied hours for a specific staff member.
 * Only shifts belonging to the specified year and month are counted.
 * Off (L, Y) and leave codes count as 0 hours.
 * Night shift M (12h) is counted on the day it starts.
 */
export function calculateStaffMonthlyHours(
  staffShifts: Shift[],
  group: StaffGroup,
  year?: number,
  month?: number
): MonthlyHoursResult {
  let totalHours = 0;
  let workDaysCount = 0;
  let nightShiftCount = 0;

  for (const s of staffShifts) {
    if (year !== undefined && month !== undefined) {
      const [sYear, sMonth] = s.date.split('-').map(Number);
      if (sYear !== year || sMonth !== month) {
        continue;
      }
    }

    const code = (s.shift_code || '').toUpperCase();
    const duration = getShiftHours(code, group);

    if (duration > 0) {
      totalHours += duration;
      workDaysCount++;
      if (code === 'M') {
        nightShiftCount++;
      }
    }
  }

  const monthlyLimit = LABOR_RULES.monthlyHourLimit;
  const isExceeded = totalHours > monthlyLimit;
  const remainingHours = isExceeded ? 0 : monthlyLimit - totalHours;
  const excessHours = isExceeded ? totalHours - monthlyLimit : 0;

  return {
    totalHours,
    monthlyLimit,
    remainingHours,
    excessHours,
    isExceeded,
    workDaysCount,
    nightShiftCount
  };
}
