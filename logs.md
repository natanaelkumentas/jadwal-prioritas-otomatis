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

## [0.6.1] - 2026-07-23 08:44:00 UTC+8
### Fixed
- **Schedule Generation Display Bug**: Fixed critical bug where newly generated monthly schedules did not appear on the grid after successful creation.
  - Removed `revalidatePath('/')` from `src/app/actions/generator.ts` — it was causing Next.js to re-render the server component with stale initial data, overwriting client-side state for the newly generated month.
  - Fixed real-time Supabase subscription INSERT handler in `src/components/DashboardContainer.tsx` — previously only handled UPDATE events; now properly adds new shift records to state.
### Added
- **Toast Notification System** (`src/components/ToastProvider.tsx`):
  - Created React Context-based toast notification provider with `useToast()` hook (`toast.success()`, `toast.error()`, `toast.info()`).
  - Auto-dismissing animated toast components (slide-in from top-right, fade out after 4 seconds).
  - Color-coded styles: emerald for success, red for errors, blue for info.
  - Replaced all 12 `alert()` calls across `MonthSelector.tsx`, `RecommendationDrawer.tsx`, and `ShiftEditDrawer.tsx` with non-blocking toast notifications.

## [0.6.2] - 2026-07-23 08:53:00 UTC+8
### Fixed
- **Supabase Client RLS & Query Limit Bug**:
  - Implemented Server Action `getShiftsForMonth(year, month)` in `src/app/actions/scheduler.ts` using `supabaseAdmin` to query month shifts on server side.
  - Replaced client-side `supabaseClient` fetch in `DashboardContainer.tsx` with `getShiftsForMonth`, fixing the issue where Row Level Security (RLS) returned 0 shifts when switching months (causing all grid cells to show "L").
  - Filtered initial `page.tsx` shift query to July 2026 (`gte 2026-07-01` & `lte 2026-07-31`) to prevent hitting Supabase's 1000-row default REST API limit.
  - Handled `sudah tersedia` info toast in `MonthSelector.tsx` to display non-blocking notification and trigger `onRefreshData()`, immediately displaying existing shifts on the roster grid.

## [0.7.0] - 2026-07-23 08:59:00 UTC+8
### Added
- **Skeleton Loading Screen** (`src/components/RosterSkeleton.tsx`):
  - Added smooth pulsing skeleton loading component for the Roster Grid table during all database fetch states (`isLoading`).
  - Integrated into `DashboardContainer.tsx` to eliminate layout shift or blank fallback cells when switching months or auto-generating schedules.
- **Interactive Year & Month Picker Modal** (`src/components/MonthYearPickerModal.tsx`):
  - Added dedicated popup modal allowing direct target selection of Year (2025–2028) and Month (Januari–Desember).
  - Made Month & Year display in `MonthSelector.tsx` interactive with hover styles and calendar icon `📅`.

## [0.8.0] - 2026-07-23 09:05:00 UTC+8
### Added
- **Full Personnel CRUD Management Module**:
  - Created Server Action module `src/app/actions/personnel.ts` (`getStaffList`, `createPersonnel`, `updatePersonnel`, `assignManager`, `deletePersonnel`, `getAllRatings`).
  - Created Mobile-Optimized `src/components/PersonnelManagementModal.tsx` with responsive desktop table and mobile card listing (<640px).
  - Integrated full personnel creation form with NIP validation, group assignment (`CNS` / `ESS`), sub-group rotation assignment (`Grup 1-5`, `ESS Grup 1-5`), role level (`Manager Teknik`, `Senior Teknisi`, `Teknisi`), and competency license ratings checkboxes (`C`, `N`, `S`, `D`, `E1-E3`).
  - Enabled **Promote to Manager Teknik** action, updating Manager Teknik role and anchoring to top `Management` roster row.
  - Added real-time Supabase subscription listener for `staff` table updates in `DashboardContainer.tsx`.

## [0.8.1] - 2026-07-23 09:16:00 UTC+8
### Improved
- **Mobile Screen View Optimization**:
  - Refined main container side margins (`px-2.5 sm:px-6 py-4`) and header typography spacing in `page.tsx`.
  - Optimized Roster Grid sticky column width (`w-28 sm:w-56 md:w-64`) and name truncation (`max-w-[88px]`) to maximize visible shift cells on 360px–414px mobile devices.
  - Adjusted touch target sizes (`w-7 h-7 sm:w-9 sm:h-9`) and day header column spacing for responsive horizontal touch scrolling.

## [0.9.0] - 2026-07-23 10:17:00 UTC+8
### Changed
- **Vector Icons Modernization & Icon-Only Action Buttons**:
  - Installed `react-icons` package and replaced 100% of raw text emojis across all 9 UI components with clean SVG Feather icons (`react-icons/fi`).
  - Converted table/directory row actions (Edit, Promote Manager, Delete) in `PersonnelManagementModal.tsx` into minimalist **icon-only action buttons** with tooltips (`<FiEdit3 />`, `<FiShield />`, `<FiTrash2 />`).
  - Converted month navigation controls in `MonthSelector.tsx` to icon-only buttons (`<FiChevronLeft />`, `<FiChevronRight />`).
  - Streamlined primary call-to-action buttons (`<FiPlus /> Buat Jadwal`, `<FiUserPlus /> Tambah`, `<FiCalendar />`).

## [0.9.1] - 2026-07-23 10:35:00 UTC+8
### Improved
- **Mobile Drawer & Safe Area Optimization**:
  - Added `safe-area-bottom` padding to `RecommendationDrawer.tsx` and `ShiftEditDrawer.tsx` slide-over footers for notched mobile devices (iPhone home indicator bar).

