# Playlist F · Episode 4 — "Reviewing AI Output and Catching Wrong Assumptions"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development
- **Case-study app:** PrismApp
- **Sub-arc:** Implementation and Catching What AI Gets Wrong (2 of 2)
- **Target length:** 7–9 minutes
- **Primary goal:** Show real, verifiable examples — from this very channel's
  own production — of assumptions that turned out to be wrong, and how they
  were caught by checking against the actual codebase instead of trusting a
  plausible-sounding claim.
- **Title options:**
  1. Reviewing AI Output and Catching Wrong Assumptions
  2. "That Sounds Right" Is Not the Same as "That Is Right"
  3. Three Times a Confident Assumption Was Wrong — Caught on Camera
- **Thumbnail concept:** A red pen circling one wrong item on an otherwise
  clean-looking checklist.
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "Every example in this episode is real. Two of them happened while making *this exact channel*.
>
> Reviewing AI output is not a theoretical skill here. It kept several confidently wrong claims out of the videos that you would otherwise be watching right now."

---

## Scene 1 — A documented, AI-assisted security review (0:25–2:00)

**Visual:** Open `vault/00-Core/OWASP-Top10-Gap-Review.md`, the header and the
A01 finding.

**Code shown:**
```markdown
**Reviewer:** Engineering (AI-assisted formal pass, Track-A item 2.7)

## A01:2021 — Broken Access Control

**Finding: PASS with one open gap**
...
Open gap:
- A01-GAP-1: No resource-level ownership check. Any authenticated user with a
  mutation role can edit any block, unit, or individual record. For a
  single-society app this is acceptable, but it is a design assumption that
  must be documented.
```

**Narration:**
> "This document states its own method in the header. An AI-assisted formal pass.
>
> And look at what a *good* AI-assisted review produces. It is not a blanket 'everything is fine.' It is a specific, named gap. It also gives an honest judgment about whether the gap matters right now.
>
> The review did not only find a gap. A human decided what to do about it. Document it, and do not silently patch around it."

---

## Scene 2 — A topic list that assumed a dependency that doesn't exist (2:00–3:30)

**Visual:** A grep result across `package.json` for `zod` — no matches.

**Narration:**
> "Here is one from this channel's own production.
>
> This project's planning document listed 'runtime validation versus compile-time typing' as a TypeScript topic.
> It is reasonable to expect a Next.js app to use a schema library like Zod for that. But this project does not.
> A grep across `package.json` turns up nothing.
>
> The actual pattern is a hand-written set of parser functions. They take `unknown` in, and they give typed values out. It is a real, working answer. It is just not the one a plausible assumption would have guessed.
>
> So the script for that episode had to be rewritten. It follows what the code actually does, not what a typical Next.js app usually does."

---

## Scene 3 — A topic that assumed a SQL feature that isn't there (3:30–4:45)

**Visual:** A grep result for `OVER (PARTITION BY` / window function syntax
across `src/` and `app/` — no matches.

**Narration:**
> "It is the same story in a different playlist.
>
> The plan for the PostgreSQL playlist listed window functions as a likely topic. That is reasonable for a reporting-heavy app. But a grep across the entire codebase found none.
>
> So that episode did not force an example that does not exist. It said so directly. It reframed the topic honestly: 'the point where you would reach for one, which has not arrived yet.'
>
> The discipline here is not cleverness. It is refusing to state a claim before checking it against the actual repository."

---

## Scene 4 — Catching a small one, live, in the last episode (4:45–5:45)

**Visual:** Show the corrected line in `youtube/README.md` — "39 videos,"
with a note that it previously (incorrectly) read "40."

**Narration:**
> "The smallest example comes from the last piece of work before this one.
>
> A video count added up wrong. One trailer plus six plus four sets of eight is thirty-nine, not forty.
>
> Nobody caught it until the count was re-added by hand, on screen.
>
> It is a tiny error. That is exactly why it is a good example. The habit of re-checking arithmetic matters even when the mistake is not dramatic."

---

## Scene 5 — The pattern across all four (5:45–7:00)

**Visual:** Four small cards on screen: OWASP gap, missing Zod, missing window
functions, video-count error — each with a checkmark labeled "caught before
publishing."

**Narration:**
> "None of these were caught by asking AI to double-check itself.
>
> They were caught by checking the *artifact* against the claim. The actual `package.json`. The actual codebase. The actual arithmetic.
>
> That is the one skill you can take from this whole episode.
>
> Do not review the explanation. Review the thing the explanation is about."

---

## Outro / CTA (7:00–7:30)

**Visual:** End card, next-episode pointer.

**Narration:**
> "Reviewing what already exists is one half of working safely with AI.
>
> The other half is asking it to explain code you do not understand yet.
>
> That is next."

---

## Production Notes

- **Screen recordings needed:** `vault/00-Core/OWASP-Top10-Gap-Review.md`
  (header + A01 finding); a grep for `zod` across `package.json` (no matches);
  a grep for window-function syntax across `src/`/`app/` (no matches); the
  corrected video-count line in `youtube/README.md`.
- **Source material:** files/greps above, verified directly against the
  repository at recording time, not asserted from memory.
- **B-roll:** none required.
- **Fact-check note:** the Zod-absence and window-function-absence claims were
  originally verified via grep during Playlist C and D production; re-verify
  before recording in case dependencies have since changed.
