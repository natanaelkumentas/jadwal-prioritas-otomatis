# Smart Automatic Priority Scheduler (SAPS)

A Web-based Constrained Resource-Allocation and Decision Support System for Perum LPPNPI - Cabang Manado, ATS Engineering Unit.

## Features & Roadmap
- [x] **Phase 1 (MVP)**: Core Supabase database, rule-based filtering, and MCDA scoring engine for candidate replacements.
- [x] **Phase 2**: Interactive Roster Grid, Gap Management UI, Theme Engine (Light/Dark Mode), Skeleton Loaders, and Personnel CRUD Drawer.
- [ ] **Phase 3**: Analytics dashboards and performance reporting.
- [ ] **Phase 4**: Machine learning feedback loop.

## Recent Key Updates & Improvements (v0.19.0)
- **Mobile View & Small Screens UX Layout Optimization**:
  - Unified mobile top navigation header into a single sleek row, reclaiming vertical real estate on small smartphone screens (320px–480px).
  - Redesigned `MonthSelector` into a clean 2-tier mobile toolbar: Month navigator on top, horizontal action buttons on the bottom.
  - Upgraded `RosterGrid`: Expanded sticky name column readability (`w-36`), enlarged cell touch targets to 32px with tactile micro-animations (`active:scale-90`), and added a **"Hari Ini" (Quick Jump to Today)** button that smoothly auto-scrolls to the current day's column.
  - Implemented mobile safe-area inset padding (`pb-[max(0.75rem,env(safe-area-inset-bottom))]`) across `ShiftEditDrawer`, `RecommendationDrawer`, and `BulkEditBar` to prevent collision with iOS Home Indicator and Android gesture bars.
- **Monthly Schedule Reset Feature (*Reset Monthly Roster*)**:
  - Added Server Action `resetMonthlyRoster` in [src/app/actions/generator.ts](file:///c:/Users/Asus/Documents/Magang/Project/Jadwal/src/app/actions/generator.ts) supporting two modes:
    1. **Semua Libur (L)**: Sets all staff shifts on the selected month to `'L'` (Libur/Off).
    2. **Hapus Shift (Kosongkan Total)**: Deletes all shift records for that month so the schedule is completely empty and "Buat Jadwal" can be executed again.
  - Integrated "Reset Jadwal" button in [src/components/MonthSelector.tsx](file:///c:/Users/Asus/Documents/Magang/Project/Jadwal/src/components/MonthSelector.tsx) with a safety confirmation dialog [src/components/ResetMonthModal.tsx](file:///c:/Users/Asus/Documents/Magang/Project/Jadwal/src/components/ResetMonthModal.tsx).
- **Pure Database Authentication & Vercel Read-Only Fix (v0.18.11)**:
  - `login` in [src/app/actions/auth.ts](file:///c:/Users/Asus/Documents/Magang/Project/Jadwal/src/app/actions/auth.ts) authenticates **strictly against the Supabase database (`jadwal.users`)**, eliminating any dependency on local `users.csv` files or disk writes on Vercel.
  - Added [src/lib/default-users.ts](file:///c:/Users/Asus/Documents/Magang/Project/Jadwal/src/lib/default-users.ts) to provide in-memory fallback definitions for serverless environments.
- **3-Tier Role Authentication & Web Login (`developer`, `admin`, `user`)**:
  - Role-based permissions: `developer` (superadmin with admin management), `admin` (schedule editing, personnel management, user account creation), and `user` (read-only schedule view with personal calendar sync link).
- **Email-Based Personal Calendar Feed (`WebCal / iCal RFC 5545`)**:
  - Strict 100% per-person schedule isolation: technicians only receive their own active shifts with embedded alarms.
- **Unified Light & Dark Theme Redesign**:
  - Complete dual-mode layouts with soft ambient light styling and deep dark mode aesthetics.

