# Project Change Logs

All significant project changes, updates, and releases are logged below.

## [0.0.0] - 2026-07-21 03:46:50 UTC+8
### Added
- Created `.agents/AGENTS.md` to establish workspace agent guidelines.
- Created `SUMMARY.md` to initialize project milestones and features documentation.
- Initialized `logs.md` for project versioning.
## [0.1.0] - 2026-07-21 04:26:00 UTC+8
### Added
- Created SQL schema `database/schema.sql` under custom schema `jadwal` with RLS policies and table grants.
- Integrated `@supabase/supabase-js` client SDK and configured client/admin helpers in `src/lib/supabase.ts`.
- Built and executed database seeding script `scripts/seed-database.ts` populating 27 staff, their ratings, and 837 July 2026 shifts to Supabase Cloud.
- Built modular constrained scheduling engine `src/lib/scheduler-engine/` supporting hard rules filters and MCDA scoring model.
- Wrote and ran engine verification suite `scripts/test-engine.ts`.
## [0.2.0] - 2026-07-21 04:33:00 UTC+8
### Added
- Created recommendations Route Handler `/api/recommendations/route.ts` to expose scheduler recommendations.
- Created Server Action `assignReplacement` in `src/app/actions/scheduler.ts` to handle roster gap resolutions and audit logging.
- Created interactive `RosterGrid.tsx` client component with color-coded shifts and real-time Supabase subscriptions.
- Created `RecommendationDrawer.tsx` client component featuring score breakdown bars and override reason validation.
- Created `DashboardContainer.tsx` client component managing selection states and metrics.
- Refactored `src/app/page.tsx` to handle initial data fetch and render the main dashboard.
## [0.2.1] - 2026-07-21 04:46:00 UTC+8
### Fixed
- Grouped ESS technicians into 5 subgroups of 2 in data seed, matching the layout structure in the reference PDF.
- Implemented subgroup exclusion rule in `src/lib/scheduler-engine/index.ts`: when a technician goes on leave, the candidate recommendations exclude members of the same sub-group (who are already working their scheduled rotation).
- Updated `RosterGrid.tsx` rendering to group and render both CNS and ESS technicians by their respective subgroups.
## [0.2.2] - 2026-07-21 04:50:00 UTC+8
### Fixed
- Excluded the `Manager Teknik` role from the scheduling replacement engine:
  - If a shift gap is created for the manager, the engine returns an empty recommendations list immediately (managers are on fixed office hours and do not require duty rotation coverage).
  - The manager is excluded from being recommended as a replacement candidate for any technician shift gaps.
## [0.3.0] - 2026-07-21 04:56:00 UTC+8
### Added
- Implemented **Direct Shift Editing & Swapping**:
  - Made all cells in the monthly Roster Grid clickable (not just gaps).
  - Created `ShiftEditDrawer.tsx` to handle direct modifications of shift codes (P, S, M, PS, OH, D, L, Y).
  - Added Server Actions `updateShiftCode` and `swapShifts` in `src/app/actions/scheduler.ts` to execute mutations and log audit trails.
- Implemented **Cascading Recommendations**:
  - Exposed `/api/recommendations/shift` Route Handler and refactored core engine `getShiftReplacementRecommendations(shiftId)` in `src/lib/scheduler-engine/index.ts`.
  - When changing a technician's shift creates a conflict with an existing assigned technician, the system automatically detects the conflict, offers a direct swap option, or displays real-time replacement recommendations to fill the newly displaced technician's shift.
## [0.3.1] - 2026-07-21 04:59:00 UTC+8
### Fixed
- Implemented **Post-Night Fatigue Rest Constraints** in scheduling engine filters (`src/lib/scheduler-engine/filters.ts`):
  - Added hard rule: If a candidate works a Night shift (`M`) on Day D-1, they cannot cover any active shift on Day D (ensures Day D is recovery `Y` or leave).
  - Added hard rule: If a candidate is proposed to cover a Night shift (`M`) on Day D, their scheduled shift on Day D+1 must be an Off day (`Y`, `L`, or leave).
  - Maintained MCDA scoring behavior: The scorer naturally prioritizes candidates with 2 days off (`Y` then `L`) over 1 day off (`Y`) because their cumulative rest hour buffer is larger.
## [0.5.0] - 2026-07-23 08:13:00 UTC+8
### Added
- Implemented **Guaranteed 3-Tier Recommendation Cascade** (`src/lib/scheduler-engine/index.ts`):
  - **Tier 1 (Strict Hard Rules)**: Evaluates candidates against all strict labor constraints (subgroup exclusion, 11h rest, post-night `Y` recovery).
  - **Tier 2 (Same Subgroup Fallback)**: If Tier 1 produces 0 candidates, relaxes subgroup exclusion to recommend off-duty members of the same subgroup who hold the required rating.
  - **Tier 3 (Emergency Rotation Fallback)**: If Tier 2 is empty, evaluates off-duty unit staff holding the matching rating, ensuring recommendations are ALWAYS generated.
- Added **Fallback Badges & Visual Notices** (`RecommendationDrawer.tsx`, `ShiftEditDrawer.tsx`):
  - Clearly tags fallback recommendations with notice badges (e.g., `⚠️ Same Subgroup Member` or `⚠️ Emergency Rotation Fallback`).
- Refined **Post-Night Sequence Rules**:
  - `M ➔ Y` remains a strict non-negotiable recovery rule (yesterday `M` ➔ today cannot work duty shift).
  - `Y ➔ L` pattern preference is integrated into MCDA fatigue scoring; technicians completing `Y` yesterday remain eligible to cover duty shifts today when staffing is tight.

## [0.6.0] - 2026-07-23 08:31:00 UTC+8
### Added
- Implemented **Monthly Schedule Auto-Generator** (`src/app/actions/generator.ts` & `src/components/MonthSelector.tsx`):
  - Month navigation bar supporting month selection across 2026/2027.
  - Server Action `generateMonthlyRoster` that projects 5-subgroup rotating patterns (`P ➔ S ➔ M ➔ Y ➔ L` for CNS/ESS, fixed `D`/`OH` for Manager Teknik) for any selected month length (30/31 days) and saves to database.
- Implemented **100% Bahasa Indonesia Contextual Localization** (`src/lib/i18n.ts`):
  - Centralized translation dictionary translating 100% of static UI labels, headings, legends, buttons, status badges, drawer headers, and override inputs into professional Bahasa Indonesia tailored for AirNav Indonesia Cabang Manado ATS Engineering.
- Implemented **Mobile UI Layout Optimization**:
  - Made the monthly Roster Grid horizontally scrollable with a sticky technician name column (`sticky left-0 bg-slate-950`).
  - Added touch-friendly cell targets (`w-8 h-8 sm:w-9 sm:h-9`).
  - Expanded side-over drawers to full width (`w-full sm:w-[480px]`) on mobile screens to prevent overflow.
  - Stacked summary metric cards into a single column layout on mobile view.




