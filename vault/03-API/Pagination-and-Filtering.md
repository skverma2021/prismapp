# Pagination and Filtering

Status: Draft (V1)
Owner: Engineering + Product
Last Updated: 2026-03-19

## Purpose
Define one consistent contract for list endpoints, report endpoints, and server-side table queries.

## Query Contract (V1)
Use these query params for all list APIs:
- `page` (1-based, default `1`)
- `pageSize` (default `20`, max `100`)
- `sortBy` (field name)
- `sortDir` (`asc` or `desc`)
- `q` (free-text search)
- field filters (for example `blockId`, `refYear`, `headId`)

## Response Contract (V1)

```json
{
  "ok": true,
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrev": false
  }
}
```

## Defaults and Limits
1. Default sort must be deterministic (usually `createdAt desc` or stable business key).
2. Maximum `pageSize` is 100.
3. If `pageSize` exceeds max, return `VALIDATION_ERROR`.
4. Unknown sort fields return `VALIDATION_ERROR`.

## Search and Filter Rules
1. `q` performs case-insensitive partial match on approved columns only.
2. Filters combine using logical AND.
3. Multi-value filters use comma-separated values or repeated query params.
4. Date filters must support `from` and `to` boundaries.

## Suggested V1 Filter Map

### Blocks
- `q` on block description.

### Units
- `blockId`
- `q` on unit description.

### Individuals
- `q` on first name, surname, email, mobile.
- `genderId`

### Ownership / Residency
- `unitId`
- `indId`
- `activeOnly` (`true|false`)

### Contributions
- `unitId`
- `headId`
- `refYear`
- `refMonth`
- `depositedBy`
- `transactionDateFrom`
- `transactionDateTo`

## Sorting Recommendations
- Units: `description asc`
- Individuals: `sName asc, fName asc`
- Contributions: `transactionDateTime desc, id desc`

## Performance Guidelines
1. Add indexes for common sort/filter fields.
2. Avoid unbounded queries.
3. Return only columns needed for list view.
4. For large reports, support export endpoints separately.

## Reusable Template Notes
For other projects, keep the same query and response shape to reduce frontend churn.
