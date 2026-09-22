# Playlist B · Episode 6 — "A Financial Record That Can't Lie"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Build Practices (1 of 2)
- **Target length:** 7–9 minutes
- **Primary goal:** Teach the Architecture Decision Record (ADR) as an engineering
  technique, using ADR-001 (immutability and corrections) as the fully worked
  example — the *process* of deciding, not just the resulting feature (already shown
  from a user's perspective in Playlist A1 Episode 4).
- **Title options:**
  1. A Financial Record That Can't Lie
  2. How to Write Down an Engineering Decision So It Sticks
  3. ADRs: The Document That Stops the Same Argument Twice
- **Thumbnail concept:** A padlocked ledger row next to a document titled "ADR-001 —
  Accepted", stamped in green.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Someone asks: 'why can't I just fix this payment amount directly?' Six months
> later, someone else asks the exact same question. If the answer only ever lived in
> a Slack thread, you're about to have the same debate twice. Today: the document
> that prevents that."

---

## Scene 1 — The decision that needed writing down (0:20–1:30)

**Visual:** Screen recording — `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`
title, status, and "Context" section.

**Narration:**
> "The decision itself is simple to state: once a contribution payment is posted, it
> can never be edited or deleted, by anyone, for any reason. Corrections happen by
> adding a new, offsetting entry instead. Simple to state, but easy to second-guess
> later under pressure — 'just this once, can we fix the typo directly?' An ADR
> exists precisely for that moment: to have the reasoning already written down, so
> the answer doesn't depend on who's in the room that day."

---

## Scene 2 — Anatomy of an ADR (1:30–2:50)

**Visual:** Screen recording scrolling through the document's actual section
headers: Context → Decision → Why → Correction Model → Invariants → Consequences →
Alternatives Considered → Follow-up Tasks.

**Narration:**
> "Notice the shape of this document — it's a template, not a one-off essay.
> Context: what problem forced this decision. Decision: the actual rule, stated
> plainly. Why: the reasoning. Then the specifics — what's allowed, what invariants
> must hold. And two sections people often skip but shouldn't: consequences,
> including the honest trade-offs, and alternatives considered — the options that
> were rejected, and why. That last one is what stops the 'have we tried just doing
> X instead' conversation from happening again a year later."

---

## Scene 3 — Writing down the trade-off honestly (2:50–4:00)

**Visual:** Screen recording — the "Consequences" section, both "Positive" and
"Trade-offs" subsections.

**Narration:**
> "A good ADR doesn't just sell the decision — it names the cost. Here: strong
> auditability and safer horizontal scaling, because every write is append-only,
> nothing is ever mutated in place. And honestly, more records to manage, and
> reports that now have to compute net effects across original and compensating
> entries instead of reading one row. Writing the downside down, in the same
> document as the upside, is what makes the decision trustworthy instead of
> sounding like marketing."

---

## Scene 4 — Deciding what to decide later (4:00–5:20)

**Visual:** Screen recording — the "Approval Model (Phased)" section: V1 single-step
approval vs. V2+ maker-checker, and the "Maker-Checker Rollout Triggers" list.

**Narration:**
> "Not every related question gets answered in the same document, and that's a
> feature, not a gap. This ADR explicitly defers a second question — should a
> financial correction require a second person's approval — to a later phase, and
> names the concrete triggers that would force that decision: a correction-count
> threshold, a dollar-amount threshold, a compliance requirement. Deferring a
> decision on purpose, with a stated trigger for revisiting it, is completely
> different from just not thinking about it."

---

## Scene 5 — Watching the decision hold up in practice (5:20–6:30)

**Visual:** Screen recording — attempting to edit a posted contribution (rejected),
then successfully posting a compensating transaction referencing the original.

**Narration:**
> "Here's the decision enforced. No edit path exists for a posted contribution — not
> hidden, not disabled, genuinely absent. A correction instead creates a new record
> that references the original, with a reason code and full audit metadata. Anyone
> reading the ledger later sees both the mistake and its correction, which is exactly
> the point: the system's history stays honest, including its own errors."

---

## Scene 6 — Why every project needs a few of these (6:30–7:20)

**Visual:** Talking head.

**Narration:**
> "You don't need an ADR for every choice — that's its own kind of waste. You need
> one for the decisions that are expensive to get wrong, likely to be questioned
> later, or genuinely have more than one reasonable answer. Immutability of money is
> exactly that kind of decision. Writing it down once, in this shape, is cheaper than
> re-litigating it every time someone new joins the project."

---

## Outro / CTA (7:20–7:50)

**Visual:** End card pointing to Episode B7.

**Narration:**
> "Next episode: how do you actually prove decisions like this one hold up — not by
> reading the document again, but by testing the real workflow. Subscribe and I'll
> see you there."

---

## Production Notes

- **Screen recordings needed:** `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`
  full walkthrough (Context, Decision anatomy, Consequences, Approval Model); a live
  rejected edit attempt on a posted contribution; a live compensating-transaction
  creation.
- **Diagrams needed:** none essential — this is a document-walkthrough episode;
  PowerPoint section-header callouts over the ADR file work well here.
- **Source material to reuse:** `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`
  in full; cross-reference `vault/01-Domain/Domain-Rules.md` "Financial Integrity
  Rules" for the rule-level statement this ADR implements.
- **Fact check before recording:** confirm the compensating-transaction UI/flow
  shown in Scene 5 matches current implementation (this may be the same footage
  used in Playlist A1 Episode 4 — reuse if suitable, but note the narration angle
  here is "process," not "feature").