## [0.9.2] - 2026-07-23 11:03:00 UTC+8
### Fixed
- **Leave Gap Replacement Assignment & MCDA Engine Bug**:
  - Fixed critical bug in `assignReplacement` in `src/app/actions/scheduler.ts` where resolving a leave gap (`CUTI`, `DINAS LUAR`, `DIKLAT`, `SAKIT`) previously overwrote the absent technician's `staff_id` and assigned the replacement technician a `CUTI` shift code.
  - Now, `assignReplacement` preserves the absent technician's leave record intact (`CUTI` status `Filled`) and updates the candidate replacement technician's shift on that target date to the required work shift code (`P`/`S`/`M`/`PS`).
  - Updated `getShiftReplacementRecommendations` in `src/lib/scheduler-engine/index.ts` to derive the underlying work shift pattern when evaluating rest periods & MCDA fatigue scoring for leave gaps.

## [0.9.3] - 2026-07-23 11:07:00 UTC+8
### Fixed
- **Filter Precision & Timezone Drift Fixes** (`src/lib/scheduler-engine/filters.ts`):
  - Fixed timezone drift in `getRelativeDateStr` by parsing local date components `[y, m, d]` directly, eliminating UTC midnight date shifts in UTC+8 timezones.
  - Fixed false-positive consecutive shift counting in `checkConsecutiveShifts` by verifying that adjacent matching shift dates satisfy `getDaysDiff === 1`.
  - Updated `getDaysDiff` to calculate exact calendar day differences using `Date.UTC(y, m - 1, d)`.

## [0.9.4] - 2026-07-23 11:13:00 UTC+8
### Fixed
- **Monthly Shift Rotation Boundary Discontinuity**:
  - Replaced intra-month `(day - 1)` day indexing in `generateMonthlyRoster` (`src/app/actions/generator.ts`) and `assignReplacement` (`src/app/actions/scheduler.ts`) with cumulative epoch day calculations relative to anchor date `2025-01-01`: `getDaysDiff('2025-01-01', dateStr) % 5`.
  - Guarantees that AirNav's official 5-day rotation pattern (`L ➔ P ➔ S ➔ M ➔ Y`) flows 100% seamlessly across 31-day month boundaries without repeating index 0.

## [0.9.5] - 2026-07-23 11:17:00 UTC+8
### Fixed
- **MCDA Scoring Engine Date Math Standardization**:
  - Replaced raw `new Date()` timestamp subtractions in `getRecencyCount` (`src/lib/scheduler-engine/scoring.ts`) with timezone-safe `getDaysDiff(s.date, date)`.
  - Prevents floating-point fractional day offsets across DST and timezone boundaries from skewing 7-day shift recency scoring.

## [0.9.6] - 2026-07-23 11:19:00 UTC+8
### Fixed
- **Personnel CRUD Roster Sync & Subgroup Reassignment**:
  - In `createPersonnel` (`src/app/actions/personnel.ts`), auto-generate populated shift records for newly created technicians across all existing roster dates, eliminating blank grid rows.
  - In `updatePersonnel` (`src/app/actions/personnel.ts`), automatically update non-leave shift records when a technician's subgroup, group, or role level is reassigned to match their new 5-day rotation pattern.

## [0.9.7] - 2026-07-23 11:22:00 UTC+8
### Fixed
- **Drawer Operation Fallback State Refresh**:
  - In `DashboardContainer.tsx`, updated `handleAssignSuccess` callback to invoke `fetchMonthShifts(currentYear, currentMonth)` upon successful drawer actions.
  - Ensures immediate non-blocking roster re-fetch even if Supabase real-time WebSocket events lag or are restricted by client network firewalls.

