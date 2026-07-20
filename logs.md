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
