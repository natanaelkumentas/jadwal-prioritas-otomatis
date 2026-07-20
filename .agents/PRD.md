# Product Requirements Document (PRD)
## Smart Automatic Priority Scheduler (SAPS) — Web Application for ATS Engineering Duty Roster

**Product Owner:** Perum LPPNPI – Cabang Manado, ATS Engineering Unit
**Document Version:** 1.2 (Next.js + Supabase Edition)
**Date:** July 21, 2026
**Reference Source Data:** *Daftar Dinas ATS Engineering – Bulan Juli 2026*
**Delivery Platform:** Web-based application built on **Next.js** (frontend + backend) and **Supabase** (database, auth, realtime, storage)

---

## 1. Background

The ATS Engineering unit currently manages its monthly duty roster (*Daftar Dinas*) manually in spreadsheet form, covering two technical sub-groups:

- **CNS (Communication, Navigation, Surveillance)** — technicians rotate through 5 duty groups, each with shift codes such as OH, L, P, S, M, Y, PS, D.
- **ESS (Electrical/Essential Support Systems)** — technicians follow a similar rotating shift pattern with its own P/S/M/L/PS codes.

Each technician holds one or more **specialty ratings** within their group (e.g., a CNS technician may be rated in **C**, **N**, and/or **S**; an ESS technician similarly holds 1–3 ratings within the ESS rating set). A technician does not need to hold all three ratings — they may be single-rated, dual-rated, or fully triple-rated.

When a technician is marked **CUTI (annual leave)**, **DINAS LUAR (external assignment)**, **DIKLAT (training)**, or otherwise unavailable, the shift they were assigned to becomes **unstaffed** and currently must be manually reassigned by the Manager Teknik — a slow, error-prone, and non-standardized process, especially when the absent technician holds a rare or critical rating combination.

This PRD specifies SAPS as a **web-based application**: accessible via standard browsers on desktop and mobile, centrally hosted, with no client software installation required by the Manager Teknik, Duty Roster Admin, or technicians. This removes the dependency on a single offline spreadsheet file and enables real-time, multi-user access to the same live roster.

## 2. Problem Statement

There is no automated, rules-based mechanism to:
1. Detect when a scheduled technician becomes unavailable (cuti/dinas luar/diklat/sakit).
2. Identify which specialty rating(s) are required to cover that specific shift.
3. Rank all eligible, available technicians who hold the matching rating(s).
4. Recommend (or auto-assign) the best replacement while respecting labor rules (rest hours, max consecutive shifts, fair workload distribution).
5. Provide the Manager Teknik a transparent, auditable justification for *why* a given replacement was recommended.

## 3. Goals & Objectives

| Goal | Description |
|---|---|
| G1 | Automatically detect roster gaps caused by leave/absence events |
| G2 | Recommend the top-ranked replacement technician(s) within seconds |
| G3 | Guarantee rating-competency compliance (never assign an unrated technician to a rating-required shift) |
| G4 | Enforce labor/fatigue rules (rest period, consecutive night-shift limits) |
| G5 | Balance workload fairly across the group over the month |
| G6 * | Give the Manager Teknik full visibility/override capability — the system recommends, a human approves |
| G7 | Maintain a full audit trail for every auto-generated recommendation |

## 4. Scope

**In scope**
- CNS group (5 sub-groups: Grup 1–5) and ESS group scheduling data
- Rating-based eligibility matching (C/N/S for CNS; equivalent 3-code rating set for ESS)
- Leave/absence detection: CUTI, DINAS LUAR, DIKLAT, SAKIT (sick), UR (ujian rating)
- Recommendation engine (ranked candidate list, not silent auto-swap, unless configured for full-auto mode)
- Manager approval workflow
- Reporting & audit log
- **Web application delivery**: browser-based UI, centralized backend, hosted on internal/cloud infrastructure, multi-device access (desktop and mobile browser), single shared source of truth for the live roster

**Out of scope (Phase 1)**
- Payroll/overtime calculation
- Integration with national ATS licensing databases
- Multi-airport / multi-branch scheduling (Manado branch only for MVP)

## 5. Stakeholders & Personas

| Role | Interest |
|---|---|
| **Manager Teknik** (e.g., Subhan A. Syawie) | Approves/overrides recommendations, needs fast, defensible decisions |
| **Teknisi (CNS/ESS technicians)** | Affected by reassignment, care about fairness and rest |
| **Duty Roster Admin** | Inputs monthly base roster, leave requests |
| **HR/Compliance** | Needs audit trail, rating validity checks |

