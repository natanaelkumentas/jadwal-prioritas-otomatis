export interface Staff {
  id: string;
  name: string;
  group: 'CNS' | 'ESS';
  sub_group: string;
  role_level: string;
  location: string;
  ratings?: string[]; // Ratings code list, e.g. ['C', 'N']
}

export interface Rating {
  id: string;
  code: string;
  group: 'CNS' | 'ESS';
  description: string;
}

export interface Shift {
  id: string;
  staff_id: string | null;
  date: string; // YYYY-MM-DD
  shift_code: string; // P, S, M, L, Y, OH, D, PS
  group: 'CNS' | 'ESS';
  status: 'Filled' | 'Gap' | 'Pending Approval';
}

export interface GapEvent {
  id: string;
  shift_id: string;
  reason: 'CUTI' | 'DINAS LUAR' | 'DIKLAT' | 'SAKIT' | 'UR';
  status: 'Pending' | 'Resolved';
  detected_at: string;
  shift?: Shift; // Loaded shift details
  staff?: Staff; // Loaded original staff details who is absent
}

export interface ScoreBreakdown {
  ratingCoverage: number;       // Weighted rating score (0 to 1)
  workloadBalance: number;      // Weighted workload score (0 to 1)
  fatigueMargin: number;        // Weighted rest margin score (0 to 1)
  recencyOfSameShift: number;   // Weighted repetition prevention score (0 to 1)
  groupContinuity: number;      // Weighted same-group continuity score (0 to 1)
  rawScores: {
    ratingCoverage: number;
    workloadBalance: number;
    fatigueMargin: number;
    recencyOfSameShift: number;
    groupContinuity: number;
  };
}

export interface CandidateRecommendation {
  staff_id: string;
  name: string;
  score: number; // Final MCDA score
  rank: number;
  breakdown: ScoreBreakdown;
  is_fallback?: boolean;
  fallback_reason?: string;
}
