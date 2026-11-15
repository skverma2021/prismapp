# Slide Script — F-05: CSV Export

---

## Slide 1 — The CSV Export Contract

**Type:** `Concept`

**Headline:**
> A CSV export is a full-dataset report snapshot — with filters echoed and generation metadata embedded.

**Visual / layout:**
Example CSV file (text block) showing:
```
reportTitle,"Contribution Transactions"
generatedAt,"2024-11-15T10:32:00.000Z"
generatedBy,"usr_admin1"
generatedByRole,"SOCIETY_ADMIN"
filter.refYear,2024
filter.headId,3
rowCount,142

contributionId,transactionId,transactionDateTime,...
1001,TXN-2024-001,...
```
Callout: "Metadata block" → blank line → "Column headers" → "Data rows"

**Narration:**
Both reports support CSV export. The format is self-contained.

Anyone who opens the CSV file months later should be able to tell exactly what it represents.

The CSV file has four sections, in order.

**1. Metadata block.** These are key-value pairs, one per line, that describe the report:
- `reportTitle` says which report this is.
- `generatedAt` is the ISO timestamp of when the export was created.
- `generatedBy` is the user ID of the person who exported.
- `generatedByRole` is their role at the time of export.
- `filter.*` lines are one line per active filter. Only filters that were actually applied appear. Null or undefined filters are omitted.
- `rowCount` says how many data rows follow.

**2. Blank line.** It separates metadata from data. It makes the split clear in a text editor.

**3. Column header row.** These are standard CSV headers.

**4. Data rows.** There is one row per `ContributionDetail`, or per matrix row.

This format is intentional. It satisfies audit requirements. Anyone can open the file and know which period, which head, and which user generated it.

It also helps when you compare multiple CSVs. The metadata makes filter differences immediately visible.

**On-screen action / demo:**
Run the transactions report in the app with some filters applied. Click "Export CSV". Open the downloaded file in a text editor. Point out each section.

**Key takeaway:**
CSV exports are self-describing. Metadata rows come first, then a blank line, then column headers, then data.

---

## Slide 2 — How Export Reuses the Service

**Type:** `Code`

**Headline:**
> CSV export is not a separate code path. It calls the same service function with `pageSize: Number.MAX_SAFE_INTEGER`.

**Visual / layout:**
Code block: `getContributionTransactionsCsv` calling `getContributionTransactionsReport` with `pageSize: Number.MAX_SAFE_INTEGER`. Arrow: "Same function — just without pagination".

**Narration:**
The CSV export does not have a parallel implementation. It calls the same service function that the JSON report calls:

```ts
export async function getContributionTransactionsCsv(
  params: TransactionsReportParams,
  actor: AuthContext
): Promise<string> {
  const data = await getContributionTransactionsReport({
    ...params,
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
    sortBy: "transactionDateTime",
    sortDir: "desc",
  });
  // ... build CSV string
}
```

Three things change:
1. `page: 1` means always start at the first page.
2. `pageSize: Number.MAX_SAFE_INTEGER` fetches all rows. This bypasses the 100-row page cap that the normal API enforces.
3. `sortBy` and `sortDir` are reset to a canonical sort, most recent first. This ignores whatever sort the user had in the UI.

Why is this safe? The CSV function is internal. It is only called from the server-side route handler, which has already authenticated the user.

The `pageSize` limit in `parseTransactionsReportParams` exists to stop external clients from requesting huge pages. The CSV function bypasses it intentionally.

After getting all data, the function iterates `data.items`. It builds the CSV string using `lines.push(...)` and `lines.join("\n")`.

**On-screen action / demo:**
Open `getContributionTransactionsCsv` in the service. Show the call to `getContributionTransactionsReport` with `pageSize: Number.MAX_SAFE_INTEGER`. Scroll down to show `lines.push(header.join(","))` and the data row loop.

**Key takeaway:**
CSV export = same service function + no pagination. `Number.MAX_SAFE_INTEGER` is used intentionally to bypass the page cap.

---

## Slide 3 — `formatCsvValue` and Injection Prevention

**Type:** `Code`

**Headline:**
> Every value written to a CSV must be escaped. `formatCsvValue` handles the cases that would break parsing.

**Visual / layout:**
Table: input value → output. Examples: plain string `"hello"` → `hello`; string with comma `"Smith, John"` → `"Smith, John"`; string with newline → `"Smith\nJohn"` (wrapped); string with quote `'She said "hello"'` → `"She said ""hello"""`.

**Narration:**
CSV has no official standard, but people widely follow informal rules.

The most important rule is this. If a value contains a comma, a newline, or a double-quote character, wrap it in double quotes.

If it contains a double-quote, escape that character as two consecutive double-quotes.

The service uses `formatCsvValue`:

```ts
function formatCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
```

This handles four cases:
- `null` or `undefined` becomes an empty string, so there is no crash.
- Commas are wrapped in quotes, so the value does not break column alignment.
- Newlines are wrapped in quotes. Multi-line cells are valid CSV.
- Double quotes inside the value are doubled (`""`).

Without this function, a field like a unit description with a comma would break. An example is `"Tower A, Wing 1"`. It would split into two columns in Excel.

Reason names and correction text could contain commas or quotes. Those fields appear in the CSV.

**On-screen action / demo:**
Open `formatCsvValue` in the service. Run a CSV export where one of the fields contains a comma (e.g., search by a head description that has a comma). Open the CSV and show the quoted value.

**Key takeaway:**
`formatCsvValue` is applied to every value in every row. It prevents malformed CSV and is the only defense against user-controlled text breaking the file structure.

---

## Slide 4 — The CSV Route Handler and Browser Download

**Type:** `Code`

**Headline:**
> The CSV route handler returns a `Response` with `Content-Disposition: attachment`. The browser handles the download.

**Visual / layout:**
Code block: the CSV route handler. Arrow from `new Response(csv, {...})` to a browser download dialog.

**Narration:**
The CSV route handler is slightly different from the JSON route handler. It does not use `return ok(data)`. Instead, it returns:

```ts
return new Response(csv, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="transactions-${params.refYear}.csv"`,
  },
});
```

`Content-Type: text/csv` tells the browser what kind of file it is.  
`Content-Disposition: attachment` tells the browser to download the file rather than display it. The `filename=` hint suggests a default filename.

On the UI side, the export button does not use a normal `<a href="...">`. It uses a programmatic fetch:

```ts
const res = await fetch(url);
const blob = await res.blob();
const objUrl = URL.createObjectURL(blob);
const anchor = document.createElement("a");
anchor.href = objUrl;
anchor.download = filename;
anchor.click();
URL.revokeObjectURL(objUrl);
```

We use this pattern because the URL must include the filter parameters as query params. They must match the current filter state.

A static `href` link would not include the current filter values.

**On-screen action / demo:**
Open `app/api/reports/contributions/transactions.csv/route.ts`. Show the `new Response(csv, {...})` call. Then open the transactions UI page and show the `exportCsv` function.

**Key takeaway:**
CSV download = `new Response` with `text/csv` + `attachment` disposition. Browser handles the save dialog. UI creates a blob URL programmatically to include current filters.