## 6. Definitions

| Term | Meaning |
|---|---|
| **CNS** | Communication, Navigation, Surveillance technician group |
| **ESS** | Electrical/Essential Support Systems technician group |
| **Rating (C/N/S)** | Competency certification a CNS technician holds; can hold 1, 2, or all 3 |
| **ESS rating set** | Equivalent competency set for ESS technicians (modeled the same way, 1–3 of 3 codes) |
| **Shift codes** | D (08:00–17:00), P (07:00–15:00 CNS / 07:00–13:00 ESS), S (12:00–20:00 CNS / 13:00–19:00 ESS), M (19:00–07:00), PS (07:00–19:00), L (Libur/off), Y (Lepas Malam/post-night recovery), OH (Office Hours) |
| **CUTI** | Annual leave |
| **DINAS LUAR (DL)** | External/off-site assignment |
| **DIKLAT** | Training program |
| **UR** | Ujian Rating (rating exam) |
| **Gap Event** | Any status that removes a technician from their assigned shift |

## 7. High-Level Solution Approach — Recommended DSS Type

This is fundamentally a **constrained resource-allocation and ranking problem**: given a shift with a specific competency requirement, find the best-fit available person from a filtered candidate pool, respecting hard constraints (must-have rules) and soft constraints (fairness/preference).

### Recommended DSS Classification
**Hybrid DSS = Model-Driven DSS + Knowledge-Driven (Rule-Based) DSS, using Multi-Criteria Decision Analysis (MCDA) as the ranking model.**

Rationale:
- **Knowledge-Driven / Rule-Based component** — encodes hard business rules as an expert-system-style rule base (e.g., "a technician cannot be assigned two shifts within an 11-hour window," "a technician must hold the required rating for the shift type," "a technician cannot exceed X consecutive night shifts"). Rule-based DSS is appropriate because these are explicit, codified regulations rather than statistical predictions.
- **Model-Driven component** — once the rule base filters out *ineligible* candidates, a quantitative scoring/optimization model (a weighted multi-criteria scoring function, i.e., an MCDA/AHP-style model) ranks the remaining *eligible* candidates to recommend the best one(s). This is a classic model-driven DSS pattern: "what-if" style recommendation based on a decision model, not a black-box prediction.
- A pure **Data-Driven DSS** (analytics/BI only) is insufficient alone because the core need is a *recommendation*, not just data visualization.
- A pure **Communication-Driven DSS** (collaboration-focused) doesn't fit — the core value is automated decision generation.
- Machine-learning/predictive DSS is not necessary at MVP scale (roster of ~25–30 staff); it can be layered later (Phase 2) to learn preference patterns from historical override behavior, becoming a **Document/Data-Driven DSS extension** for continuous improvement.

**Conclusion:** Build a **Hybrid Rule-Based + Model-Driven DSS with MCDA scoring**, delivered as a human-in-the-loop **recommender**, not a fully autonomous scheduler — the Manager Teknik retains final approval authority (semi-structured decision support, per classic Simon/Gorry-Scott-Morton DSS theory, since roster reassignment is a semi-structured operational decision).

## 7A. Web Application Architecture (Next.js + Supabase)

### 7A.1 Architecture Style
A **Next.js full-stack application** backed by **Supabase** as the managed backend platform:

```
[Browser Client]
     │  (Next.js App Router — React Server + Client Components)
     ▼
[Next.js App]
  ├─ Server Components / Route Handlers  → read roster, staff, ratings
  ├─ Server Actions                      → approve replacement, override, submit leave
  ├─ Rule Engine + MCDA Scoring module   → runs server-side (Route Handler / Server Action / Edge Function)
  └─ supabase-js client (server + browser)
     │
     ▼
[Supabase]
  ├─ Postgres Database   → staff, ratings, shifts, gap_events, recommendations, audit_log
  ├─ Auth                → email/password or SSO login, JWT session, role claims
  ├─ Row Level Security   → enforces Admin / Manager / Teknisi data access per row
  ├─ Realtime             → live roster updates pushed to all connected clients
  ├─ Edge Functions        → scheduled gap-detection job, notification dispatch
  └─ Storage               → exported PDF/roster files, attachments (e.g. leave forms)
```

