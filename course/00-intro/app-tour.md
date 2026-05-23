# App Tour Plan — PrismApp Visual Walkthrough

**Purpose:** Opening screen-capture sequence for the course introduction.
The tour shows the finished, working application. Learners see what they are building before the first lesson.
Run time target: ~5–6 minutes.
Format: narrated screen recording. Each entry is one screen capture (static or short clip).

---

## Orientation Note for Instructor

Capture this tour on the deployed Vercel URL (or localhost with the seed database).
Keep the browser at 1280×800. Use the Society Admin account for most screens.
Highlight the mouse pointer in Camtasia. Highlight key UI elements with a softbox overlay.
The narration script is the exact read — keep the tone brisk, confident, not salesy.

---

## Capture 1 — Login Page

**What to show:** The PrismApp login screen at `/`.
Browser is at the `/` public route. The login form is centered. Email field, password field, Sign In button.

**Narration:**
"This is PrismApp — a society management platform we'll build together from scratch.
It handles blocks, units, residents, monthly contributions, and complaints for a residential society.
Let's take a quick walk through the finished product before we dive into the code.
I'll log in as the Society Admin."

[TYPE into email field. CLICK Sign In. Don't show the password.]

**Course connection:** Section C — auth boundary (next-auth credentials provider, JWT strategy).

---

## Capture 2 — Home Page (Dashboard)

**What to show:** `/home` — the role-aware landing page.
Show the entry cards grouped under "Master Data", "Timelines", "Contribution Master Data", "Operations".
The current user's name and role are visible in the nav header.

**Narration:**
"The home page is a role-aware launchpad. A Society Admin sees everything.
A Read-Only user sees the same cards but cannot access mutation screens.
The same session JWT drives both the navigation and the API access checks.
Let me show each module."

**Course connection:** Section C — roles and auth boundary, server-side role guards.

---

## Capture 3 — Blocks List

**What to show:** `/blocks` — the block list page.
A paginated table with columns: Description, Created At. A search box and sort selector at the top.
Show at least 3 blocks in the table (e.g., Block A, Block B, Tower 1).

**Narration:**
"Blocks are the top-level physical units — a wing, a tower, a phase.
Every unit belongs to a block. The list supports search and pagination.
This is the simplest module in the project — which is why we build it first."

**Course connection:** Section D — list pattern (`$transaction([findMany, count])`), browse UI, `useBrowseState`.

---

## Capture 4 — Create Block (Inline Form)

**What to show:** On the same `/blocks` page — scroll down to or highlight the inline create form.
Type a block name in the input field. Click Create. The new row appears at the top of the table without a page reload.

**Narration:**
"Creating a block posts to `/api/blocks`. The server validates the input, writes to PostgreSQL, records an audit event, and returns the new row.
The client prepends it to the list — no page reload needed.
Notice: the URL didn't change."

**Course connection:** Section D — `createBlock` service, `useCrudActions.create()`, optimistic local state update.

---

## Capture 5 — Units List

**What to show:** `/units` — units list filtered by a block.
Show the block filter dropdown — select "Block A". The table updates to show only Block A's units.
Columns: Unit (number), Block, Sq Ft, Inception Date.

**Narration:**
"Units belong to blocks. Each unit has a square footage value — this is used in contribution calculations later.
The block filter is reflected in the URL, so this view is bookmarkable and shareable."

**Course connection:** Section B — ERD (Unit → Block FK), Section D — URL-synced filter state.

---

## Capture 6 — Individuals List

**What to show:** `/individuals` — individual list.
Columns: Name, Mobile, Gender. A search box. Show 4–5 individuals.

**Narration:**
"Individuals are the people in the system — owners, residents, payers.
One person can be an owner of one unit and a resident of another — those are separate timeline records.
A person is not tied to a unit; the unit-person relationship is in ownerships and residencies."

**Course connection:** Section B — ERD (Individual entity, no direct FK to Unit), Section A — scope (owner ≠ resident distinction).

---

## Capture 7 — Ownerships: Timeline View

**What to show:** `/ownerships` — filter to one unit (e.g., A-101).
Show the timeline: one row with `startDate`, `endDate` (null = current owner), and the individual's name.
If possible, show two consecutive entries showing an ownership transfer.

**Narration:**
"Ownerships are temporal records. A unit can have at most one active owner at a time.
If a unit changes hands, the previous ownership gets an end date, and a new record begins.
The system prevents overlapping ownership dates at the database transaction level.
This is one of the most technically interesting parts of the project."

**Course connection:** Section B — temporal modeling (open-ended date ranges), Section D — `db.$transaction(async tx => {...})` overlap check.

---

## Capture 8 — Overlap Rejection

**What to show:** Attempt to create an ownership that overlaps an existing one.
In the create form, enter a start date that falls inside an existing active ownership.
Show the red error notice: "An ownership record already exists for this unit during the requested period."

**Narration:**
"The system rejects the overlap. Not just a UI check — the server validates inside a serializable transaction.
Even two concurrent requests cannot both slip through. We'll see exactly how that works in Section D."

**Course connection:** Section D — `ensureNoOwnershipOverlap` inside `$transaction(async tx => {...})`.

---

## Capture 9 — Contribution Heads

**What to show:** `/contribution-heads` — list of contribution heads.
Columns: Description, Pay Unit (Per Sq Ft / Per Person / Lump Sum), Period (Monthly / Yearly), Active.
Show 3–4 heads: e.g., Maintenance Charges (Per Sq Ft, Monthly), Gym Membership (Per Person, Yearly), Club Membership (Lump Sum, Yearly).

**Narration:**
"Contribution heads define what residents pay and how the amount is calculated.
'Per Sq Ft' multiplies the rate by the unit's area. 'Per Person' multiplies by resident count. 'Lump Sum' charges a flat amount.
All three resolve to the same formula: quantity × rate. That's a deliberate design choice — it keeps reports simple."

**Course connection:** Section B — Contribution Head entity, pay-unit enum. Section A — uniform formula design decision.

---

## Capture 10 — Contribution Rates (Rate History)

**What to show:** `/contribution-rates` — list filtered to one head (e.g., Maintenance Charges).
Show two rate rows with different `effectiveFrom` dates — demonstrating rate history.
Highlight that older rate rows cannot be edited.

**Narration:**
"Rates are append-only. When the maintenance charge goes up in April, you add a new rate — you don't overwrite the old one.
Contributions posted before the change are already locked to the rate that was current at the time.
Financial records don't change retroactively. This is a non-negotiable domain rule."

**Course connection:** Section A — immutability scope, Section B — ContributionRate entity with `effectiveFrom`.

---

## Capture 11 — Contribution Capture Form

**What to show:** `/contributions` — the main contribution recording screen.
Show the unit selector, contribution head selector, and the month grid.
Select a unit and a monthly head. The month grid shows Jan–Dec with status badges: green "Paid" for some months, yellow "Unpaid" for others.
Select two unpaid months. Show the calculated amount appearing at the bottom.

**Narration:**
"This is the contribution capture screen. Select a unit and a head, and the system shows the payment ledger for the year.
Paid months are locked — you can't record a payment twice for the same unit, head, and period.
Select the months you want to post, review the calculated amount, and submit."

**Course connection:** Section D — complex write (`$transaction` for duplicate prevention), Section B — header-detail pattern.

---

## Capture 12 — Contribution Post Confirmation

**What to show:** After submitting the contribution form, show the success state.
The submitted months flip from yellow "Unpaid" to green "Paid".
A transaction reference ID is visible (e.g., TXN-2026-00042).

**Narration:**
"The transaction is written atomically. The system checks for duplicates and posts all selected months as one logical event.
The transaction ID ties the header to all the detail rows.
Once posted, these records cannot be edited or deleted — only corrected with a compensating entry."

**Course connection:** Section D — immutability rule enforcement, `fromUnknownError` mapping P2002 to CONFLICT.

---

## Capture 13 — Paid/Unpaid Matrix Report

**What to show:** `/reports/contributions/paid-unpaid-matrix`
Select a contribution head (e.g., Maintenance Charges) and a year (2026).
The matrix shows a grid: rows are units, columns are Jan–Dec. Each cell is green "Paid", red "Unpaid", or grey "N/A".
Show the `paidMonthsCount` and `unpaidMonthsCount` summary columns on the right.

**Narration:**
"This is the management report. One page shows the payment status of every unit for an entire year.
Filter by block to see a wing at a time. Export to CSV to share with the committee.
The matrix query is a single SQL join — no application-level branching, because all heads use the same `quantity × rate` formula."

**Course connection:** Section B — reporting motivation for uniform formula. Section D — report API and pagination.

---

## Capture 14 — Transactions Report

**What to show:** `/reports/contributions/transactions`
Show a filterable table with columns: Transaction ID, Date, Unit, Head, Period, Amount, Posted By.
Apply a filter by a date range and a block. Show the filtered result.
Scroll to the bottom to show total amount.

**Narration:**
"The transaction report is the audit-friendly view — every posted contribution with full context.
Filter by date, block, unit, head, or period. Export to CSV.
The 'Posted By' column records who recorded the payment — that identity comes from the JWT, not a form field."

**Course connection:** Section C — auth boundary (actor identity from JWT). Section D — pagination, CSV export.

---

## Capture 15 — Complaints Module

**What to show:** `/complaints` — the complaint list page.
Show a table with columns: Ticket ID (e.g., MSH-2026-0012), Title, Unit, Category, Priority, Status badge (color-coded).
Status badges are visible: Open (amber), In Progress (indigo), Resolved (emerald).
Show the create form at the bottom: title, category dropdown, priority dropdown, anonymous toggle.

**Narration:**
"The Complaint Management Module — added after the contribution module was stable.
Residents submit complaints, which get a ticket ID, category, priority, and SLA clock.
Notice the 'Anonymous' toggle — a Read-Only session sees 'Anonymous' in the reporter column when that flag is set."

**Course connection:** Section A — scope and extensibility (CMM added as a standalone module without reworking existing code). Section D — module structure.

---

## Capture 16 — Audit Log

**What to show:** `/audit-log` — visible to Society Admin only.
Rows showing: Timestamp, Action (e.g., BLOCK_CREATED, OWNERSHIP_TRANSFERRED), Entity Type, Actor Role, Actor User ID.
Click on one row to expand the payload — show the `before` and `after` JSON diff for an update operation.

**Narration:**
"Every mutation writes to the audit log. Block created, ownership transferred, contribution posted.
The payload includes a before/after diff for updates — so you can see exactly what changed, when, and by whom.
This is the financial-grade auditability requirement. It's baked in from the start, not bolted on later."

**Course connection:** Section D — `writeAuditLog` called after every service write.

---

## Capture 17 — App Users (Role Management)

**What to show:** `/app-users` — Society Admin only.
A list of users with columns: Name, Email, Role (SOCIETY_ADMIN / MANAGER / READ_ONLY), Created At.
Show the create form: email, display name, role selector, password (hashed on creation).

**Narration:**
"Access control is built in. Three roles: Society Admin, Manager, and Read-Only.
A Read-Only user can see every list and report but cannot post contributions or change master data.
User accounts are stored in PostgreSQL — no external auth provider required for V1."

**Course connection:** Section C — role model, bcryptjs password hashing. Section A — roles scope decision.

---

## Capture 18 — Role Comparison: Same Page, Different Access

**What to show:** Log out of Society Admin. Log in as a Read-Only user.
Navigate to `/contributions` — show the page with forms and action buttons absent or disabled.
Navigate to `/blocks` — show the table is visible but the Create form is absent.

**Narration:**
"The UI respects roles — buttons and forms are hidden for Read-Only sessions.
But the real enforcement is server-side. If a Read-Only user calls `POST /api/blocks` directly, they get a 403.
UI gating is convenience; backend role checks are the actual security boundary.
That distinction matters — and we'll implement it properly in Section C."

**Course connection:** Section C — `requireMutationRole` in route handlers, `requireServerAppSession` in layouts.

---

## Capture 19 — What You Will Build (Closing Card)

**What to show:** Return to the Home page. Stay on screen for ~8 seconds while the narration plays.
Optionally, show a simple graphic: "A → Scope → B → Data Model → C → Technology → D → CRUD → E → Hardening"

**Narration:**
"That's PrismApp. You just saw the full working application.
In this course, you'll build every screen and every API from an empty Next.js project.
We start with the scope — what the system needs to do and why. Then the data model. Then the technology choices and why they were made. Then the implementation. Then hardening for production.
Every decision you saw in that tour has a reason. By the end, you'll know all of them."

---

## Tour Summary Table

| # | Screen | URL | Key feature shown | Course section |
|---|---|---|---|---|
| 1 | Login | `/` | Auth flow | C |
| 2 | Home dashboard | `/home` | Role-aware navigation | C |
| 3 | Blocks list | `/blocks` | Pagination, search, URL state | D-01 |
| 4 | Create block | `/blocks` (form) | Inline create, optimistic UI | D-02 |
| 5 | Units list | `/units` | Block filter, URL-synced | D-01, B |
| 6 | Individuals list | `/individuals` | Person entity, search | B, A |
| 7 | Ownerships timeline | `/ownerships` | Temporal records, open-ended dates | B, D-04 |
| 8 | Overlap rejection | `/ownerships` | Transaction-level validation | D-04 |
| 9 | Contribution heads | `/contribution-heads` | Pay-unit enum, period type | B, A |
| 10 | Contribution rates | `/contribution-rates` | Append-only rate history | A, B |
| 11 | Contribution capture | `/contributions` | Month grid, amount derivation | D-04, B |
| 12 | Post confirmation | `/contributions` | Duplicate prevention, immutability | D-04 |
| 13 | Paid/Unpaid matrix | `/reports/contributions/paid-unpaid-matrix` | Management report, uniform formula | B, D |
| 14 | Transactions report | `/reports/contributions/transactions` | Full audit trail, CSV export | D, C |
| 15 | Complaints module | `/complaints` | CMM module, status badges, anonymous | A, D |
| 16 | Audit log | `/audit-log` | Before/after diff, actor identity | D-02 |
| 17 | App users | `/app-users` | Role management, password hashing | C |
| 18 | Role comparison | `/blocks` (READ_ONLY) | UI gating vs server enforcement | C |
| 19 | Closing card | `/home` | Course roadmap recap | All |

---

## Production Notes

- **Record order**: Follow the capture sequence exactly. The narrative arc is: login → master data → timelines → financial module → reports → CMM → admin. Do not reorder.
- **Database state**: Seed at least 3 blocks, 6 units, 4 individuals, 2 ownership timelines (one with a historical transfer), 3 contribution heads (one of each pay unit), and 6 months of posted contributions for one unit/head before recording.
- **Sensitive data**: Use obviously fictional names and mobile numbers in the seed (e.g., "Rahul Sharma", "+91 98765 00001"). Do not use real personal data in a course recording.
- **Overlap rejection capture**: Requires a unit with an active open-ended ownership already recorded. Set up before recording Capture 8.
- **Role comparison capture**: Requires a second test account with READ_ONLY role.
- **Total recording time**: ~5–6 minutes at a brisk narration pace. Each screen gets 15–25 seconds. Avoid dwelling — the goal is "you can see it works" not a deep feature demo.
