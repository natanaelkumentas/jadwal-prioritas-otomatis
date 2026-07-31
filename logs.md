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
