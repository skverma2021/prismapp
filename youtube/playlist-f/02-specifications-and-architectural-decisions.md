# Playlist F · Episode 2 — "Turning Requirements into Specifications"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development
- **Case-study app:** PrismApp
- **Sub-arc:** From Ambiguous Ask to AI-Ready Spec (2 of 2)
- **Target length:** 7–9 minutes
- **Primary goal:** Show the difference between a vague requirement and a
  specification precise enough for AI-assisted implementation to be reliable,
  using a real Architecture Decision Record as the worked example.
- **Title options:**
  1. Turning Requirements into Specifications
  2. The Document That Makes AI-Assisted Coding Reliable
  3. Why This Project Writes ADRs Before It Writes Code
- **Thumbnail concept:** A blurry photo of a requirement sentence sharpening
  into a crisp, numbered decision list.
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "'Contribution records should be immutable' is a requirement. It's also
> completely useless to hand an AI assistant as-is — immutable how, enforced
> where, and what happens when a payment genuinely needs correcting? This
> episode is about the document that closes that gap: the specification."

---

## Scene 1 — A requirement becomes a decision (0:25–2:00)

**Visual:** Open `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`,
the Context and Decision sections.

**Code shown:**
```markdown
## Context
Contribution records are financial events and must remain auditable. Domain
rules require immutability after posting.

## Decision
1. Posted contribution records are immutable.
2. Contribution details are immutable.
3. Corrections are done only via compensating transactions.
4. Original and compensating records must be linkable for audit.
5. Maker-checker approval is optional in V1 and enabled in a later hardening
   phase when risk/volume thresholds are met.
```

**Narration:**
> "This is what a specification looks like in practice — an Architecture
> Decision Record, or ADR. The requirement, 'financial records must be
> auditable,' turns into five numbered, testable decisions. Notice decision 5
> especially: it doesn't pretend to answer a question this project isn't ready
> to answer yet — it phases the answer, explicitly, instead of leaving it
> vague."

---

## Scene 2 — What makes it AI-ready (2:00–3:30)

**Visual:** Highlight the "Allowed" / "Not Allowed" section.

**Code shown:**
```markdown
### Allowed
- Add a compensating transaction with negative or positive amount allocation.
- Mark correction reason and reference to original contribution.

### Not Allowed
- In-place update of posted contribution fields.
- Hard delete of posted contribution rows.
```

**Narration:**
> "This is the part that turns a decision into a specification an AI assistant
> can actually build against: an explicit allowed list and an explicit
> not-allowed list. Compare this to just saying 'make it immutable' — an
> assistant, or a new engineer, could reasonably guess that a soft-delete flag
> satisfies that. This document closes that guess off directly, in writing,
> before anyone starts implementing."

---

## Scene 3 — Alternatives considered, and why they were rejected (3:30–4:45)

**Visual:** Open the "Alternatives Considered" section.

**Code shown:**
```markdown
## Alternatives Considered
1. Allow updates with history table: rejected for higher complexity and higher
   risk of accidental mutation.
2. Soft delete and reinsert: rejected because it obscures transaction truth.
```

**Narration:**
> "A good specification doesn't just say what was decided — it says what
> *wasn't* chosen, and why. This matters enormously for AI-assisted work
> specifically: without this section, a later prompt like 'add an edit button
> for corrections' could easily reintroduce the exact design the team already
> rejected, because the rejection was never written down anywhere the
> assistant — or the next engineer — could see it."

---

## Scene 4 — Following the priority order when documents conflict (4:45–6:00)

**Visual:** Open `AGENTS.md` section 3, "Source of Truth Priority."

**Code shown:**
```markdown
## 3) Source of Truth Priority
When specs conflict, use this order:
1. vault/01-Domain/Domain-Rules.md
2. vault/01-Domain/ERD.md
3. vault/01-Domain/Entities.md
4. vault/03-API/API-Spec.md
5. vault/00-Core/System-Overview.md
```

**Narration:**
> "One more piece a specification layer needs once you have more than one
> document: a rule for what wins when two of them disagree. This project
> states that order explicitly, so that an AI assistant reading these files
> — or a person — resolves a conflict the same way every time, instead of
> picking whichever document it happened to open first."

---

## Scene 5 — From spec to data model (6:00–7:15)

**Visual:** Quick cut to `ADR-001`'s "Minimal Data Requirements for Correction"
list.

**Code shown:**
```markdown
## Minimal Data Requirements for Correction
- originalContributionId
- correctionContributionId
- reasonCode
- reasonText
- createdBy
- createdAt
```

**Narration:**
> "And this is the handoff point into the next stage of the pipeline — data
> model. Notice this list reads almost like a table definition already. That's
> not an accident. A specification this concrete is what makes the next
> step — generating an actual implementation candidate — something AI can do
> reliably instead of guessing at what 'auditable' was supposed to mean."

---

## Outro / CTA (7:15–7:45)

**Visual:** End card, next-episode pointer.

**Narration:**
> "Next: what it actually looks like to take a specification like this one and
> generate a real implementation candidate from it — and what still needs a
> human eye before it ships."

---

## Production Notes

- **Screen recordings needed:** `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`
  (Context, Decision, Allowed/Not Allowed, Alternatives Considered, Minimal Data
  Requirements sections); `AGENTS.md` section 3 (Source of Truth Priority).
- **Source material:** files above, read directly from the repository.
- **B-roll:** none required.
