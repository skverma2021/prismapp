# Playlist B · Episode 5 — "Validation at the Boundary"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Design & Contracts (3 of 3)
- **Target length:** 6–7 minutes
- **Primary goal:** Explain why input validation happens at the server boundary
  regardless of client-side checks, and how it connects to the error contract from
  Episode B3.
- **Title options:**
  1. Validation at the Boundary
  2. Never Trust a Request, Even Your Own Frontend's
  3. Where Validation Actually Belongs
- **Thumbnail concept:** A castle-gate graphic labeled "Server Boundary" with a form
  submission being stopped and inspected before it's let through.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Here is an uncomfortable fact. The frontend you wrote is not a security boundary.
>
> Anyone can skip it entirely and send whatever they want straight to your API.
>
> So where does validation actually have to live?
>
> Today, we look at the boundary."

---

## Scene 1 — Two different jobs, both called "validation" (0:20–1:30)

**Visual:** Diagram: a form on the left labeled "UX validation — helpful, skippable,"
an arrow to a server gate on the right labeled "Boundary validation — mandatory,
authoritative."

**Narration:**
> "Client-side validation is useful. It gives instant feedback, needs no round trip, and makes a better experience.
>
> But it is UX, not security. It runs in code the user controls, in a browser the user controls.
>
> The validation that protects the system runs again, unconditionally, when a request lands on the server. It runs before authorization. And it runs before any business logic touches the request.
>
> If the server does not check it, it is not checked."

---

## Scene 2 — What gets validated, concretely (1:30–2:50)

**Visual:** Screen recording — an example schema-style validation for a request
body (e.g. creating an ownership record: `unitId` positive integer, `individualId`
positive integer, `fromDt` a valid date, `toDt` nullable date).

**Narration:**
> "Boundary validation checks shape first. Is this a number where a number is expected? Is this a real date? Is this field present at all?
>
> That is the cheap, mechanical layer. We reject garbage before it costs a database round trip.
>
> Business rule validation is a separate, more expensive layer. It comes after. For example, does this date range overlap an existing ownership record?
>
> Both are 'validation.' But they run at different costs and at different points in the request.
>
> It is worth keeping that distinction explicit, instead of putting every check into one function."

---

## Scene 3 — Turning a validation failure into a useful error (2:50–4:00)

**Visual:** Screen recording — `vault/03-API/Error-Model.md` "Validation Error
Details" example showing per-field `details` array (`fromDt`, `toDt` reasons).

**Narration:**
> "Here, validation connects back to the API contract from a few episodes ago.
>
> A validation failure does not just return 'bad request.' It returns `VALIDATION_ERROR` with a `details` array. The array names the exact fields and reasons. For example, `fromDt` must be less than or equal to `toDt`.
>
> That precision lets a form show the error next to the field that is wrong. The user does not have to guess from a generic banner."

---

## Scene 4 — Validation failing safe, not open (4:00–4:50)

**Visual:** Screen recording — a request missing a required field, showing a
`400 VALIDATION_ERROR` rather than the request silently proceeding with a default
or `null`.

**Narration:**
> "Here is one more principle. When input is ambiguous or incomplete, the system fails the request. It does not guess a default.
>
> It would be easy to let a missing `toDt` quietly become `null` and move on.
>
> But for an ownership record, a `null` `toDt` has a specific meaning. It means 'currently active.'
>
> Silently turning a missing field into a meaningful value is exactly how subtle data corruption happens.
>
> So we reject it, and we make the caller be explicit."

---

## Scene 5 — Why this is an engineering decision, not a library choice (4:50–5:40)

**Visual:** Talking head.

**Narration:**
> "It is tempting to think 'validation' just means picking a library and writing some schemas.
>
> The real engineering decision comes before that. You decide what 'valid' means for each field, using the rules from earlier episodes. And you decide to fail loudly and specifically, instead of guessing.
>
> The library is only the tool that expresses a decision you already had to make."

---

## Outro / CTA (5:40–6:10)

**Visual:** End card pointing to Episode B6.

**Narration:**
> "Next time, we look at a decision that goes further than validation.
>
> Some records, once written, can never be changed at all. We will see why that is sometimes the safest possible design.
>
> Subscribe, and I will see you there."

---

## Production Notes

- **Screen recordings needed:** an example validation schema for a real endpoint
  (ownership create is a good candidate given its date-range rules); a live rejected
  request with a `VALIDATION_ERROR` + field-level `details` response; a live example
  of a missing-field request being rejected rather than defaulted.
- **Diagrams needed:** UX-validation-vs-boundary-validation split diagram.
- **Source material to reuse:** `vault/03-API/Error-Model.md` "Validation Error
  Details" section; `AGENTS.md` section 8 (coding process) mention of shared Zod
  validation; confirm actual validation library/location in `src/lib/` or
  `src/modules/*/` before recording so the schema shown on screen is real code, not
  a paraphrase.
- **Fact check before recording:** identify one real Zod (or equivalent) schema in
  the codebase for Scene 2 and Scene 3 so the on-screen example is authentic rather
  than illustrative pseudo-code.
