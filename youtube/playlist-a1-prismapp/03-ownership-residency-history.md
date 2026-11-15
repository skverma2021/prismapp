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
> "Imagine a brand-new flat, fresh from the builder. Nobody has bought it yet. So who owns it?
>
> Suppose your answer is 'nobody, for now.' Then this episode is for you.
>
> In this system, that answer is not allowed."

---

## Scene 1 — The rule: exactly one active owner, always (0:20–1:20)

**Visual:** On-screen rule card: "O3 — A unit cannot have more than one active owner
at any time. O4 — A unit must always have exactly one active owner."

**Narration:**
> "Two rules drive this whole episode.
>
> First, a unit can never have two active owners at once. That would mean two people hold title to the same flat at the same time. That does not make sense.
>
> Second, and less obvious: a unit must *always* have exactly one active owner. There are no gaps. Not for a single day. Not even before the unit has ever been sold.
>
> Most systems only think about the first rule.
>
> The second one is where it gets interesting."

---

## Scene 2 — The builder inventory trick (1:20–2:40)

**Visual:** Diagram: a unit's timeline starting at `inceptionDt`, first segment
labeled "BUILDER_INVENTORY", second segment labeled with a real buyer's name.

**Narration:**
> "Before any real owner exists, someone still effectively holds the unit. That someone is the builder.
>
> So the system creates a system identity called `BUILDER_INVENTORY`. It makes this identity the owner of record from the exact date the unit is created. That date is its `inceptionDt`.
>
> It is not a real person. It cannot be picked as a resident. And it cannot be removed.
>
> It exists only so the ownership timeline never has a hole in it.
>
> The moment a unit is created, its first ownership row is created in the same atomic operation. So there is no window, not even a split second, where the unit has no owner."

**On-screen action:** Screen recording — create a new unit in the app, then
immediately open its ownership timeline and show the `BUILDER_INVENTORY` row already
present.

---

## Scene 3 — Transfers: contiguous, not just non-overlapping (2:40–3:50)

**Visual:** Timeline diagram: owner A ends on day N, owner B starts on day N+1 — no
gap, no overlap, a single shared boundary.

**Narration:**
> "When a unit actually sells, the transfer is not just 'add a new owner and end the old one whenever.'
>
> The end date of the outgoing owner and the start date of the incoming owner must be exactly contiguous. The new owner starts the very next day after the old one ends.
>
> That is stricter than just 'do not overlap.' It also forbids gaps.
>
> Suppose someone tries to record a transfer that leaves a three-day hole. The system rejects it. That would leave three days where nobody legally owned the flat."

---

## Scene 4 — Watching the rejection happen (3:50–4:50)

**Visual:** Screen recording — attempt to create an ownership record with a start
date that overlaps an existing active ownership; show the red error notice.

**Narration:**
> "Here is what that looks like in practice.
>
> I will try to backdate a new owner into a period that is already covered by someone else.
>
> The system does not just show a polite warning. It rejects the write outright.
>
> It does this check inside a serializable database transaction. It is not only a client-side validation.
>
> That matters because two people could try to submit conflicting ownership changes at almost the same moment. A simple 'check then write' in application code can miss that race.
>
> A serializable transaction cannot."

---

## Scene 5 — Residency plays by looser rules, on purpose (4:50–6:00)

**Visual:** Split diagram — ownership timeline with no gaps allowed; residency
timeline with a visible gap labeled "vacant".

**Narration:**
> "Residency looks similar, but it is not identical.
>
> A unit can have zero or one active resident. Gaps are fine. A flat can sit vacant between a sale and a new tenant moving in, or during renovation.
>
> There is also one rule that connects ownership and residency directly. Nobody can move in while the unit is still owned by `BUILDER_INVENTORY`.
>
> Residency can only begin once a real individual owns the unit.
>
> That single rule stops the system identity from accidentally 'housing' real people. That would make no sense."

---

## Scene 6 — Why this is worth an entire episode (6:00–6:40)

**Visual:** Talking head.

**Narration:**
> "This is a good example of the whole approach of this channel.
>
> On the surface, 'track who owns a flat' sounds like a five-minute feature.
>
> In reality, it forces you to decide what 'always' means. It forces you to decide what happens on day zero. And it forces you to guarantee correctness under concurrent writes.
>
> Next episode, we move to the part of the app where money is actually involved. That is the contributions engine."

---

## Outro / CTA (6:40–7:10)

**Visual:** End card pointing to Episode 4.

**Narration:**
> "If temporal data modeling like this is new to you, this is exactly the kind of problem this channel exists to explain in depth.
>
> Subscribe.
>
> Next time, we will look at how the app handles maintenance payments. And we will see how it never lets a number be quietly changed after the fact."

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
