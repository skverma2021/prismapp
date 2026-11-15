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
> "Someone asks: 'Why can I not just fix this payment amount directly?'
>
> Six months later, someone else asks the exact same question.
>
> If the answer only lived in a Slack thread, you will have the same debate twice.
>
> Today, we look at the document that prevents that."

---

## Scene 1 — The decision that needed writing down (0:20–1:30)

**Visual:** Screen recording — `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`
title, status, and "Context" section.

**Narration:**
> "The decision itself is simple to state.
>
> Once a contribution payment is posted, it can never be edited or deleted, by anyone, for any reason. Corrections happen by adding a new, offsetting entry instead.
>
> It is simple to state. But it is easy to second-guess later, under pressure. 'Just this once, can we fix the typo directly?'
>
> An ADR exists for exactly that moment. The reasoning is already written down. So the answer does not depend on who is in the room that day."

---

## Scene 2 — Anatomy of an ADR (1:30–2:50)

**Visual:** Screen recording scrolling through the document's actual section
headers: Context → Decision → Why → Correction Model → Invariants → Approval Model →
Known Gap (resolved by ADR-004) → Consequences → Alternatives Considered → Follow-up
Tasks.

**Narration:**
> "Notice the shape of this document. It is a template, not a one-off essay.
>
> Context: what problem forced this decision. Decision: the actual rule, stated plainly. Why: the reasoning.
>
> Then come the specifics. What is allowed, and what invariants must hold.
>
> Two more sections are often skipped, but they should not be. The first is consequences, including the honest trade-offs. The second is alternatives considered. These are the options that were rejected, and why.
>
> That last section stops the 'have we tried doing X instead?' conversation from happening again a year later."

---

## Scene 3 — Writing down the trade-off honestly (2:50–4:00)

**Visual:** Screen recording — the "Consequences" section, both "Positive" and
"Trade-offs" subsections.

**Narration:**
> "A good ADR does not just sell the decision. It names the cost.
>
> Here, the benefits are strong auditability and safer horizontal scaling. Every write is append-only, so nothing is ever changed in place.
>
> And honestly, there are costs. There are more records to manage. And reports must now compute net effects across original and compensating entries, instead of reading one row.
>
> Writing the downside in the same document as the upside makes the decision trustworthy. Otherwise, it sounds like marketing."

---

## Scene 4 — Deciding what to decide later (4:00–5:20)

**Visual:** Screen recording — the "Approval Model (Phased)" section: V1 single-step
approval vs. V2+ maker-checker, and the "Maker-Checker Rollout Triggers" list.

**Narration:**
> "Not every related question gets answered in the same document. That is a feature, not a gap.
>
> This ADR deliberately defers a second question to a later phase. Should a financial correction require a second person's approval?
>
> It also names the concrete triggers that would force that decision. A correction-count threshold. A dollar-amount threshold. A compliance requirement.
>
> Deferring a decision on purpose, with a stated trigger for revisiting it, is completely different from not thinking about it."

---

## Scene 5 — Watching the decision hold up in practice (5:20–6:30)

**Visual:** Screen recording — attempting to edit a posted contribution (rejected),
then successfully posting a compensating transaction referencing the original.

**Narration:**
> "Here is the decision, enforced.
>
> No edit path exists for a posted contribution. It is not hidden, and it is not disabled. It is genuinely absent.
>
> A correction creates a new record that references the original. It has a reason code and full audit metadata.
>
> Anyone reading the ledger later sees both the mistake and its correction. That is the point. The history of the system stays honest, including its own errors.
>
> The ADR itself stays honest too. A gap was found later in live use. A pending correction released the duplicate lock too early.
>
> That gap was written into the same ADR as a known gap. Then a follow-up ADR closed it, and extended it with partial adjustments."

---

## Scene 6 — Why every project needs a few of these (6:30–7:20)

**Visual:** Talking head.

**Narration:**
> "You do not need an ADR for every choice. That is its own kind of waste.
>
> You need one for decisions that are expensive to get wrong, likely to be questioned later, or have more than one reasonable answer.
>
> Immutability of money is exactly that kind of decision.
>
> Writing it down once, in this shape, is cheaper than debating it again every time someone new joins the project."

---

## Outro / CTA (7:20–7:50)

**Visual:** End card pointing to Episode B7.

**Narration:**
> "Next episode, we ask how you prove that decisions like this one hold up.
>
> We do not read the document again. We test the real workflow.
>
> Subscribe, and I will see you there."

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
