# D-06 — Exercise: Build the Complaint List Page

---

## Slide 1 of 3 — The Task

**Headline:** The CMM API layer is already built. Your job: connect it to the UI.

**Talking points:**
- The Complaint module has a complete API layer — schema, service, and route handlers were implemented in CMM Sprint 0. The final piece is the browse UI page at `app/(dashboard)/complaints/page.tsx` and navigation wiring. That is the task.
- Before writing any code, spend five minutes planning: what `useBrowseState` config will you need? What columns should the table have? What filters make sense? Write it down, then compare with the reference solution.

**What is already in the codebase:**
```
src/modules/complaints/
  complaints.schemas.ts         ← COMPLAINT_STATUSES, parseCreateComplaintInput, parseCreateComplaintNoteInput
  complaints.service.ts         ← listComplaints, getComplaintById, createComplaint, addComplaintNote,
                                   listComplaintCategories, listComplaintPriorities
app/api/complaints/
  route.ts                      ← GET /api/complaints (list) + POST (create)
  [id]/route.ts                 ← GET /api/complaints/:id
  notes/route.ts                ← POST /api/complaints/notes
  categories/route.ts           ← GET /api/complaints/categories
  priorities/route.ts           ← GET /api/complaints/priorities
```

**What you need to build:**
```
app/(dashboard)/complaints/
  page.tsx                      ← browse page: filter, table, pagination
```

**Navigation wiring:**
- `src/lib/navigation.ts` — add a `complaints` entry with `href`, `label`, `icon`
- `src/components/master-data/master-data-nav.tsx` — add a nav link for Complaints (review the pattern used for Blocks, Units, Individuals)

**The `listComplaints` service supports these query params:**
- `page`, `pageSize` (default 20, max 100)
- `status` (one of: `Open | Assigned | InProgress | Resolved | Closed | Reopened`)
- `unitId`, `categoryId`, `priorityId`
- `sortBy` (`createdAt | status | ticketId`), `sortDir` (`asc | desc`)

**Response shape includes per item:** `ticketId`, `status`, `title`, `createdAt`, `unit.description` + `unit.block.description`, `category.description`, `priority.label`, `reporter.fName/sName`.

**Visual:** Two-column layout: left side shows the existing API file tree; right side shows the "to build" file tree. Navigation diagram: sidebar nav → `navigation.ts` → complaints page.

**Takeaway:** The API layer and UI layer are developed independently. When the API is stable, the UI is a `useBrowseState` config and a table layout — nothing more.

---

## Slide 2 of 3 — Reference Solution

**Headline:** Walk through the key decisions — not just the code.

**`useBrowseState` config — key decisions:**

```typescript
// app/(dashboard)/complaints/page.tsx
const config: BrowseConfig<ComplaintItem, SortOption> = {
  endpoint:      "/api/complaints",
  errorMessage:  "Could not load complaints.",
  pageSize:      20,
  sortOptions: [
    { value: "createdAt", label: "Sort by date" },
    { value: "status",    label: "Sort by status" },
    { value: "ticketId",  label: "Sort by ticket ID" },
  ],
  defaultSortBy: "createdAt",
  filters: [
    { key: "status",     defaultValue: "" },
    { key: "categoryId", defaultValue: "" },
    { key: "priorityId", defaultValue: "" },
    { key: "unitId",     defaultValue: "" },
  ],
};
const state = useBrowseState<ComplaintItem, SortOption>(config);
```

**Filter dropdowns — key decision:**  
`status` uses a static array from `COMPLAINT_STATUSES` (imported from `complaints.schemas.ts` — no API call needed). `categoryId` and `priorityId` are loaded on mount from `/api/complaints/categories` and `/api/complaints/priorities`. Store them in local `useState` arrays. This is the same pattern as contribution-heads in the contribution capture page.

**Table columns — key decision:**
```typescript
// DataTable columns
const columns: Column<ComplaintItem>[] = [
  { key: "ticketId",    label: "Ticket",    render: (row) => row.ticketId },
  { key: "unit",        label: "Unit",      render: (row) => `${row.unit.block.description}, ${row.unit.description}` },
  { key: "category",    label: "Category",  render: (row) => row.category.description },
  { key: "priority",    label: "Priority",  render: (row) => row.priority.label },
  { key: "status",      label: "Status",    render: (row) => row.status },
  { key: "title",       label: "Title",     render: (row) => row.title },
  { key: "createdAt",   label: "Raised",    render: (row) => new Date(row.createdAt).toLocaleDateString() },
];
```

Why no "Create" action in the browse page? The `POST /api/complaints` endpoint requires SOCIETY_ADMIN or MANAGER. The list page is read-role accessible. A separate creation flow (a form page or a modal) should gate on `session.user.role`. For Sprint 0, the list page is read-only — create will be added in Sprint 1.

**Navigation wiring — `src/lib/navigation.ts`:**
Find the nav entry structure (look at how blocks, units, or individuals are registered). Add:
```typescript
{ href: "/complaints", label: "Complaints", icon: "MessageSquare" }  // or equivalent Lucide icon
```

**Visual:** Side-by-side: (left) the `useBrowseState` config object and columns array; (right) a wireframe of the resulting complaints table with a status filter dropdown and sort controls. Status values shown as colour-coded badges (Open=blue, Resolved=green, Closed=grey).

---

## Slide 3 of 3 — Module Wrap-Up: The Six CRUD Building Blocks

**Headline:** Every module in every project is built from six operations. You now know all six.

**Talking points:**
- This is the end of Section D. The summary is deliberately a checklist — students can use it when building their own modules.

| Operation | Server pattern | Client pattern |
|---|---|---|
| **List** | `db.$transaction([findMany, count])` + paginated envelope | `useBrowseState` + `fetchJsonWithRetry` |
| **Create** | auth → parse → `db.X.create()` → audit log → `ok(201)` | `useCrudActions.create()` → `onSuccess` prepend |
| **Get by ID** | `findUnique` → `null` → `HttpError(404)` | `fetch GET /api/X/:id` |
| **Update** | before-snapshot → `db.X.update()` → audit diff → `ok(200)` | `useCrudActions.update()` → `onSuccess` replace |
| **Delete** | `db.X.delete()` → `Response(null, 204)` | `useCrudActions.delete()` → `onSuccess` filter out |
| **Complex write** | `db.$transaction(async tx => {...})` — check + write atomic | Same as create/update; the transaction is invisible to the client |

- Notice what is missing from this table: business logic. Business logic lives in the service — it is not one of the six patterns. The six patterns are the *plumbing* that moves data between the database and the client. Business logic runs inside the service functions that the plumbing calls.
- The complaints module illustrates how the API layer and UI layer develop independently. The API was built in Sprint 0 as pure server logic. The UI page in this exercise consumed that API with nothing but a `useBrowseState` config and a column definition. No changes to the service were needed.
- Final thought: if you completed the complaints list page without looking at an existing browse page for reference — you have internalized the pattern. If you used `blocks/page.tsx` as a reference — that is fine too. Experienced developers copy patterns from their own codebase. The goal is to know *why* the pattern is shaped the way it is.

**Visual:** The six-operation table above, rendered cleanly. Below: a one-line challenge — "Build the complaint list page. Then add a create form and gate it on MANAGER or SOCIETY_ADMIN role."

**Section transition note:**
Section D complete. In Section E — Hardening — we will look at what makes the difference between a working prototype and a production deployment: audit logging, role enforcement verification, performance indexes, and observability with Sentry.
