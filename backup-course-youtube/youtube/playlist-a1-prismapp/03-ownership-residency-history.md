# Playlist A1 · PrismApp — Episode 3 — "Ownership & Residency: Why History Matters"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** 6–8 minutes
- **Primary goal:** Show why temporal integrity (no overlaps, no gaps) is a real
  engineering problem, and introduce the `BUILDER_INVENTORY` system identity as the
  elegant fix for "who owns a brand-new unit."
- **Title options:**
  1. Ownership & Residency: Why History Matters
  2. Who Owns a Flat Before It's Ever Sold?
  3. The Hardest Rule in This App: No Gaps, No Overlaps
- **Thumbnail concept:** A timeline bar graphic with a visible "gap" highlighted in
  red, crossed out, next to a clean unbroken timeline in green.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head, with a small on-screen timeline graphic showing a gap.

**Narration:**
> "A brand-new flat, fresh from the builder — nobody's bought it yet. So who owns it?
> If your answer is 'nobody, for now,' this episode is for you, because in this
> system, that answer isn't allowed."

---

## Scene 1 — The rule: exactly one active owner, always (0:20–1:20)

**Visual:** On-screen rule card: "O3 — A unit cannot have more than one active owner
at any time. O4 — A unit must always have exactly one active owner."

**Narration:**
> "Two rules drive this whole episode. First: a unit can never have two active
> owners at once — that would mean two people simultaneously hold title to the same
> flat, which doesn't make sense. Second, and less obvious: a unit must *always* have
> exactly one active owner — no gaps, not even for a single day, not even before it's
> ever been sold. Most systems only think about the first rule. The second one is
> where it gets interesting."

---

## Scene 2 — The builder inventory trick (1:20–2:40)

**Visual:** Diagram: a unit's timeline starting at `inceptionDt`, first segment
labeled "BUILDER_INVENTORY", second segment labeled with a real buyer's name.

**Narration:**
> "Before any real owner exists, someone still effectively holds the unit — the
> builder. So the system creates a system identity called `BUILDER_INVENTORY` and
> makes it the owner of record from the exact date the unit is created — its
> `inceptionDt`. It's not a real person, it can't be picked as a resident, and it
> can't be removed. It exists purely so the ownership timeline never has a hole in
> it. The moment a unit is created, its first ownership row is created in the same
> atomic operation — there's no window, even a split second, where the unit has no
> owner."

**On-screen action:** Screen recording — create a new unit in the app, then
immediately open its ownership timeline and show the `BUILDER_INVENTORY` row already
present.

---

## Scene 3 — Transfers: contiguous, not just non-overlapping (2:40–3:50)

**Visual:** Timeline diagram: owner A ends on day N, owner B starts on day N+1 — no
gap, no overlap, a single shared boundary.

**Narration:**
> "When a unit actually sells, the transfer isn't just 'add a new owner and end the
> old one whenever.' The outgoing owner's end date and the incoming owner's start
> date have to be exactly contiguous — the new owner starts the very next day after
> the old one ends. That's stricter than just 'don't overlap.' It also forbids gaps.
> If someone tried to record a transfer that left a three-day hole, the system
> rejects it, because that would leave three days where nobody legally owned the
> flat."

---

## Scene 4 — Watching the rejection happen (3:50–4:50)

**Visual:** Screen recording — attempt to create an ownership record with a start
date that overlaps an existing active ownership; show the red error notice.

**Narration:**
> "Here's what that looks like in practice. I'll try to backdate a new owner into a
> period that's already covered by someone else. The system doesn't just show a
> polite warning — it rejects the write outright, and it does this check inside a
> serializable database transaction, not just a client-side validation. That matters
> because two people could try to submit conflicting ownership changes at almost the
> exact same moment — a simple 'check then write' in application code can miss that
> race. A serializable transaction can't."

---

## Scene 5 — Residency plays by looser rules, on purpose (4:50–6:00)

**Visual:** Split diagram — ownership timeline with no gaps allowed; residency
timeline with a visible gap labeled "vacant".

**Narration:**
> "Residency looks similar but isn't identical. A unit can have zero or one active
> resident — gaps are fine, because a flat can sit vacant between a sale and a new
> tenant moving in, or during renovation. There's also one rule that connects
> ownership and residency directly: nobody can move in while the unit is still owned
> by `BUILDER_INVENTORY`. Residency can only begin once a real individual owns the
> unit. That single rule stops the system identity from accidentally 'housing' real
> people, which would make no sense."

---

## Scene 6 — Why this is worth an entire episode (6:00–6:40)

**Visual:** Talking head.

**Narration:**
> "This is a good example of the channel's whole approach: on the surface, 'track who
> owns a flat' sounds like a five-minute feature. In reality, it forces you to decide
> what 'always' means, what happens on day zero, and how to guarantee correctness
> under concurrent writes. Next episode, we move to the part of the app where money
> is actually involved — the contributions engine."

---

## Outro / CTA (6:40–7:10)

**Visual:** End card pointing to Episode 4.

**Narration:**
> "If temporal data modeling like this is new to you, this is exactly the kind of
> problem this channel exists to walk through in depth. Subscribe, and next time
> we'll look at how the app handles maintenance payments without ever letting a
> number be quietly changed after the fact."

---

## Production Notes

- **Screen recordings needed:** create-unit flow showing immediate `BUILDER_INVENTORY`
  ownership row; a successful ownership transfer; a rejected overlapping ownership
  attempt with the error notice visible; a unit's residency timeline showing a vacant
  gap.
- **Diagrams needed:** timeline-with-gap vs. clean timeline (cold open); builder
  inventory timeline; contiguous transfer boundary diagram; ownership-vs-residency
  gap comparison.
- **Source material to reuse:** `vault/01-Domain/Domain-Rules.md` rules `O3`, `O4`,
  `O5`, `O6`, `O7`, `O8`, `R3`, `R4`, `R5`, and the design notes under "O4 and
  BUILDER_INVENTORY" / "R4 / O4"; `course/00-intro/domain-glossary.md` entries for
  `BUILDER_INVENTORY`, `inceptionDt`, `Ownership Timeline`, `Residency Timeline`;
  `course/00-intro/app-tour.md` Capture 7–8 for the overlap-rejection demo framing.
- **Fact check before recording:** confirm `scripts/test-timelines-api.mjs` still
  passes (it's the modernized regression suite for exactly this rule set) so the
  on-camera demo matches current enforced behavior.