| Layer | Implementation |
|---|---|
| **Frontend** | Next.js (App Router), React Server Components for the roster grid/read views, Client Components for interactive elements (approve/override modals, filters); Tailwind CSS for the responsive grid/mobile layout |
| **Backend/API** | Next.js Route Handlers and Server Actions — no separate backend service needed; server-side code calls Supabase directly using the service role key for privileged operations (e.g., writing recommendations, audit log entries) |
| **Rule Engine + MCDA Scoring** | Implemented as a server-side TypeScript module (`/lib/scheduler-engine`) invoked from a Server Action or Route Handler whenever a Gap Event is created; queries Supabase for eligible candidates, applies FR-3–FR-7 hard filters in SQL/TypeScript, then computes the MCDA score (Section 8.4) in TypeScript |
| **Database** | Supabase Postgres — tables: `staff`, `ratings`, `staff_ratings`, `shifts`, `gap_events`, `recommendations`, `audit_log` (see Section 7A.4 for schema outline) |
| **Auth & Access Control** | Supabase Auth for login/session (JWT); **Row Level Security (RLS) policies** enforce that Teknisi can only read their own shift data, Duty Roster Admin can read/write group rosters, and Manager Teknik has approval rights — enforced at the database layer, not just in the UI |
| **Real-time updates** | Supabase Realtime subscriptions on `shifts`, `gap_events`, and `recommendations` tables, so the roster grid and alert badges update live for every connected user without polling |
| **Notifications** | Supabase Edge Function (or a scheduled Postgres cron job via `pg_cron`) detects new Gap Events and triggers email/WhatsApp notification via a third-party provider (e.g., Resend, Twilio) to the Manager Teknik |
| **Hosting** | Next.js app deployed on Vercel (or self-hosted Node server if internal hosting is required by IT policy); Supabase project hosted on Supabase Cloud (region selection should consider aviation-sector data-residency requirements) or self-hosted Supabase if full on-premise control is mandated |
| **File export** | Supabase Storage bucket for generated PDF/Excel exports of the monthly roster (preserving compatibility with the existing "Daftar Dinas" file habit) |

### 7A.2 Why This Stack Fits the DSS
- **Server Actions + Route Handlers** keep the rule engine and MCDA scoring logic entirely server-side, so recommendation logic is centralized and never exposed/executed in the browser — important for consistency and auditability (FR-12).
- **Row Level Security** gives the rating-eligibility and role-based rules (Section 8.3) a second enforcement layer directly in the database, reducing the risk of a UI bug ever exposing or allowing an invalid assignment.
- **Supabase Realtime** directly satisfies the "always-current, multi-user data" requirement from Section 7A's original rationale — the Manager Teknik sees a Gap Event the instant it's created, without refreshing.
- **Postgres** is a strong fit for the relational rating/shift/eligibility joins described in Section 8.1, and supports `pg_cron` for scheduled gap-detection scans (FR-1).
- **Next.js on Vercel** gives fast global delivery and easy preview deployments for iterating on the roster UI; a self-hosted Node deployment remains an option if LPPNPI IT policy requires internal hosting.

### 7A.3 Browser & Device Support
- Modern evergreen browsers: Chrome, Edge, Firefox, Safari (current and previous major version)
- Responsive breakpoints (Tailwind) for desktop (full roster grid) and mobile/tablet (condensed list + gap-alert/approval view)
- No native app or plugin/install requirement for MVP; Next.js enables an optional PWA (installable, offline-cache shell) later without a separate codebase

### 7A.4 Supabase Schema Outline

| Table | Key Columns |
|---|---|
| `staff` | `id`, `name`, `group` (CNS/ESS), `sub_group`, `role_level`, `created_at` |
| `ratings` | `id`, `code` (e.g., C/N/S), `group` (CNS/ESS), `description` |
| `staff_ratings` | `staff_id` (FK), `rating_id` (FK) — many-to-many, models 1–3 ratings per technician |
| `shifts` | `id`, `staff_id` (FK, nullable if unfilled), `date`, `shift_code`, `group`, `required_rating_id`, `status` |
| `gap_events` | `id`, `shift_id` (FK), `reason` (CUTI/DL/DIKLAT/SAKIT/UR), `detected_at`, `status` |
| `recommendations` | `id`, `gap_event_id` (FK), `candidate_staff_id` (FK), `score`, `score_breakdown` (jsonb), `rank`, `created_at` |
| `audit_log` | `id`, `actor_id` (FK), `action`, `entity`, `entity_id`, `metadata` (jsonb), `created_at` |

RLS policies to be defined per table (e.g., `staff` readable by all authenticated users in the same `group`; `recommendations` and `audit_log` writable only via server-side service role, never directly from the client).

