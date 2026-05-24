# Hands-On Exercise — F-07: Reporting

---

## Before You Begin

Make sure the app is running locally with seed data populated.
All contribution-related seed data should be present, including at least one full year of contribution records.

```bash
npm run dev
```

Open `http://localhost:3000` in a browser and sign in.

---

## Part 1 — Run the Transactions Report (10 minutes)

### Step 1: Navigate to Reports

From the dashboard, find the **Reporting** section and click **Contribution Transactions**.

### Step 2: Apply Filters and Run

1. Set **Year** to the current seeded year.
2. Leave all other filters blank. Click **Refresh**.
3. Observe: how many rows appear? What totals are shown?

### Step 3: Narrow the Filters

1. Set **Month** to `January`. Click **Refresh**. Totals should change.
2. Pick one **Contribution Head** from the dropdown. Click **Refresh**.
3. Observe: `sumAmount` and `distinctUnitsCount` are now smaller.

### Step 4: Change the Sort

1. Change sort to **Amount Descending**. Click **Refresh**.
2. The largest payments should appear first.

### Step 5: Check the URL

Look at the browser address bar. Confirm that the URL contains the active filter parameters. Copy the URL and open it in a new tab. Confirm that the same report result appears.

**Expected outcome:** Changing filters changes the URL. Opening the URL in a new tab reproduces the same result.

---

## Part 2 — Export and Inspect the CSV (10 minutes)

### Step 6: Export Transactions CSV

With filters applied (year + head + month from Part 1):
1. Click **Export CSV**.
2. Open the downloaded file in a text editor (not Excel yet).

### Step 7: Read the Metadata Block

Identify each metadata row at the top of the file:
- `reportTitle` — which report?
- `generatedAt` — what timestamp?
- `generatedBy` — your user ID
- `generatedByRole` — your role
- `filter.refYear`, `filter.headId`, `filter.refMonth` — the active filters

**Question: Does the file show filters you did NOT set (e.g., `filter.unitId`)?**
Answer: No. Only active filters appear. Look at `getContributionTransactionsCsv` in the service to understand why.

### Step 8: Open in a Spreadsheet

Open the CSV in Excel or Google Sheets. Confirm:
- Column headers are in the first non-blank row after the metadata block.
- Row count matches what the UI showed.
- Amount values are consistent with the UI totals.

---

## Part 3 — Run the Paid/Unpaid Matrix (10 minutes)

### Step 9: Navigate to Matrix Report

From the dashboard, click **Paid/Unpaid Matrix** (or find it in the Reports navigation).

### Step 10: Select Head and Year

1. Select a **Contribution Head** (required — the Refresh button is disabled without it).
2. Set **Year**. Click **Refresh**.
3. Observe the grid: Paid cells are green, Unpaid are amber, N/A are grey.

### Step 11: Read the Totals

Below or above the grid, find the summary totals:
- **Paid Cells** / **Unpaid Cells** — how many unit/period combinations
- **Collection Amount** — actual paid amounts summed
- **Expected Amount** — computed from unit quantity × active rate
- **Active Rate** — the rate used for expected amount calculation

**Question: If the head's `payUnit` is 1 (per sqft), what determines the expected amount for each unit?**

### Step 12: Filter by Block

Add a **Block** filter. Click Refresh. Confirm that only units from that block appear in the matrix rows.

---

## Part 4 — Code Exploration (15 minutes)

### Step 13: Trace a Paid Cell

Pick a unit that shows "Paid" for a specific month. You need to confirm that a `ContributionDetail` record exists for it.

Option A (Prisma Studio):
```bash
npx prisma studio
```
Open the `ContributionDetail` table. Filter by `unitId` and look for the month.

Option B (Read the service):
Open `contributions-reports.service.ts`. Find `getPaidUnpaidMatrixReport`. Find the code that builds the `paidByUnitMonth` lookup map. Understand: what query populates this map? What key is used?

### Step 14: Add a `refMonth` Filter to the Matrix

The matrix report currently does not accept a `refMonth` filter — it always shows all months for the selected year.

**Thought experiment (no code change required):**
If you wanted to add a "starting month" filter to hide months before a certain month from the grid, where would you add it?

1. Which function would need a new parameter?
2. Which type definition would need updating?
3. Would the route handler change?
4. Would the UI page change?

Write your answers in a comment or a note. There is no right or wrong answer — the goal is to trace the full path from URL param → service → UI.

### Step 15: Read `formatCsvValue`

Open `contributions-reports.service.ts`. Find `formatCsvValue`. 

Write three test cases mentally:
- Input: `"hello"` → Expected output: `"hello"` (no change)
- Input: `"Smith, John"` → Expected output: `'"Smith, John"'` (wrapped in quotes)
- Input: `'She said "hi"'` → Expected output: `'"She said ""hi"""'` (quotes doubled)

If you want to verify: write a quick Node.js script or use the browser console to test the function.

---

## Part 5 — Reflection Questions

Answer these after completing the hands-on steps:

1. What is the grain of the Transactions report? (One row = one ___?)
2. Why does `db.$transaction([...])` not use `skip`/`take` on the total queries?
3. What does `pageSize: Number.MAX_SAFE_INTEGER` do in the CSV export? Why is this safe?
4. How does the matrix distinguish between a MONTH-type head and a YEAR-type head?
5. What would happen if `formatCsvValue` was not applied to a field containing a comma?
6. If you refresh the browser while on the matrix report with filters set, are the filters preserved? Why?

---

## Definition of Done for This Exercise

- [ ] Ran both reports with filters and confirmed URL state works
- [ ] Exported at least one CSV and identified the metadata block in a text editor
- [ ] Opened the service and identified: the 5-query `db.$transaction`, the `paidByUnitMonth` map, `formatCsvValue`, `roundTo2`
- [ ] Answered at least 4 of the 6 reflection questions
