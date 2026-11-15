# Playlist B · Episode 7 — "Proving It Works: Testing a Real Workflow"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Verification & Ops (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show that testing a rule-heavy system means testing real
  end-to-end behavior against a real database and real HTTP calls, not just unit
  tests of pure functions — and why that's a deliberate choice here.
- **Title options:**
  1. Proving It Works: Testing a Real Workflow
  2. Unit Tests Won't Catch This Bug. Here's What Will.
  3. Testing Business Rules, Not Just Functions
- **Thumbnail concept:** A checklist with items like "no overlap," "no duplicate
  payment," "reopen window," each getting a green checkmark from an automated script.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A unit test can tell you a function returns the right number. It can't tell you
> that two concurrent requests can't both sneak past your overlap check. Today: how
> this project tests the rules that actually matter, at the level where they can
> actually fail."

---

## Scene 1 — What a rule-heavy system needs from its tests (0:20–1:30)

**Visual:** Diagram: a pyramid with "unit tests" at the base, but a callout arrow
pointing to a wide band near the top labeled "workflow / integration tests — where
this project's real risk lives."

**Narration:**
> "Plenty of this codebase is unit-testable in the normal sense — a pure function
> that computes a payable amount, say. But the rules that actually cause incidents
> in production — no overlapping ownership, no duplicate payment, a reopen window
> that actually expires — only fail at the level of a real request hitting a real
> database under real conditions. Testing only the small pure functions and skipping
> this level gives you a false sense of safety."

---

## Scene 2 — Boot a real server, make real requests (1:30–2:50)

**Visual:** Screen recording — `scripts/test-timelines-api.mjs` opened in the
editor, scrolled to the top: spinning up the app on a test port, creating a Prisma
client against the real test database, then issuing real `fetch` calls.

**Narration:**
> "Here's the actual shape of these tests. This script starts the real Next.js
> server on its own port, connects a real Prisma client to a real Postgres database,
> and then does exactly what a browser would do: sends real HTTP requests to real
> endpoints, with a real authenticated session. It's slower than a unit test. It's
> also testing the thing that actually matters — the full path from request to
> database constraint and back — not a simulation of it."

---

## Scene 3 — Writing the test as the rule itself (2:50–4:00)

**Visual:** Screen recording — a specific assertion in the test file, e.g.
attempting to create an overlapping ownership record and asserting a `409 CONFLICT`
status.

**Narration:**
> "Look at how directly a test maps to a domain rule. Rule O3 says a unit can't have
> two active owners. The test creates one ownership record, then tries to create a
> second one that overlaps it, and asserts the response is a `409`. That's it — the
> test reads almost like the rule itself, translated into a request and an
> assertion. If someone weakens the underlying check later, this test fails
> immediately and specifically, not with a vague 'something broke.'"

---

## Scene 4 — Regression coverage as a living contract (4:00–5:00)

**Visual:** Screen recording — `package.json` scripts section showing
`test:api:timelines`, `test:api:contribution-rates`, `test:api:contributions`,
`test:api:reports` as named, runnable commands.

**Narration:**
> "These aren't one-off scripts someone ran once and forgot — they're named,
> documented commands anyone on the project can run before trusting a change:
> timelines, contribution rates, contributions, reports. Each one is a regression
> suite for exactly the rules we've covered in earlier episodes. When a rule changes
> — say, the reopen window moves from 48 hours to 72 — the test for it has to change
> too, in the same commit. The test suite and the domain rules document stay
> honest about each other."

---

## Scene 5 — What this doesn't replace (5:00–5:50)

**Visual:** Talking head.

**Narration:**
> "This style of testing is deliberately heavier than pure unit tests, and it isn't
> meant to replace them — small pure functions still deserve small, fast unit tests.
> But for a system whose real risk lives in concurrency, database constraints, and
> multi-step workflows, pretending a mocked-out unit test proves correctness is the
> mistake. Test at the level where the rule can actually break."

---

## Outro / CTA (5:50–6:20)

**Visual:** End card pointing to Episode B8.

**Narration:**
> "Last episode in this playlist's first pass: getting this from your machine to
> production, and the trade-offs this project made deliberately instead of by
> accident. Subscribe and I'll see you there."

---

## Production Notes

- **Screen recordings needed:** `scripts/test-timelines-api.mjs` (server boot +
  Prisma client + fetch calls), one specific overlap-rejection assertion, and the
  `package.json` `scripts` block showing the named `test:api:*` commands. A live
  terminal run of one script showing pass/fail output is strong material here.
- **Diagrams needed:** test-pyramid-with-callout graphic for Scene 1.
- **Source material to reuse:** `scripts/test-timelines-api.mjs`,
  `scripts/test-contribution-rates-api.mjs`, `scripts/test-contributions-api.mjs`,
  `scripts/test-reports-api.mjs`; repo memory note on `prismapp-master-data-ui.md`
  which records that `test-timelines-api.mjs` was recently modernized to the current
  ownership model — useful as a real "the tests caught this" anecdote if time
  allows.
- **Fact check before recording:** run `npm run test:api:timelines` live before
  recording to confirm it currently passes, and capture the real terminal output for
  Scene 2/4 rather than a mocked-up console.