## 8. Functional Requirements

### 8.1 Data Model

**Technician Profile**
| Field | Example |
|---|---|
| `staff_id` | T-014 |
| `name` | Fadjar Ramadhan |
| `group` | CNS / ESS |
| `sub_group` | Grup 3 |
| `ratings` | ["C","N","S"] or subset |
| `role_level` | Teknisi / Manager Teknik |
| `monthly_shift_count` | auto-computed |
| `consecutive_night_count` | auto-computed |
| `last_shift_end_time` | timestamp |
| `leave_status` | Active / Cuti / Dinas Luar / Diklat / Sakit |

**Shift Requirement**
| Field | Example |
|---|---|
| `shift_id` | 2026-07-15-M-CNS-G3 |
| `date` | 15 July 2026 |
| `shift_code` | M (19:00–07:00) |
| `group` | CNS |
| `required_rating` | ["N"] (minimum one of) |
| `assigned_staff_id` | T-014 |
| `status` | Filled / Gap / Pending Approval |

### 8.2 Gap Detection
- FR-1: System scans the roster daily (and on any leave-request submission) for statuses `CUTI`, `DL`, `DIKLAT`, `SAKIT`, `UR` that overlap a scheduled shift.
- FR-2: Each detected gap automatically creates a **Gap Event** with the required rating(s) inherited from the absent technician's assigned shift type.

### 8.3 Candidate Filtering (Rule-Based / Hard Constraints)
A candidate is **eligible** only if ALL are true:
- FR-3: Holds at least one of the required ratings for that shift.
- FR-4: Is currently marked `L` (Libur/off) or otherwise unassigned on that date — never pulled from another active duty.
- FR-5: Minimum rest period (≥ 11 hours, configurable) since their last shift end time is satisfied.
- FR-6: Has not exceeded the configured maximum consecutive night shifts (`M`) or consecutive `PS` shifts.
- FR-7: Is not themselves on `CUTI/DL/DIKLAT/SAKIT` on the gap date.

### 8.4 Candidate Ranking (Model-Driven / MCDA Scoring)
For each eligible candidate, compute:

```
Score = (w1 × RatingCoverageScore)
      + (w2 × WorkloadBalanceScore)
      + (w3 × FatigueMarginScore)
      + (w4 × RecencyOfSameShiftScore)
      + (w5 × GroupContinuityScore)
      − (penalty × OverrideHistoryPenalty)
```

| Factor | Description | Suggested Weight |
|---|---|---|
| RatingCoverageScore | Prefer the candidate whose rating set most tightly/uniquely matches the requirement (protects rare-rating holders for shifts that truly need them later) | 0.35 |
| WorkloadBalanceScore | Favor technicians with fewer shifts assigned so far this month | 0.25 |
| FatigueMarginScore | Favor technicians with the largest rest buffer beyond the minimum | 0.20 |
| RecencyOfSameShiftScore | Favor technicians who haven't just done the same shift type repeatedly (avoid burnout on nights) | 0.10 |
| GroupContinuityScore | Slight preference for same sub-group (Grup 1–5) continuity for team familiarity | 0.10 |

- FR-8: System outputs a ranked list (Top 3–5) with each factor's contribution shown, so the Manager Teknik can see *why*.
- FR-9: If zero eligible candidates are found, system flags a **Critical Staffing Alert** and suggests next-best options (e.g., relaxing rest-period buffer, or notifying Manager for a manual cross-group solution).

### 8.5 Decision & Approval Workflow
- FR-10: Default mode = **Recommend-and-Approve**: system presents ranked suggestions; Manager Teknik clicks to confirm, or picks an alternate from the list, or manually overrides.
- FR-11: Optional **Auto-Assign mode** (configurable per group): if the top candidate's score exceeds a confidence threshold, system assigns automatically and only notifies the Manager (post-hoc review), reducing turnaround time for last-minute gaps (e.g., sudden `SAKIT`).
- FR-12: Every decision (recommended, approved, or overridden) is logged with timestamp, user, and rationale for audit.

