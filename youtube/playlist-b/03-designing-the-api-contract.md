# Playlist B · Episode 3 — "Designing the API Contract Before Writing Code"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Design & Contracts (1 of 3)
- **Target length:** 7–9 minutes
- **Primary goal:** Show API contract design — response envelopes, error codes,
  pagination — as something decided deliberately, up front, and reused everywhere,
  rather than improvised per endpoint.
- **Title options:**
  1. Designing the API Contract Before Writing Code
  2. One Envelope, Every Endpoint — Why Consistency Is an API Feature
  3. The API Decisions You Should Make Before Endpoint #1
- **Thumbnail concept:** Dozens of small "endpoint" boxes all feeding into one
  labeled envelope shape: `{ ok, data | error }`.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Here is a test. Open any two endpoints in a real API that you did not design.
>
> Do the errors look the same? Is the pagination the same shape?
>
> If the answer is no, every screen that uses that API needs custom handling.
>
> Today, we look at the fix. Decide the contract once, before writing a single endpoint."

---

## Scene 1 — One envelope for every response (0:20–1:40)

**Visual:** Screen recording — `vault/03-API/Error-Model.md`, showing the success
envelope `{ ok: true, data }` and error envelope `{ ok: false, error: { code,
message, details, requestId } }` side by side.

**Narration:**
> "Every API response in this app, success or failure, has the same top-level shape.
>
> It has an `ok` boolean. Then it has either a `data` payload or an `error` object.
>
> That one decision means every client component can check one field to know which path it is on. There is no guessing. An error does not come back as a 200 with an error field, or a thrown exception, or an empty array.
>
> This looks like a small thing. It stops looking small when you write the fortieth screen that uses it."

---

## Scene 2 — A stable vocabulary for failure (1:40–3:00)

**Visual:** Screen recording — the Error Code Catalog table (`VALIDATION_ERROR`,
`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PRECONDITION_FAILED`, etc.)
with HTTP status column visible.

**Narration:**
> "Errors get a small, fixed vocabulary of machine-readable codes. Each code maps to a specific HTTP status.
>
> `CONFLICT` is for a duplicate contribution or an overlapping ownership period.
>
> `PRECONDITION_FAILED` is for trying to edit an immutable financial record.
>
> Notice that these codes map to domain rules, not to database exceptions. A Prisma unique-constraint violation and a business-rule violation might both appear as `CONFLICT`.
>
> That mapping is intentional and documented. It is not whatever string the ORM happened to throw."

---

## Scene 3 — Deciding pagination once, everywhere (3:00–4:20)

**Visual:** Screen recording — `vault/03-API/Pagination-and-Filtering.md` query
contract (`page`, `pageSize`, `sortBy`, `sortDir`, `q`) and response contract
(`items`, `page`, `totalItems`, `hasNext`, `hasPrev`).

**Narration:**
> "We apply the same idea to lists.
>
> Every list endpoint takes the same query parameters and returns the same response shape. This includes blocks, units, contributions, and complaints.
>
> An unknown sort field or an oversized page size returns the same `VALIDATION_ERROR` everywhere.
>
> This is what lets a shared pagination component exist in the frontend. If every module invented its own paging shape, there would be no shared component. There would be eight slightly different copies of one."

---

## Scene 4 — What the contract deliberately hides (4:20–5:20)

**Visual:** Screen recording — the PII-masking example from the Error Model
(`email: "r***@example.com"`).

**Narration:**
> "A good API contract also decides what it refuses to expose.
>
> A read-only user can see an individual's record. But they cannot see the full email or mobile number.
>
> That is not an authorization failure. It is a masking policy, applied to an otherwise successful response.
>
> We decide this at the contract level, once. So no individual endpoint has to remember to mask a field. It is a rule about the shape of the response, applied consistently."

---

## Scene 5 — Designing the contract before the endpoint (5:20–6:40)

**Visual:** Talking head, with the vault files visible in a small inset.

**Narration:**
> "Here is the sequence that matters. These documents existed before most endpoints were built, not after.
>
> That order is the whole point of API design as a discipline.
>
> You decide the envelope, the error codes, and the pagination shape once. You write them down. Then every endpoint after that is a straightforward implementation task, not a fresh design decision.
>
> Skip this step, and you will later reverse-engineer a contract from forty inconsistent endpoints. That is a much worse way to spend a week."

---

## Outro / CTA (6:40–7:10)

**Visual:** End card pointing to Episode B4.

**Narration:**
> "Next episode, we ask who is allowed to call these endpoints in the first place.
>
> We will cover authentication, authorization, and the permission matrix behind every `403`.
>
> Subscribe if this kind of decision-first engineering is useful to you."

---

## Production Notes

- **Screen recordings needed:** `vault/03-API/Error-Model.md` (envelope + code
  catalog + PII masking example), `vault/03-API/Pagination-and-Filtering.md` (query
  and response contract tables). Optionally a live browser dev-tools capture of one
  real success response and one real error response for a side-by-side.
- **Diagrams needed:** "many endpoints → one envelope" funnel graphic for the cold
  open/thumbnail.
- **Source material to reuse:** `vault/03-API/Error-Model.md`,
  `vault/03-API/Pagination-and-Filtering.md`, `vault/03-API/API-Spec.md` for any
  overall contract framing not already covered.
- **Fact check before recording:** capture one real request/response pair from the
  running app (e.g. `/api/blocks`) to confirm the current implementation matches the
  documented envelope exactly, since this episode asserts the contract is followed
  everywhere.
