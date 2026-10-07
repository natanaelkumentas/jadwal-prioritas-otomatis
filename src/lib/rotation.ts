/**
 * Centralized Shift Rotation Patterns
 * Single source of truth for shift cyclic schedules across CNS and ESS sub-groups.
 */

import { StaffGroup } from './shift-codes';
import { getDaysDiff } from './scheduler-engine/filters';

export const CNS_ROTATION_PATTERNS: Record<string, string[]> = {
  'Grup 1': ['L', 'P', 'S', 'M', 'Y'],
  'Grup 2': ['P', 'S', 'M', 'Y', 'L'],
  'Grup 3': ['S', 'M', 'Y', 'L', 'P'],
  'Grup 4': ['M', 'Y', 'L', 'P', 'S'],
  'Grup 5': ['Y', 'L', 'P', 'S', 'M']
};

export const ESS_ROTATION_PATTERNS: Record<string, string[]> = {
  'ESS Grup 1': ['M', 'Y', 'L', 'PS', 'P'],
  'ESS Grup 2': ['P', 'M', 'Y', 'L', 'PS'],
  'ESS Grup 3': ['PS', 'P', 'M', 'Y', 'L'],
  'ESS Grup 4': ['L', 'PS', 'P', 'M', 'Y'],
  'ESS Grup 5': ['Y', 'L', 'PS', 'P', 'M']
};

export const ROTATION_ANCHOR_DATE = '2025-01-01';

/**
 * Returns the planned rotation shift code for a staff member on a specific date.
 */
export function getRotationShiftCode(
  subGroup: string | null | undefined,
  group: StaffGroup,
  dateStr: string
): string {
  const daysFromAnchor = Math.abs(getDaysDiff(ROTATION_ANCHOR_DATE, dateStr));

  if (group === 'ESS') {
    const pattern = (subGroup && ESS_ROTATION_PATTERNS[subGroup]) || ['M', 'Y', 'L', 'PS', 'P'];
    return pattern[daysFromAnchor % pattern.length];
  } else {
    const pattern = (subGroup && CNS_ROTATION_PATTERNS[subGroup]) || ['P', 'S', 'M', 'Y', 'L'];
    return pattern[daysFromAnchor % pattern.length];
  }
}
