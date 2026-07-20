import { Staff, Shift, GapEvent } from './types';

// Helper to convert date string to Date object
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// Get day difference (dateB - dateA)
export function getDaysDiff(dateAStr: string, dateBStr: string): number {
  const dateA = new Date(dateAStr);
  const dateB = new Date(dateBStr);
  const diffTime = dateB.getTime() - dateA.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export interface ShiftHours {
  start: number; // Hour of day (0-24)
  end: number;   // Hour of day (0-48, > 24 means ends on next day)
}

// Retrieve shift start/end hours relative to start of the day
export function getShiftHours(shiftCode: string, group: 'CNS' | 'ESS'): ShiftHours | null {
  const code = shiftCode.toUpperCase();
  
  if (code === 'L' || code === 'Y') {
    return null; // Libur/Off has no work hours
  }

  if (group === 'CNS') {
    switch (code) {
      case 'P': return { start: 7.0, end: 15.0 };
      case 'S': return { start: 12.0, end: 20.0 };
      case 'M': return { start: 19.0, end: 31.0 }; // Ends at 07:00 next day (24 + 7)
      case 'OH':
      case 'D': return { start: 8.0, end: 17.0 };
      case 'PS': return { start: 7.0, end: 19.0 };
      default: return null;
    }
  } else {
    // ESS Group
    switch (code) {
      case 'P': return { start: 7.0, end: 13.0 };
      case 'S': return { start: 13.0, end: 19.0 };
      case 'M': return { start: 19.0, end: 31.0 }; // Ends at 07:00 next day (24 + 7)
      case 'PS': return { start: 7.0, end: 19.0 };
      default: return null;
    }
  }
}

/**
 * FR-3: Holds at least one of the required ratings.
 */
export function checkRatingEligibility(candidate: Staff, requiredRatingCodes: string[]): boolean {
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
  for (const d of sortedDates) {
    const code = scheduleMap.get(d);
    if (code === codeToCheck) {
      consecutiveCount++;
      if (consecutiveCount > maxConsecutive) {
        // Double check: does this consecutive sequence span our target date?
        // Let's trace back from the current date to verify if target date is in this sequence
        const dateIndex = sortedDates.indexOf(date);
        const targetSeqStart = sortedDates.indexOf(d) - consecutiveCount + 1;
        const targetSeqEnd = sortedDates.indexOf(d);
        if (dateIndex >= targetSeqStart && dateIndex <= targetSeqEnd) {
          return false;
        }
      }
    } else {
      consecutiveCount = 0;
    }
  }

  return true;
}

/**
 * Get a relative date string (YYYY-MM-DD) shifted by a number of days.
 */
export function getRelativeDateStr(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Post-Night fatigue constraint:
 * 1. If the candidate worked 'M' on the day before (D-1), they cannot work any active shift on Day D.
 * 2. If the target shift is 'M' on Day D, the candidate cannot be scheduled to work on Day D+1.
 */
export function checkPostNightConstraint(
  candidateId: string,
  date: string,
  targetShiftCode: string,
  allShifts: Shift[]
): boolean {
  const targetCode = targetShiftCode.toUpperCase();
  const isTargetWorkingShift = !['L', 'Y'].includes(targetCode);

  const candidateShifts = allShifts.filter(s => s.staff_id === candidateId);

  // 1. If candidate worked 'M' yesterday (D-1), they must rest today (cannot work any active shift today)
  const yesterdayStr = getRelativeDateStr(date, -1);
  const yesterdayShift = candidateShifts.find(s => s.date === yesterdayStr);
  if (yesterdayShift && yesterdayShift.shift_code.toUpperCase() === 'M' && isTargetWorkingShift) {
    return false;
  }

  // 2. If target shift is 'M' today, the candidate must rest tomorrow (D+1)
  if (targetCode === 'M') {
    const tomorrowStr = getRelativeDateStr(date, 1);
    const tomorrowShift = candidateShifts.find(s => s.date === tomorrowStr);
    if (tomorrowShift) {
      const tomorrowCode = tomorrowShift.shift_code.toUpperCase();
      // If tomorrow is a working shift, they cannot do 'M' today
      if (!['L', 'Y'].includes(tomorrowCode)) {
        return false;
      }
    }
  }

  return true;
}
