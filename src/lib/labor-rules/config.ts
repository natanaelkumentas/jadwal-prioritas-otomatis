import { StaffGroup } from '../shift-codes';

export interface LaborRulesConfig {
  minShiftHours: number;        // Default: 8
  maxShiftHours: number;        // Default: 12
  monthlyHourLimit: number;     // Soft limit: 160h
  minRestHours: number;         // Default: 11
  minPostNightRestHours: number;// Default: 30
  essExemptCodes: string[];     // ['P', 'S'] are exempt from minShiftHours (6h)
  nightShiftCodes: string[];    // ['M']
}

export const LABOR_RULES: LaborRulesConfig = {
  minShiftHours: 8,
  maxShiftHours: 12,
  monthlyHourLimit: 160,
  minRestHours: 11,
  minPostNightRestHours: 30,
  essExemptCodes: ['P', 'S'],
  nightShiftCodes: ['M']
};

/**
 * Checks whether a shift's duration obeys the min (8h) and max (12h) rules.
 * ESS P and S (6h) are explicitly exempted.
 */
export function isShiftDurationValid(
  shiftCode: string,
  group: StaffGroup,
  hours: number
): { valid: boolean; reason?: string } {
  const code = shiftCode.toUpperCase();
  if (code === 'L' || code === 'Y' || hours <= 0) {
    return { valid: true };
  }

  // Check exemption for ESS P and S
  if (group === 'ESS' && LABOR_RULES.essExemptCodes.includes(code)) {
    return { valid: true };
  }

  if (hours < LABOR_RULES.minShiftHours) {
    return {
      valid: false,
      reason: `Durasi shift (${hours} jam) kurang dari batas minimal ${LABOR_RULES.minShiftHours} jam`
    };
  }

  if (hours > LABOR_RULES.maxShiftHours) {
    return {
      valid: false,
      reason: `Durasi shift (${hours} jam) melebihi batas maksimal ${LABOR_RULES.maxShiftHours} jam`
    };
  }

  return { valid: true };
}
