# How to Read the Vault

**Audience:** Developers implementing new features or debugging business logic.  
**Purpose:** Explain what the `vault/` folder is, what each document means, and how to use it during development.

---

## Slide 1 — What the vault is

**Headline:** The vault is the spec. The code is the implementation of the spec.

**Talking points:**
- `vault/` contains business rules, entity definitions, API contracts, and architecture decisions — none of which belong in code comments.
- It is not auto-generated from the code. It is edited by architects and product owners when domain decisions are made.
- When the vault and the code disagree, the vault wins. Fix the code, not the vault (unless you are raising an Architecture Decision Record to change the policy).
- The vault is written in Markdown and lives in version control alongside the code so it stays in sync.

**Visual:** Diagram with two columns: `vault/` (policy/rules) on the left, `src/` + `app/` + `prisma/` (implementation) on the right. Arrow labelled "implements" pointing right. Arrow labelled "conflict → fix code" pointing left.

**Key takeaway:** Read the relevant vault document before writing business logic — not after.

---

## Slide 2 — The five key documents and their priority

**Headline:** When specs conflict, a priority order resolves the ambiguity.

**Talking points:**

The source of truth priority from `AGENTS.md` (highest to lowest):

| Priority | File | What it defines |
|----------|------|----------------|
| 1 | `vault/01-Domain/Domain-Rules.md` | Business rules: ownership, residency, contribution formulas, immutability |
| 2 | `vault/01-Domain/ERD.md` | Entity relationships, cardinality, field types |
| 3 | `vault/01-Domain/Entities.md` | Each entity explained in business terms with examples |
| 4 | `vault/03-API/API-Spec.md` | Endpoint contracts: URL, method, request/response shape |
| 5 | `vault/00-Core/System-Overview.md` | High-level purpose, scope, and module inventory |

**Supporting documents** (specialised detail):
- `vault/03-API/Error-Model.md` — error envelope format, HTTP status mapping, PII masking rules
- `vault/03-API/Pagination-and-Filtering.md` — how pagination, sorting, and filter parameters work
- `vault/04-Reports/Contribution-Reports.md` — report column specs, filter requirements, CSV format
- `vault/00-Core/Roles-and-Permissions.md` — role definitions (`SOCIETY_ADMIN`, `MANAGER`, `READ_ONLY`), what each can do
- `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md` — why posted contributions cannot be edited and how corrections work

**Visual:** Stack diagram with `Domain-Rules.md` at the top in a bold box, then ERD, Entities, API-Spec, System-Overview beneath it. The word "WINS" on top box. "loses" at the bottom.

**Key takeaway:** If `Domain-Rules.md` says something is forbidden, it is forbidden regardless of what the API spec or UI design implies.

---

## Slide 3 — How to use the vault while coding

**Headline:** The vault is a reference, not a document to read once and forget.

**Talking points:**

**Before writing any business logic:**
1. Open `vault/01-Domain/Domain-Rules.md`.
2. Find the section for the entity you are working on (Ownership rules O1–O8, Residency rules R1–R6, Contribution rules 1–5).
3. Write the rule reference as a comment in the service, e.g. `// O3: at most one active owner per unit`.
4. Make the code enforce what the rule says.

**Before writing an API route handler:**
1. Check `vault/03-API/API-Spec.md` for the endpoint contract (URL, query params, request body, response shape).
2. Check `vault/03-API/Error-Model.md` for the correct error code and HTTP status when validation fails.
3. Check `vault/03-API/Pagination-and-Filtering.md` if the endpoint is a list with filters.

**Before writing a report:**
1. Open `vault/04-Reports/Contribution-Reports.md` for the exact column names, filter parameters, and CSV format spec.

**Before adding a role check:**
1. Open `vault/00-Core/Roles-and-Permissions.md` to confirm which roles can perform the action.

**When something seems wrong in the code but you are not sure:**
1. Check `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md` — some things that look like bugs are intentional policy decisions.

**Visual:** A simple flowchart: "I need to implement X" → "Which entity? → Domain-Rules.md" / "Which API? → API-Spec.md" / "Which report? → Contribution-Reports.md" / "Which role? → Roles-and-Permissions.md".

**Key takeaway:** The vault saves debugging time. Referencing it before coding prevents domain violations from reaching code review.
