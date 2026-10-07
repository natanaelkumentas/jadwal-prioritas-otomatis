# Smart Automatic Priority Scheduler (SAPS)

A Web-based Constrained Resource-Allocation and Decision Support System for Perum LPPNPI - Cabang Manado, ATS Engineering Unit.

## Features & Roadmap
- [x] **Phase 1 (MVP)**: Core Supabase database, rule-based filtering, and MCDA scoring engine for candidate replacements.
- [x] **Phase 2**: Interactive Roster Grid, Gap Management UI, Theme Engine (Light/Dark Mode), Skeleton Loaders, and Personnel CRUD Drawer.
- [ ] **Phase 3**: Analytics dashboards and performance reporting.
- [ ] **Phase 4**: Machine learning feedback loop.

## Recent Key Updates & Improvements (v0.18.0)
- **3-Tier Role Authentication & Web Login (`developer`, `admin`, `user`)**:
  - Secure login portal at `/login` with AirNav Indonesia corporate styling, responsive mobile layout, and error validation.
  - Role-based permissions: `developer` (superadmin with admin management), `admin` (schedule editing, personnel management, user account creation), and `user` (read-only schedule view with personal calendar sync link).
  - Top-bar user indicator (`NavbarUserPill.tsx`) with color-coded badges and logout button.
- **Root Directory `users.csv` & Automatic Account Seeding**:
  - Generated `./users.csv` at project root containing credentials for Developer (`natanaelkumentas03@gmail.com` / `ti7polimdo`), Admin (`jadwal.airnav.mdc@gmail.com` / `magangairnavpolimdo2026`), and all 27 unit personnel with randomly-generated secure passwords.
  - Automated seeding synchronization (`src/lib/seed-users.ts`) linking `jadwal.users` to `users.csv`.
- **Auto-Download Credentials Feature**:
  - When Admin adds a new user in Kelola Personel, form asks for password (with "Acak Sandi" button) and automatically downloads `kredensial-user-[email].txt`.
  - When Developer creates a new admin account in Kelola Admin modal, browser automatically downloads `kredensial-admin-[email].txt`.
- **Email-Based Personal Calendar Feed (`WebCal / iCal RFC 5545`)**:
  - Feed route handler `/api/calendar/[staffId]/route.ts` supporting direct email endpoints (`/api/calendar/[email].ics`).
  - Strict 100% per-person schedule isolation: technicians only receive their own active shifts with embedded 2h and 30m alarms.
  - Interactive `CalendarSyncModal.tsx` with 1-click Google Calendar subscription, WebCal URL copy, and `.ics` download.
- **Unified Light & Dark Theme Redesign**:
  - Integrated `ThemeToggle` on `/login` and crafted dual-mode layouts with soft ambient light styling and deep dark mode aesthetics.
  - Redesigned `NavbarUserPill`, `CalendarSyncModal`, `DeveloperAdminModal`, and `PersonnelManagementModal` to seamlessly harmonize with the project's light and dark theme design tokens.
