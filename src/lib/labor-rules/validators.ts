import { Shift } from '../scheduler-engine/types';
import { StaffGroup, getShiftHoursWindow } from '../shift-codes';
import { LABOR_RULES } from './config';
import { getDaysDiff } from '../scheduler-engine/filters';

export interface ShiftInterval {
  date: string;
  code: string;
  startHour: number; // relative to date 00:00
  endHour: number;   // relative to date 00:00 (> 24 means ends next day)
}

/**
 * Checks whether scheduling targetShiftCode for candidate on targetDate
 * maintains at least minRestHours (11h) from candidate's other shifts.
 */
export function validateRestPeriod(
  candidateId: string,
  targetDate: string,
  targetShiftCode: string,
  group: StaffGroup,
  allCandidateShifts: Shift[],
  minRestHours: number = LABOR_RULES.minRestHours
): { valid: boolean; actualRestHours?: number; conflictDate?: string } {
  const targetWindow = getShiftHoursWindow(targetShiftCode, group);
  if (!targetWindow) {
    return { valid: true }; // L / Y or leave has no working hours
  }

  for (const s of allCandidateShifts) {
    if (s.date === targetDate) continue; // Skip same day if replacing
    const sWindow = getShiftHoursWindow(s.shift_code, group);
    if (!sWindow) continue;

    const daysDiff = getDaysDiff(s.date, targetDate);

    // s is the day before targetDate (s is prior)
    if (daysDiff === 1) {
      const rest = (24.0 + targetWindow.start) - sWindow.end;
      if (rest < minRestHours) {
        return { valid: false, actualRestHours: rest, conflictDate: s.date };
      }
    } else if (daysDiff === -1) {
      // s is the day after targetDate (target is prior)
      const rest = (24.0 + sWindow.start) - targetWindow.end;
      if (rest < minRestHours) {
        return { valid: false, actualRestHours: rest, conflictDate: s.date };
      }
    }
  }

  return { valid: true };
}

/**
 * Checks Parameter 4: Strict 30 hours rest after any night shift ('M').
 * 1. If candidate worked 'M' previously, verify at least 30 hours rest before target shift starts.
 * 2. If target shift is 'M', verify at least 30 hours rest before any subsequent shift begins.
 */
export function validatePostNightRest(
  candidateId: string,
  targetDate: string,
  targetShiftCode: string,
  group: StaffGroup,
  allCandidateShifts: Shift[],
  minPostNightHours: number = LABOR_RULES.minPostNightRestHours
): { valid: boolean; actualRestHours?: number; reason?: string } {
  const targetCode = targetShiftCode.toUpperCase();
  const targetWindow = getShiftHoursWindow(targetCode, group);
  const isTargetWorking = targetWindow !== null;

  // 1. Check if candidate worked 'M' on previous days
  if (isTargetWorking) {
    for (const s of allCandidateShifts) {
      if (s.date === targetDate) continue;
      const sCode = (s.shift_code || '').toUpperCase();
      if (sCode !== 'M') continue;

      const sWindow = getShiftHoursWindow('M', group);
      if (!sWindow) continue;

      const daysDiff = getDaysDiff(s.date, targetDate);

      // 'M' occurred in past days
      if (daysDiff > 0 && daysDiff <= 3) {
        // Night shift ends at sWindow.end (31.0 = 07:00 next day)
        // Elapsed hours from M end to target start:
        // (daysDiff * 24 + targetWindow.start) - sWindow.end
        const restHours = (daysDiff * 24.0 + targetWindow.start) - sWindow.end;
        if (restHours < minPostNightHours) {
          return {
            valid: false,
            actualRestHours: restHours,
            reason: `Istirahat pasca shift malam hanya ${restHours} jam (kurang dari syarat ${minPostNightHours} jam)`
          };
        }
      }
    }
  }

  // 2. If target shift itself is 'M', check future shifts
  if (targetCode === 'M') {
    const mWindow = getShiftHoursWindow('M', group);
    if (!mWindow) return { valid: true };

    for (const s of allCandidateShifts) {
      if (s.date === targetDate) continue;
      const sWindow = getShiftHoursWindow(s.shift_code, group);
      if (!sWindow) continue; // Future shift is L/Y, safe

      const daysDiff = getDaysDiff(targetDate, s.date); // Positive if s is in the future

      if (daysDiff > 0 && daysDiff <= 3) {
        const restHours = (daysDiff * 24.0 + sWindow.start) - mWindow.end;
        if (restHours < minPostNightHours) {
          return {
            valid: false,
            actualRestHours: restHours,
            reason: `Dinas berikutnya pada ${s.date} berjarak ${restHours} jam setelah shift malam selesai (kurang dari ${minPostNightHours} jam)`
          };
        }
      }
    }
  }

  return { valid: true };
}
