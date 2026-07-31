# Smart Automatic Priority Scheduler (SAPS)

A Web-based Constrained Resource-Allocation and Decision Support System for Perum LPPNPI - Cabang Manado, ATS Engineering Unit.

## Features & Roadmap
- [x] **Phase 1 (MVP)**: Core Supabase database, rule-based filtering, and MCDA scoring engine for candidate replacements.
- [x] **Phase 2**: Interactive Roster Grid, Gap Management UI, Theme Engine (Light/Dark Mode), Skeleton Loaders, and Personnel CRUD Drawer.
- [ ] **Phase 3**: Analytics dashboards and performance reporting.
- [ ] **Phase 4**: Machine learning feedback loop.

## Recent Key Updates & Improvements (v0.14.3)
- **Personnel Add/Edit Sub-Modal Layering (`z-[100]`)**: Resolved stacking context issue by elevating form and delete confirmation popups above the personnel management drawer with backdrop dismiss handlers.
- **Header Personnel Name Consistency**: Displaying technician name across both Shift Edit and Gap Resolution (Cuti/Leave) drawers.
- **Leave Override & Shift Switching**: Supported direct cancellation/reassignment of incorrectly set leave codes back to regular working shifts.
- **Pristine Light/Dark Dual Theme Engine**: 100% hardcoded dark class removal with smooth CSS transitions across all cards, modals, table grids, and skeleton loaders.
