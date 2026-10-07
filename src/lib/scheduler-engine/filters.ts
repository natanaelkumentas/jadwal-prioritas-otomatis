import { Staff, Shift, GapEvent } from './types';

// Helper to convert date string to Date object
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// Get day difference (dateB - dateA) in exact calendar days
export function getDaysDiff(dateAStr: string, dateBStr: string): number {
  const [y1, m1, d1] = dateAStr.split('-').map(Number);
  const [y2, m2, d2] = dateBStr.split('-').map(Number);
  const utcA = Date.UTC(y1, m1 - 1, d1);
  const utcB = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}

import { getShiftHoursWindow, ShiftHoursWindow } from '../shift-codes';

export type ShiftHours = ShiftHoursWindow;

// Retrieve shift start/end hours relative to start of the day from centralized shift-codes
export function getShiftHours(shiftCode: string, group: 'CNS' | 'ESS'): ShiftHours | null {
  return getShiftHoursWindow(shiftCode, group);
}

/**
 * FR-3: Holds at least one of the required ratings.
 */
export function checkRatingEligibility(candidate: Staff, requiredRatingCodes: string[]): boolean {
  if (candidate.group === 'ESS' || candidate.sub_group?.startsWith('ESS')) {
    return true; // ESS group technicians do not use ATSEP ratings
  }
  if (!requiredRatingCodes || requiredRatingCodes.length === 0) {
    return true; // No ratings required
  }
  const candidateRatings = candidate.ratings || [];
  return requiredRatingCodes.some(r => candidateRatings.includes(r));
}

/**
 * FR-4 & FR-7: Is currently available (not assigned to other shifts on the date, and not on leave/absence).
 */
export function checkAvailability(
  candidateId: string,
  date: string,
  allShifts: Shift[],
  allGapEvents: GapEvent[]
): boolean {
  // Check if candidate is assigned to any active working shift on this date
  const candidateShift = allShifts.find(s => s.staff_id === candidateId && s.date === date);
  if (candidateShift) {
    const code = candidateShift.shift_code.toUpperCase();
    // Candidate is only available if current shift is Libur/Off (L)
    if (code !== 'L' && code !== 'Y') {
      return false;
    }
  }

  // Check if candidate is on active leave / training gap event on this date
  // A gap event on a shift assigned to this candidate means they are absent
  const hasAbsence = allGapEvents.some(gap => {
    const shift = allShifts.find(s => s.id === gap.shift_id);
    return shift && shift.staff_id === candidateId && shift.date === date && gap.status === 'Pending';
  });

  return !hasAbsence;
}

/**
 * FR-5: Rest period must be >= 11 hours (configurable).
 */
export function checkRestPeriod(
  candidateId: string,
  date: string,
  targetShiftCode: string,
  group: 'CNS' | 'ESS',
  allShifts: Shift[],
  minRestHours: number = 11.0
): boolean {
  const targetHours = getShiftHours(targetShiftCode, group);
  if (!targetHours) return true; // No work hours, rest period is naturally satisfied

  // Get all shifts for this candidate
  const candidateShifts = allShifts.filter(s => s.staff_id === candidateId);

  for (const s of candidateShifts) {
    const sHours = getShiftHours(s.shift_code, s.group);
    if (!sHours) continue;

    const daysDiff = getDaysDiff(s.date, date);

    if (daysDiff === 1) {
      // s is the day before the target shift (s is previous, target is next)
      // Rest period = (24 + targetStart) - previousEnd
      const rest = (24.0 + targetHours.start) - sHours.end;
      if (rest < minRestHours) {
        return false;
      }
    } else if (daysDiff === -1) {
      // s is the day after the target shift (target is previous, s is next)
      // Rest period = (24 + sStart) - targetEnd
      const rest = (24.0 + sHours.start) - targetHours.end;
      if (rest < minRestHours) {
        return false;
      }
    } else if (daysDiff === 0) {
      // Same day constraint
      // E.g., multiple shifts scheduled on the same day must satisfy the buffer
      const rest = targetHours.start - sHours.end;
      const reverseRest = sHours.start - targetHours.end;
      // If they overlap or violate rest buffer
      if ((rest >= 0 && rest < minRestHours) || (reverseRest >= 0 && reverseRest < minRestHours) || (rest < 0 && reverseRest < 0)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * FR-6: Max consecutive night shifts (M) or consecutive PS shifts <= 2.
 */
export function checkConsecutiveShifts(
  candidateId: string,
  date: string,
  targetShiftCode: string,
  allShifts: Shift[],
  maxConsecutive: number = 2
): boolean {
  const codeToCheck = targetShiftCode.toUpperCase();
  if (codeToCheck !== 'M' && codeToCheck !== 'PS') {
    return true; // Consecutive constraint only applies to M and PS shifts
  }

  // Get candidate shifts, replacing the shift on target date with codeToCheck
  const candidateShifts = allShifts.filter(s => s.staff_id === candidateId);
  
  // Map shifts to date -> code
  const scheduleMap = new Map<string, string>();
  for (const s of candidateShifts) {
    scheduleMap.set(s.date, s.shift_code.toUpperCase());
  }
  // Set target shift code
  scheduleMap.set(date, codeToCheck);

  // Extract date keys, sort them, and compute consecutive counts
  const sortedDates = Array.from(scheduleMap.keys()).sort();
  
  let consecutiveCount = 0;
  let lastMatchingDate: string | null = null;

  for (const d of sortedDates) {
    const code = scheduleMap.get(d);
    if (code === codeToCheck) {
      if (lastMatchingDate !== null && getDaysDiff(lastMatchingDate, d) === 1) {
        consecutiveCount++;
      } else {
        consecutiveCount = 1;
      }
      lastMatchingDate = d;

      if (consecutiveCount > maxConsecutive) {
        const dateIndex = sortedDates.indexOf(date);
        const targetSeqStart = sortedDates.indexOf(d) - consecutiveCount + 1;
        const targetSeqEnd = sortedDates.indexOf(d);
        if (dateIndex >= targetSeqStart && dateIndex <= targetSeqEnd) {
          return false;
        }
      }
    } else {
      consecutiveCount = 0;
      lastMatchingDate = null;
    }
  }

  return true;
}

/**
 * Get a relative date string (YYYY-MM-DD) shifted by a number of days.
 */
export function getRelativeDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d + days);
  const year = targetDate.getFullYear();
  const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
  const day = targetDate.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import { validatePostNightRest } from '../labor-rules/validators';

/**
 * Parameter 4: Strict 30 hours rest after any night shift ('M').
 * Uses centralized validatePostNightRest validator.
 */
export function checkPostNightConstraint(
  candidateId: string,
  date: string,
  targetShiftCode: string,
  allShifts: Shift[],
  group: 'CNS' | 'ESS' = 'CNS'
): boolean {
  const candidateShifts = allShifts.filter(s => s.staff_id === candidateId);
  const result = validatePostNightRest(candidateId, date, targetShiftCode, group, candidateShifts);
  return result.valid;
}