## [0.9.8] - 2026-07-28 07:37:00 UTC+8
### Fixed
- **Guaranteed Non-Empty Recommendations (Bug #1)**:
  - Added **Tier 4 Absolute Fallback** in `src/lib/scheduler-engine/index.ts` that removes the rating eligibility check and returns any off-duty non-Manager staff, tagged with `⚠️ Darurat Tanpa Rating`.
  - Added **Tier 5 Last Resort Fallback** that returns ANY non-absent, non-Manager staff regardless of schedule, tagged with `⚠️ Darurat Semua Terisi`.
  - The 5-tier cascade now guarantees ≥ 1 candidate is always returned as long as the group has at least 2 staff members.
- **Inconsistent Shift Pattern Formula (Bug #2)**:
  - Fixed `src/lib/scheduler-engine/index.ts` effective shift code derivation to use `Math.abs(getDaysDiff('2025-01-01', targetDate))` (anchor-based), matching the formula used by `generator.ts`, `scheduler.ts`, and `personnel.ts`.
  - Previously used `(dayOfMonth - 1) % pattern.length` which produced different results, causing the engine to recommend replacements for the wrong shift type.
- **Hardcoded Date Range in Initial Fetch (Bug #3)**:
  - Fixed `src/app/page.tsx` to dynamically calculate the current month's date range instead of hardcoded `2026-07-01` to `2026-07-31`.
  - Updated `DashboardContainer.tsx` to accept `initialYear`/`initialMonth` props for dynamic month initialization.
- **Orphaned gap_events on Personnel Deletion (Bug #4)**:
  - Fixed `deletePersonnel()` in `src/app/actions/personnel.ts` to clean up `gap_events` referencing the staff's shifts before deleting shifts, preventing foreign key constraint errors and orphaned records.
- **`.single()` Crash in Leave Assignment (Bug #5)**:
  - Fixed `assignLeaveAndReplacement()` in `src/app/actions/scheduler.ts` to use `.maybeSingle()` instead of `.single()` when looking up the replacement staff's shift. Now gracefully handles missing shift rows by inserting a new one.

### Changed
- Added `fallbackBadgeNoRating` and `fallbackBadgeAllBusy` i18n keys in `src/lib/i18n.ts`.
- Updated fallback badge rendering in `RecommendationDrawer.tsx` and `ShiftEditDrawer.tsx` to display all 4 fallback reason badges.

## [0.9.9] - 2026-07-28 07:57:00 UTC+8
### Improved
- **Mobile & Small Screen Layout Optimization**:
  - In `src/app/page.tsx`, truncated long app header title on small screens (`sm:hidden`) for clean single-line header on mobile.
  - In `src/components/MonthSelector.tsx`, hidden verbose `Pilih Bulan & Tahun:` text label on small mobile screens to keep navigation buttons compact.
  - In `src/components/MonthYearPickerModal.tsx`, converted modal to a mobile bottom sheet layout (`items-end sm:items-center`, `rounded-t-2xl sm:rounded-xl`) with safe-area padding and backdrop tap-to-close.
  - In `src/components/RecommendationDrawer.tsx` and `src/components/ShiftEditDrawer.tsx`, added fixed semi-transparent backdrop overlays (`fixed inset-0 bg-slate-955/70 backdrop-blur-xs`) for tap-to-dismiss on touch screens.
  - In `src/components/PersonnelManagementModal.tsx`, added backdrop tap-to-close overlay and `safe-area-bottom` padding to modal footer.

## [0.10.0] - 2026-07-29 07:02:00 UTC+8
### Fixed
- **Seed Data Labeling & Schedule Alignment with JULI UPDATE (1).pdf**:
  - In `scripts/parse-reference-data.py`, updated 31-day schedules for all 27 technicians to 100% accurately reflect `JULI UPDATE (1).pdf` (fixing Prayogo Wicaksono, Seacher Junedi, Wisnu Hari Bimanyu, Evan Sipayung, Prabowo Darminto, etc.).
  - Fixed shift code mapping logic so leave and duty shifts preserve their explicit codes (`CUTI`, `DINAS LUAR`, `DIKLAT`) with `is_gap: True` instead of overwriting `shift_code` to `L` or `OH`.
  - Re-generated `src/data/seed-data.json` containing 27 staff profiles, 837 July 2026 shifts, and explicit gap reasons.
  - Re-seeded Supabase Cloud database via `scripts/seed-database.ts`, successfully creating 27 staff members, 44 staff-ratings associations, 837 shift records, and 99 active gap events.

## [0.10.1] - 2026-07-29 07:07:00 UTC+8
### Improved
- **Mobile View & Small Screen Optimization**:
  - In `src/components/RosterGrid.tsx`, added compact 2-letter badge formatting for leave/duty shift codes (`CT`, `DL`, `DK`, `SK`) so cells stay neat without text overflowing on mobile screens.
  - In `src/components/RosterGrid.tsx`, added mobile rating badges under technician names in the sticky column with adjusted `w-32 sm:w-56 md:w-64` width.
  - In `src/components/ToastProvider.tsx`, made toast notification container responsive (`top-3 left-3 right-3 sm:left-auto sm:right-4`) for small phone screens.
  - In `src/components/DashboardContainer.tsx`, optimized metric card titles with responsive mobile labels (`Personel`, `Gap Shift`, `Status DB`) preventing text clipping on narrow viewports.

## [0.11.0] - 2026-07-29 07:22:00 UTC+8
### Added
- **Today's Date Column Highlighting**:
  - In `src/components/RosterGrid.tsx`, added dynamic check for today's date (`day === todayDay && currentMonth === todayMonth && currentYear === todayYear`).
  - Highlighting today's header column with glowing emerald styling (`bg-emerald-500/25 text-emerald-300 font-bold border-b-2 border-emerald-400`).
  - Added subtle column tint (`bg-emerald-500/10`) to shift cells for today's date for visual alignment.
- **Interactive "Kode Shift" Reference Modal**:
  - Created `src/components/ShiftCodeModal.tsx` component detailing all 12 shift codes (`P`, `S`, `M`, `PS`, `OH`, `D`, `L`, `Y`, `CUTI`, `DINAS LUAR`, `DIKLAT`, `SAKIT`, `GAP`), exact working hours for CNS vs ESS units, descriptions, and color badges.
  - In `src/components/RosterGrid.tsx`, replaced static header legend items with an interactive **"Kode Shift"** button opening the pop-up modal.
- **"Bulan Ini" Quick Jump Button**:
  - In `src/components/MonthSelector.tsx`, added a **"Bulan Ini"** quick navigation button when viewing non-current months, allowing users to return to today's schedule in one tap.

### Fixed
- **Personnel CRUD System Fixes**:
  - In `src/app/actions/personnel.ts`, updated `assignManager(staffId)` to automatically recalculate and update shift records for both promoted Manager Teknik (`D`/`L` pattern) and demoted managers (`Grup 1` rotation pattern).
  - In `src/components/PersonnelManagementModal.tsx`, added smart next-ID auto-suggestion based on group selection (`T-0XX` for CNS, `E-0XX` for ESS).
  - Fixed group switch handling to reset subgroups and filter rating checkboxes strictly by `group` (`r.group === formGroup`).
  - Fixed toast copy in personnel update actions (`Berhasil memperbarui data personel...`).

## [0.12.0] - 2026-07-30 09:45:00 UTC+8
### Added
- **Default Light Theme Support & Theme Switcher**:
  - Created `src/components/ThemeProvider.tsx` context provider defaulting application to a clean, crisp **Light Theme** (`bg-slate-50`, white card containers, dark slate typography, clean light borders) with `localStorage` persistence (`saps-theme`).
  - Created `src/components/ThemeToggle.tsx` featuring a Sun/Moon interactive theme switcher button placed in the top dashboard header.
  - Refactored `src/app/page.tsx`, `DashboardContainer.tsx`, `MonthSelector.tsx`, `RosterGrid.tsx`, `ShiftCodeModal.tsx`, `RecommendationDrawer.tsx`, `ShiftEditDrawer.tsx`, `PersonnelManagementModal.tsx`, and `MonthYearPickerModal.tsx` to support both **Light** and **Dark** themes seamlessly.

## [0.12.1] - 2026-07-30 09:51:00 UTC+8
### Improved
- **Mobile & Small Screen Viewport Layout Optimizations**:
  - In `src/app/page.tsx`, optimized dashboard header layout into a compact space-between row on mobile (<640px) preventing text truncation.
  - In `src/components/RosterGrid.tsx`, added staff count badges to subgroup headers (`{staffGroup.length} Personel`) and refined sticky technician column name truncation (`max-w-[92px]`).
  - Added visual mobile touch drag handles (`w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden`) and `safe-area-bottom` padding to `ShiftCodeModal.tsx`, `MonthYearPickerModal.tsx`, `RecommendationDrawer.tsx`, `ShiftEditDrawer.tsx`, and `PersonnelManagementModal.tsx`.

## [0.12.2] - 2026-07-30 10:06:00 UTC+8
### Fixed
- **Theme Mode System Bug Fixes**:
  - In `tailwind.config.ts`, added `darkMode: 'class'` configuration so all Tailwind `dark:` utility classes respond immediately when `.dark` class is toggled on `<html>`.
  - In `src/components/ThemeProvider.tsx`, synchronized `document.documentElement` class list immediately upon client initialization, eliminating Flash of Unstyled Content (FOUC) and hydration icon mismatches.
  - In `src/components/ToastProvider.tsx`, refactored toast container and badge styles (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl`) for high contrast readability in both Light and Dark mode.

## [0.12.3] - 2026-07-30 10:17:00 UTC+8
### Fixed
- **Theme Mode Color Inversions & Invisible Text Bug Fixes**:
  - In `src/components/RosterGrid.tsx`, fixed technician names in sticky column (`SUBHAN A. SYAWIE`, `RIDWAN`, `MICHAELOVERYAN MONE`, `ROBBY AKBAR`) to use solid background (`bg-white dark:bg-slate-950`) and bold high-contrast text (`text-slate-900 dark:text-white font-bold`).
  - In `src/components/MonthSelector.tsx`, fixed Month/Year center button (`Juli 2026`) text readability in Dark Mode (`bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white`).
  - In `src/components/DashboardContainer.tsx`, enhanced stat card titles (`text-slate-700 dark:text-slate-300 font-bold`) and numbers (`text-slate-900 dark:text-white font-extrabold`).
  - In `src/components/RosterGrid.tsx`, updated shift badges (`P`, `S`, `M`, `PS`, `OH`, `D`, `L`, `CT`) to render with high-contrast text and border definition in both Light and Dark themes.

## [0.12.4] - 2026-07-30 10:23:00 UTC+8
### Fixed
- **Blocking Head Script Theme Initialization & Hydration Fix**:
  - In `src/app/layout.tsx`, added `suppressHydrationWarning` to `<html>` and injected an inline blocking theme script in `<head>` to execute `localStorage` theme reading before initial paint and React hydration.
  - In `src/components/ThemeProvider.tsx`, updated state synchronization to immediately apply DOM class changes synchronously on toggle.

## [0.12.5] - 2026-07-30 10:28:00 UTC+8
### Fixed
- **Invalid Tailwind Slate Color Class Replacement**:
  - Replaced all non-existent Tailwind utility classes (`dark:bg-slate-955` and `dark:border-slate-850`) across `page.tsx`, `RosterGrid.tsx`, `ShiftCodeModal.tsx`, `ShiftEditDrawer.tsx`, `RecommendationDrawer.tsx`, `PersonnelManagementModal.tsx`, and `MonthYearPickerModal.tsx` with standard Tailwind palette tokens (`dark:bg-slate-955` -> `dark:bg-slate-950`, `dark:bg-slate-900`, `dark:border-slate-800`).
  - Dark Mode elements now compile and render with rich dark slate backgrounds instead of failing back to white.

## [0.13.0] - 2026-07-30 10:38:00 UTC+8
### Added
- **Skeleton Loading Transition Effect on Theme Change**:
  - Created `src/components/Skeleton.tsx` reusable theme-aware skeleton shimmer component (`bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg`).
  - Updated `src/components/ThemeProvider.tsx` with an `isThemeChanging` state and 350ms skeleton shimmer transition when toggling between Light Mode and Dark Mode.
  - Connected `DashboardContainer.tsx` and `MonthSelector.tsx` to render animated skeleton shimmer cards and schedule grid rows during theme transitions.

## [0.13.1] - 2026-07-30 10:47:00 UTC+8
### Improved
- **Silky-Smooth 60fps Hardware-Accelerated Theme Transition**:
  - In `src/app/globals.css`, added `@keyframes theme-fade-sweep` and `.animate-theme-morph` utility (`0.28s cubic-bezier`).
  - Updated `DashboardContainer.tsx` and `MonthSelector.tsx` to apply smooth theme morphing across stat cards, month navigation, and schedule table grid without unmounting DOM elements or causing height jumps.

## [0.13.2] - 2026-07-30 11:46:00 UTC+8
### Improved
- **Native Global CSS Property Transition across All UI Elements**:
  - In `src/app/globals.css`, added `@layer base` global CSS property transition rule (`color, background-color, border-color, fill, stroke 300ms cubic-bezier(0.4, 0, 0.2, 1)`).
  - Every card, table cell, sticky column, button, icon, and text element on the page now morphs background, border, and text colors in 300ms GPU-accelerated sync.

## [0.13.3] - 2026-07-30 11:56:00 UTC+8
### Added
- **Zero-Layout-Shift Absolute Skeleton Shimmer Overlay during Theme Changes**:
  - Created `src/components/SkeletonOverlay.tsx` reusable absolute skeleton shimmer overlay component (`absolute inset-0 bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-[2px] animate-pulse`).
  - Connected `ThemeProvider.tsx` state so clicking the theme toggle triggers a 320ms skeleton shimmer overlay directly over stat cards, month navigation, and schedule table cells.
  - Guaranteed 0px layout shifts while presenting the user with an animated skeleton loading transition.

## [0.13.4] - 2026-07-30 12:03:00 UTC+8
### Improved
- **High-Visibility Prominent Skeleton Overlay & Extended 800ms Duration**:
  - Upgraded `SkeletonOverlay.tsx` with high-contrast shimmer bars, solid backdrop (`bg-slate-100/90 dark:bg-slate-900/90`), and a spinning theme loader badge ("Memuat Tema...").
  - Extended transition duration in `ThemeProvider.tsx` from 320ms to 800ms so the animated skeleton shimmer layer is 100% clearly visible to the user every time the theme is toggled.

## [0.14.0] - 2026-07-30 12:22:00 UTC+8
### Added
- **Cancel Cuti / Leave Override Feature (Switch to Shift Edit from Gap Drawer)**:
  - In `src/components/RecommendationDrawer.tsx`, added optional `onSwitchToEdit` callback prop and a prominent amber-themed "Batalkan Cuti & Ubah Ke Shift Kerja" button section above the footer. When clicked, closes the RecommendationDrawer and opens the ShiftEditDrawer so users can reassign a regular shift code to personnel whose cuti/leave was set incorrectly.
  - In `src/components/DashboardContainer.tsx`, added `handleSwitchToEditFromGap()` handler that resolves the staff from the active gap selection and switches drawers seamlessly.
  - In `src/lib/i18n.ts`, added `btnCancelLeaveOverride` and `cancelLeaveOverrideDesc` Bahasa Indonesia translation keys.
  - The existing `updateShiftCode` server action already auto-resolves any pending gap event for the shift, so changing CUTI back to a working shift (P/S/M/etc.) automatically clears the gap.

## [0.14.1] - 2026-07-30 12:45:00 UTC+8
### Improved
- **Complete Light Theme Audit & Hardcoded Dark Class Removal**:
  - In `src/components/ShiftEditDrawer.tsx`, refactored select dropdowns, candidate cards, recommendation sections, justification text areas, action buttons, and score bars to dual Light/Dark theme styles (`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`).
  - In `src/components/PersonnelManagementModal.tsx`, fixed hardcoded dark table headers (`bg-slate-950`), white table rows, rating grid selectors, delete confirmation modal backdrops, and fixed `slate-955` class typos.
  - In `src/components/MonthSelector.tsx`, refactored schedule generation confirmation popup container and description box from dark navy to dual theme styles.
  - In `src/components/RosterSkeleton.tsx`, refactored loading skeleton grid from dark navy to theme-aware shimmer components (`bg-white dark:bg-slate-900`, `bg-slate-200 dark:bg-slate-800`), ensuring schedule loading states match Light Mode seamlessly.

## [0.14.2] - 2026-07-30 13:10:00 UTC+8
### Improved
- **Personnel Name Display in Gap Resolution (Recommendation) Drawer Header**:
  - In `src/components/RecommendationDrawer.tsx`, added `staff?: Staff | null` prop and updated subtitle to display technician's name at the start (`[NAMA] — Shift: YYYY-MM-DD (CUTI) — Alasan Absen: CUTI`), making header formatting 100% consistent with `ShiftEditDrawer.tsx`.
  - In `src/components/RosterGrid.tsx`, updated `onSelectGap` callback to pass the `staff` object when a cell with a pending gap is clicked.
  - In `src/components/DashboardContainer.tsx`, updated `handleSelectGap` and state selection to store and pass `staff` to `RecommendationDrawer`.

## [0.14.3] - 2026-07-30 13:15:00 UTC+8
### Fixed
- **Sub-Modal Stacking Context & Hidden Add/Edit Form Popup**:
  - In `src/components/PersonnelManagementModal.tsx`, replaced invalid non-existent Tailwind class `z-60` with explicit arbitrary z-index syntax (`z-[100]` for backdrop and `relative z-[101]` for form/delete card containers).
  - Add/Edit Personnel Form popup and Delete Confirmation popup now render cleanly on top of the main personnel directory list with backdrop click dismiss handling.

## [0.14.4] - 2026-07-31 14:09:00 UTC+8
### Added
- **Interactive Search Filter in Shift Code Reference Modal (`ShiftCodeModal.tsx`)**:
  - Added a search filter bar (`FiSearch`) allowing users to filter shift codes by code badge, title, or description in real-time.

## [0.14.5] - 2026-07-31 14:18:00 UTC+8
### Fixed
- **Next.js Production Build Failure (`react/no-unescaped-entities`)**:
  - In `src/components/ShiftCodeModal.tsx`, replaced unescaped double quote characters with `&quot;` in empty-search-results JSX block (`Tidak ada kode shift yang cocok dengan &quot;{searchTerm}&quot;.`).
  - Verified local production build (`npm run build`) compiles cleanly: `✓ Compiled successfully`, `✓ Generating static pages (5/5)`, 0 errors.

## [0.14.6] - 2026-08-01 17:11:00 UTC+8
### Improved
- **Header Status Badge Accessibility & Database Tooltip**:
  - In `src/app/page.tsx`, added descriptive tooltip `title="Database Real-time Supabase Cloud Terhubung"` to the mobile and desktop live pulsing status badges for enhanced UX accessibility.

## [0.15.0] - 2026-08-02 21:28:00 UTC+8
### Added
- **Unconstrained Admin/Manager Override Engine & Advisory DSS Architecture**:
  - In `src/components/RecommendationDrawer.tsx`, introduced a dual-tab navigation header (`Rekomendasi DSS - MCDA` vs `Penugasan Manual - Semua Personel`). The manual override tab allows Webmaster/Admin/Manager to search and select **ANY technician in the department** directly to resolve shift gaps without being restricted by MCDA candidate scores or rating protection filters.
  - In `src/components/ShiftEditDrawer.tsx`, added `handleResetToOff` and a prominent **"Kosongkan Shift (Reset ke Libur L)"** button for instant shift clearing.
  - In `src/lib/i18n.ts`, added `tabDssRecommendations`, `tabManualOverride`, `manualOverrideNotice`, `btnConfirmManualAssignment`, and `btnResetShiftToOff` translation strings.
  - In `src/components/DashboardContainer.tsx`, passed `allStaff={staffList}` prop to `RecommendationDrawer` to support directory-wide manual overrides.

## [0.15.1] - 2026-08-02 23:34:00 UTC+8
### Improved
- **Interactive Month & Year Combobox Picker (`MonthYearPickerModal.tsx`)**:
  - Replaced static grid buttons with interactive, typeable/searchable, and scrollable **Combobox controls** for both Year and Month selection.
  - Users can now type month names (`Agustus`, `Sept`) or numbers (`1`-`12`) and any custom year (`2020`-`2035+`), or scroll through filtered dropdown lists.

## [0.15.2] - 2026-08-03 09:33:00 UTC+8
### Changed
- **ATSEP License Ratings Restricted Exclusively to CNS Group (Removed Ratings from ESS)**:
  - In `src/components/PersonnelManagementModal.tsx`, rating multiselect checkboxes are hidden when `formGroup === 'ESS'` with a note: *"Personel kelompok ESS tidak menggunakan rating lisensi ATSEP."*. Table and mobile views display `- (Non-ATSEP)` for ESS staff.
  - In `src/components/RosterGrid.tsx`, rating badges (`Rad`, `Nav`, `Com`, `Surv`) are rendered under personnel names only for CNS staff.
  - In `src/lib/scheduler-engine/filters.ts`, `checkRatingEligibility()` automatically returns `true` for ESS staff.
  - In `src/lib/scheduler-engine/scoring.ts`, `ratingCoverageRaw` automatically returns 1.0 (full rating score) for ESS staff.
  - In `src/lib/scheduler-engine/index.ts`, `staff_ratings` lookup is bypassed for ESS shifts (`requiredRatingCodes = []`).

## [0.15.3] - 2026-08-03 09:48:00 UTC+8
### Improved
- **Interactive Popup Confirmation Modals & Floating Toast Notification System**:
  - In `src/components/ToastProvider.tsx`, added `toast.warning()` type support (`FiAlertTriangle` icon) and raised toast stacking context to `z-[200]` so notification popups float above all sub-modals (`z-[100]`), drawers (`z-50`), and dialogs.
  - In `src/components/PersonnelManagementModal.tsx`, replaced native browser `confirm(...)` with a custom animated confirmation modal popup card (`confirmingManagerStaff`) for Manager Teknik promotion. Standardized delete confirmation modal (`deletingStaff`).
  - In `src/components/MonthSelector.tsx`, added backdrop tap-to-dismiss and `z-[100]` stacking to Schedule Generator confirmation popup modal.
  - In `src/components/ShiftEditDrawer.tsx`, added a custom confirmation popup modal (`showResetConfirmModal`) for resetting shifts to Off (`L`).
  - Converted 100% of user feedback across all actions to use animated Toast Notification popups.

## [0.16.0] - 2026-10-05 08:30:00 UTC+8
### Added
- **Monthly Occupied Hours & Limit Tracking Card (`MonthlyHoursCard.tsx`)**:
  - Implemented real-time monthly occupied hours calculation on the personnel detail page (`/personel/[id]`).
  - Evaluates cumulative duty hours against the 160-hour monthly limit (`LABOR_RULES.monthlyHourLimit = 160`).
  - Displays status badges and remaining hours (`+X jam tersisa`) or excess hours (`+X jam melebihi batas`).
  - Visual dual-color progress bar displaying percentage consumed with animated pulse indicator for overtime/excess hours.
- **Dedicated Labor Rules Module (`src/lib/labor-rules/`)**:
  - `config.ts`: Centralized labor rules configuration (Min shift: 8h, Max shift: 12h, Min rest: 11h, Min post-night rest: 30h, Monthly limit: 160h, ESS `P`/`S` 6h exemption).
  - `hours.ts`: Robust calculation engine for technician cumulative monthly duty hours.
  - `validators.ts`: Exact interval math for validating 11h shift rest gaps and strict 30h post-night rest buffers across dates.

### Changed
- **Recommendation Engine Revision (Strict Labor Rules & Two-Tier 160h Headroom Ranking)**:
  - In `src/lib/scheduler-engine/filters.ts` & `index.ts`: Parameter 3 (≥11h rest) and Parameter 4 (≥30h post-night rest) are now hard constraints strictly enforced across all recommendation tiers.
  - In `src/lib/scheduler-engine/scoring.ts`: Shift count workload scoring replaced by exact monthly hours headroom. Candidates who will stay $\le 160$h are prioritized first. If all candidates exceed 160h, the candidate with the fewest resulting hours is selected.
  - In `src/components/RecommendationDrawer.tsx`: Candidate cards now display monthly hours before and after assignment (e.g. `Jam: 148 → 156 / 160 jam`) with amber/red over-limit tags.

### Fixed & Refactored
- **Fixed Crash Bug in `assignLeaveAndReplacement`**:
  - Resolved `TypeError: Cannot read properties of null (reading 'id')` when inserting a new shift for a replacement technician without a prior shift row on that date.
- **Single Source of Truth for Shift Codes (DRY)**:
  - Unified all numeric timing windows in `src/lib/shift-codes.ts` (`getShiftHoursWindow`) and removed duplicated timing switch statements in `filters.ts`.
- **Centralized Rotation Patterns**:
  - Created `src/lib/rotation.ts` (`getRotationShiftCode`) and eliminated copy-pasted rotation arrays across `generator.ts`, `personnel.ts`, `index.ts`, and `scheduler.ts`.
- **Modularization Compliance (Rules #10 & #11)**:
  - Modularized `src/app/actions/scheduler.ts` (originally 743 lines) into `scheduler-assignment.ts`, `scheduler-shifts.ts`, and `scheduler-queries.ts` with a clean re-export facade.
  - Decomposed `src/components/PersonalScheduleView.tsx` (originally 589 lines) into `MonthlyHoursCard.tsx`, `PersonalCalendarGrid.tsx`, and `PersonalListView.tsx`, bringing all components under 300 lines.

## [0.17.0] - 2026-10-06 10:40:00 UTC+8
### Added
- **Official AirNav Circular Favicon**:
  - Configured circular AirNav Indonesia logo as web application favicon across `public/favicon.jpeg`, `public/favicon.ico`, `src/app/icon.jpeg`, and `src/app/favicon.ico`.
  - Added icon metadata in `src/app/layout.tsx`.
- **Modular Personal Print Layout (`PersonalPrintLayout.tsx`)**:
  - Extracted printable layout into dedicated sub-component (`src/components/personal/PersonalPrintLayout.tsx`) to adhere strictly to Separation of Concerns and file line limit constraints.

### Changed
- **Personal Detail Printable Layout Redesign (`/personel/[id]`)**:
  - Redesigned print layout from horizontal split into 2 stacked sections strictly fitted onto **1 single A4 portrait page** (`@page { size: A4 portrait; margin: 5mm 7mm; }`).
  - **Top Section (Informasi Personel, Metrik & Tanda Tangan)**:
    - Kop AirNav Indonesia (Kantor Cabang Manado - Unit Teknik ATS) with technician full name and period.
    - 3-column summary grid: Profile Summary, Monthly Hours Evaluation (status & counters), and Technician Duty Status (Today & Next duty).
    - Metrics row: 4 KPI cards (Hari Kerja, Total Jam, Shift Malam, Libur/Izin) and Shift Code Composition badges.
    - Formal Signatures row: Technician (left) and Supervisor with handwritten date placeholder `Manado, ......................... [Bulan] [Tahun]` (right).
  - **Bottom Section (Kalender Dinas Operasional)**:
    - Full-width operational calendar grid displaying all dates and shift badges.
    - Suppressed "today" highlight badge in print mode to keep printed rosters neutral.
    - Optimized cell height (`h-10 sm:h-11`) and readable typography.

## [0.17.1] - 2026-10-06 11:20:00 UTC+8
### Changed
- **Monthly Roster Download/Print Vertical Centering (`/cetak`)**:
  - Expanded vertical gap between the schedule table and the shift legend / signature block from `mt-2 pt-1.5` to `mt-6 sm:mt-8 pt-3 border-t-2 print:mt-8`.
  - Increased signature gap spacer from `h-10` to `h-14` (56px) for comfortable manual signing.
  - Centered printed schedule vertically on the sheet via `@page { size: landscape; margin: 4mm 6mm; }` and `.print-wrapper { min-height: 100vh; margin: auto 0; justify-content: center; }`, eliminating excess bottom whitespace.
- **Personal Detail Printable Layout Landscape Mode (`/personel/[id]`)**:
  - Converted personal print stylesheet to strict **landscape** orientation (`@page { size: landscape; margin: 4mm 6mm; }`).
  - Adjusted calendar grid cell height to `h-9 sm:h-9.5` in `PersonalCalendarGrid.tsx` to ensure all 5-6 rows and the top info section fit strictly onto **1 single landscape page**.

## [0.17.2] - 2026-10-06 13:10:00 UTC+8
### Added
- **Google Calendar Service Account Credentials Configured**:
  - Injected `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` for `calendar-bot@airnav-mdc-calendar-sync.iam.gserviceaccount.com` in `.env`.
- **Targeted Test Sync Feature (`testSyncGoogleCalendar`)**:
  - Implemented `testSyncGoogleCalendar(year, month, 'natanaelkumentas11@gmail.com')` in `src/app/actions/calendar.ts`.
  - Targets working shifts specifically for `natanaelkumentas11@gmail.com` (or sends a test sample event if no profile with that email exists yet).
- **Test Sync Button in Dashboard Toolbar (`MonthSelector.tsx`)**:
  - Added dedicated amber-themed "Test Sync" button directly beside "Sync Calendar".
  - Maintained single-row toolbar layout: `[ total | kelola personel ] [ month/year selection ] [ download/print ] [ sync calendar ] [ test sync ] [ buat jadwal ]`.
## [0.17.3] - 2026-10-06 13:16:00 UTC+8
### Fixed
- **PostgreSQL Date Out of Range Error (`22008`) in Calendar Actions**:
  - Resolved `date/time field value out of range: "2026-09-31"` in `src/app/actions/calendar.ts`.
  - Replaced hardcoded `31` suffix with dynamic calculation of the exact last date of the month (`new Date(year, month, 0).getDate()`), correctly handling 30-day months (April, June, September, November) and February.
  - Added robust sample shift fallback in `testSyncGoogleCalendar` so that newly created staff who have not had roster shifts generated for the active month yet can still test Google Calendar invite delivery.

## [0.17.4] - 2026-10-06 13:20:00 UTC+8
### Fixed
- **Google Calendar API 403 `forbiddenForServiceAccounts` Error**:
  - Removed `attendees` and `sendUpdates: 'all'` from `buildShiftEventPayload` and event mutation requests, resolving Google's security restriction: `"Service accounts cannot invite attendees without Domain-Wide Delegation of Authority"`.
  - Configured `calendarId: data.staffGmail` to write events directly into the target personnel's calendar when granted access.
  - Added clear actionable error message instructing users to share their Google Calendar with the service account bot (`calendar-bot@airnav-mdc-calendar-sync.iam.gserviceaccount.com`) if access has not been granted yet.

## [0.18.0] - 2026-10-07 08:35:00 UTC+8
### Added
- **3-Tier Role Authentication & Web Login System (`developer`, `admin`, `user`)**:
  - Added `jadwal.users` table schema in `database/schema.sql` with encrypted password hashes, RLS policies, and role definitions.
  - Created authentication engine `src/lib/auth.ts` providing secure scrypt password hashing, session tokens, and HTTP-only cookie management.
  - Built modern corporate login page `src/app/login/page.tsx` styled with AirNav Indonesia navy-blue palette, input error validation, and responsive mobile-first layout.
  - Added Next.js authentication guard in `src/middleware.ts` and `src/app/page.tsx`, protecting dashboard routes and redirecting unauthenticated users to `/login`.
  - Implemented `NavbarUserPill.tsx` top-bar component displaying user avatar, name, color-coded role badges (`developer` in purple, `admin` in blue, `user` in emerald), and logout action.
- **Root Directory `users.csv` & User Credential Generation**:
  - Created root-level `./users.csv` exporting initial credentials for Developer (`natanaelkumentas03@gmail.com` / `ti7polimdo`), Admin (`jadwal.airnav.mdc@gmail.com` / `magangairnavpolimdo2026`), and all 27 unit personnel with randomly-generated secure passwords.
  - Implemented automatic user seeding script `src/lib/seed-users.ts` with synchronization against `users.csv`.
- **Auto-Download Credentials Feature**:
  - **Admin Adding User**: Added password input with "Acak Sandi" button in `PersonnelManagementModal.tsx`. Saving a new staff member registers their user account in `jadwal.users` and automatically triggers a browser download of `kredensial-user-[email].txt`.
  - **Developer Managing Admin**: Created `DeveloperAdminModal.tsx` allowing developers to view, delete, and add new admin accounts. Creating an admin automatically downloads `kredensial-admin-[email].txt`.
- **Email-Based Personal Calendar Feed (`WebCal / iCal RFC 5545`)**:
  - Implemented `/api/calendar/[staffId]/route.ts` supporting direct email feeds (`/api/calendar/[email].ics`).
  - Feed queries shifts strictly isolated by `staff_id = staff.gmail AND status = 'Filled'` (100% zero cross-contamination).
  - Shifts rendered with UTC timestamps computed from WITA (UTC+8) and embedded 2h and 30m alarms.
  - Created interactive `CalendarSyncModal.tsx` supporting 1-click Google Calendar subscription, WebCal URL copy, and `.ics` download.
  - Added "Sync Kalender" button in `MonthSelector.tsx` toolbar and `PersonalScheduleView.tsx`.
- **Role-Based Interaction Restrictions**:
  - Regular `user` technicians can view the master roster in read-only mode (cell shift edits, generation modal, and bulk edits disabled).
  - Regular `user` technicians get a direct "Jadwal Saya" shortcut in the toolbar and a calendar sync modal locked to their own email feed.
## [0.18.1] - 2026-10-07 08:45:00 UTC+8
### Fixed
- **Next.js Client/Server Component Boundary Isolation**:
  - Extracted pure browser-safe types and helpers (`UserRole`, `UserSession`, `generateRandomPassword`) into `src/lib/auth-types.ts`.
  - Updated `src/components/DeveloperAdminModal.tsx` and `src/components/NavbarUserPill.tsx` to import types and password generators strictly from `@/lib/auth-types` instead of `@/lib/auth`.
  - Added `export const getCurrentUser = getSession;` in `src/lib/auth.ts` for clean server component consumption.
## [0.18.2] - 2026-10-07 08:56:00 UTC+8
### Changed
- **Unified Light & Dark Theme Redesign for New Pages, Forms, and Modals**:
  - **Login Page (`src/app/login/page.tsx`)**:
    - Added floating `ThemeToggle` button in the top-right corner.
    - Implemented adaptive backgrounds: clean `slate-100/70` with soft ambient blue/sky blurs for Light Mode and deep `slate-950` with subtle glows for Dark Mode.
    - Updated login card container (`bg-white/95` vs `bg-slate-900/85`), inputs, labels, alert boxes, and buttons to use responsive theme tokens.
  - **Top Navbar User Profile Pill (`src/components/NavbarUserPill.tsx`)**:
    - Redesigned pill container from dark-only `bg-slate-800` to adaptive `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800`.
    - Added high-contrast dual-theme role badge styles for `developer` (purple), `admin` (blue), and `user` (emerald).
    - Polished "Kelola Admin" and "Logout" buttons with light/dark hover and active states.
  - **Calendar Sync Modal (`src/components/CalendarSyncModal.tsx`)**:
    - Converted entire modal surface from dark-only `bg-slate-900` to adaptive `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`.
    - Unified technician selector, WebCal URL copy box, 1-click Google Calendar subscription button, and manual instruction guides for seamless light and dark mode appearance.
  - **Developer Admin Management Modal (`src/components/DeveloperAdminModal.tsx`)**:
    - Converted modal surface to dual-theme container with developer-themed purple accents (`bg-white dark:bg-slate-900`, `border-purple-200 dark:border-purple-500/30`).
    - Styled "Tambah Administrator Baru" form, auto-password generator, and admin account rows with high-contrast dual-theme styles.
  - **Personnel Management Password Section (`src/components/PersonnelManagementModal.tsx`)**:
  
## [0.18.3] - 2026-10-07 09:18:00 UTC+8
### Fixed
- **Production Vercel Build Compilation Errors**:
  - Added missing `getDaysDiff` import from `@/lib/scheduler-engine/filters` into `src/app/actions/personnel.ts` (resolving TypeScript compilation error `Cannot find name 'getDaysDiff'`).
  - Added `serverComponentsExternalPackages: ['pg']` to `next.config.mjs` to ensure the `pg` driver is treated as an external package by Next.js bundler on Vercel.
  - Resolved React hook dependency warnings in `src/components/CalendarSyncModal.tsx` and `src/components/BulkEditBar.tsx`.