### 8.6 Reporting
- FR-13: Monthly roster export (mirrors the existing "Daftar Dinas" format) reflecting all auto-filled gaps.
- FR-14: Fairness report: shifts-per-technician, night-shift distribution, override frequency.
- FR-15: Rating-coverage risk report: flags ratings with only 1–2 qualified holders in a group (single point of failure).

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Candidate recommendation generated in < 3 seconds for a roster of up to 100 staff, page loads < 2 seconds on standard broadband/4G |
| Availability | 99% uptime during working hours; graceful degraded read-only mode with cached last-known roster if the API is briefly unreachable |
| Responsiveness | Fully responsive web UI: usable on desktop browser (roster grid) and mobile browser (approvals, self-view) without a separate native app |
| Auditability | Immutable `audit_log` table (Supabase Postgres), writable only via server-side service role, retained ≥ 2 years |
| Security | HTTPS-only (Vercel default TLS), Supabase Auth for login/session (JWT), Row Level Security policies on every table, service role key never exposed to the client, session timeout |
| Data Residency | Supabase project region selected to comply with any internal LPPNPI/aviation-sector IT policy; self-hosted Supabase considered if strict on-premise data residency is mandated |
| Localization | Bahasa Indonesia + English UI toggle (Next.js i18n routing); shift-code legend configurable per unit |
| Usability | Calendar/grid view matching the existing spreadsheet layout for adoption ease |
| Scalability | Next.js serverless functions and Supabase's managed Postgres scale independently; architecture can extend from single-branch (Manado) to multi-branch usage by partitioning data on a `branch_id` column without redesign |

## 10. UX Requirements (Web UI)

- Accessible via a URL/login page in any supported browser — no installation, no plugins.
- Monthly grid view identical in spirit to the current spreadsheet (name rows × date columns, color-coded shift codes), rendered as an interactive web table with horizontal scroll for the 31-day view on smaller screens.
- Gap cells highlighted (e.g., red) with a "Recommend Replacement" action (click on desktop, tap on mobile).
- Side panel (desktop) / slide-up sheet (mobile) showing ranked candidates with score breakdown bars.
- One-click approve / pick alternate / manual override with mandatory reason field, submitted via the web form directly to the API.
- Rating badge indicators next to each technician's name (C/N/S icons, filled or outlined per held rating).
- Browser push notification (or email/WhatsApp integration) alerting the Manager Teknik when a new Gap Event or Critical Staffing Alert is created, with a direct link back into the web app.
- Print/export-to-PDF or export-to-spreadsheet option from the web view, to preserve compatibility with the existing "Daftar Dinas" paper/file distribution habit.

## 11. Success Metrics (KPIs)

| KPI | Target |
|---|---|
| Time to fill a detected gap | < 5 minutes (vs. current manual process, hours) |
| Rating-compliance violations | 0 |
| Fairness variance (shift count std. dev. across technicians) | ↓ 30% vs. manual baseline |
| Manager override rate | Tracked; target < 15% (indicates recommendation quality) |
| Critical Staffing Alerts unresolved > 24h | 0 |

## 12. Risks & Assumptions

| Risk/Assumption | Mitigation |
|---|---|
| Rating data not digitized yet | Requires initial data migration of each technician's C/N/S (and ESS equivalent) ratings before go-live |
| Manager resistance to automation | Ship as recommend-only first; auto-assign mode opt-in later |
| Rare-rating shifts with zero backup | Rating-coverage risk report (FR-15) proactively flags this before it becomes a crisis |
| Labor rules vary by regulation updates | Rule base kept in a configurable rules table, not hard-coded |

## 13. Roadmap (Phased)

| Phase | Scope |
|---|---|
| Phase 1 (MVP) | Next.js app + Supabase schema/Auth/RLS, rule-based eligibility filter + MCDA ranking as a server-side module, recommend-and-approve workflow, CNS + ESS groups, Supabase Realtime roster grid |
| Phase 2 | Auto-assign mode, fairness/coverage analytics dashboards, Supabase Edge Function notifications (email/WhatsApp) |
| Phase 3 | Learning layer: analyze historical overrides (from `audit_log`) to auto-tune MCDA weights (Data-Driven DSS extension) |
| Phase 4 | Multi-branch rollout across other LPPNPI cabang (via `branch_id` partitioning), optional PWA install for mobile home-screen access |

## 14. Appendix — Source Data Reference

Sample structure observed in *Daftar Dinas ATS Engineering, Bulan Juli 2026* (Perum LPPNPI Cabang Manado):
- Groups: Manager Teknik, CNS (Grup 1–5), ESS
- Shift legend: P, D, S, M, PS, L, Y, OH, DL, UR
- Leave-type labels observed: CUTI TAHUNAN, DINAS LUAR, DIKLAT TCC COMMUNICATION, DL KAO
- This structure forms the baseline schema for the Technician Profile and Shift Requirement entities in Section 8.1.
