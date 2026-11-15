# Playlist F · Episode 1 — "Using AI to Explore a Requirement"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development (app-agnostic; grounded in
  this project's own real engineering artifacts, not staged examples)
- **Case-study app:** PrismApp
- **Sub-arc:** From Ambiguous Ask to AI-Ready Spec (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show what it actually looks like to point AI at a vague or
  incomplete area of a real project and get back a structured list of what's
  missing — not a finished answer, a better question.
- **Title options:**
  1. Using AI to Explore a Requirement
  2. Before You Ask AI to Build Something, Ask It What's Missing
  3. What Does "Enough to Start" Actually Mean?
- **Thumbnail concept:** A checklist with some items checked and some marked with
  a question mark, half in shadow, half lit.
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "This channel's Playlist F is not about clever prompts.
>
> It is about where AI becomes useful in a real engineering process.
>
> And the first place it becomes useful is not writing code. It is reading what you already have.
> Then it tells you honestly what is still missing, before anyone writes a line."

---

## Scene 1 — A real project's own gap analysis (0:25–2:00)

**Visual:** Open `AGENTS.md`, section 4, "Current Vault Status (Read This
First)."

**Code shown:**
```markdown
## 4) Current Vault Status (Read This First)
The vault is a strong domain baseline, but not sufficient by itself for full
delivery.

What is already good:
- Core entities are defined in vault/01-Domain/Entities.md and ERD.md.
- Temporal ownership and residency rules are defined in Domain-Rules.md.
...

What is missing for implementation readiness:
- Explicit user roles and permissions...
- Authentication and authorization approach.
- Final API contracts...
- Reporting definitions...
- Seed strategy for master data and sample records.
- NFRs: auditability, performance targets, retention, backup expectations.
- Multi-user concurrency behavior for conflicting edits.

Conclusion: enough to start and deliver V1, but missing details must be
captured during sprint 0 and sprint 1.
```

**Narration:**
> "This is a real section from this project's own AI operating document.
>
> Notice its shape. It does not say 'here is the plan.' It gives an honest, two-column list. What is already solid, and what is genuinely missing.
>
> Then it ends with a conclusion that does not treat the gaps as blockers: 'enough to start... but missing details must be captured.'
>
> That is the real value AI brings at this stage. It does not fill every gap with a guess. It shows the gaps clearly.
>
> Then a human can decide which ones matter *now*."

---

## Scene 2 — A requirement that's deliberately not built yet (2:00–3:30)

**Visual:** Open `vault/00-Core/ADR-002-Pricing-Extensions.md`, the header and
Context section.

**Code shown:**
```markdown
# ADR-002: Non-Linear Pricing Extension Model

Status: Proposed (Phase-2, not implemented)
Date: 2026-03-26

## Context
V1 pricing is linear and deterministic:
- per-period amount = quantity x applicableRate
- total payable = per-period amount x periodCount

This works for current heads, but future requirements may include:
- tiered pricing
- discounts
- waivers
- surcharges

We want these capabilities without breaking V1 reports, audit trails, or
immutability.
```

**Narration:**
> "Here is a second real example. It is a good one because of its status line: 'Proposed, Phase-2, not implemented.'
>
> Someone, a person working with AI, explored a future requirement. The question was: 'what if pricing needs to get more complex?'
>
> They explored it far enough to write down the constraints it would have to respect. And they did not commit a single line of production code.
>
> That is exploration done well. It produces a document the team can discuss. It does not produce a feature the team must now maintain."

---

## Scene 3 — Why explore before you build (3:30–4:45)

**Visual:** Split screen — left: "explore first" (AGENTS.md gap list, ADR-002
proposal), right: "build first" (a crossed-out sketch of jumping straight to
schema changes).

**Narration:**
> "It is tempting to ask AI to just build the feature.
>
> But look at what exploring first gave this project. The pricing ADR could reject two alternative designs. One was reverse-allocating discounts after the fact. The other was storing only a final number with no breakdown.
>
> It rejected both before either one became a migration that had to be undone.
>
> Exploration is cheap. A shipped, wrong data model is not.
>
> AI is genuinely good at quickly listing what a decision would need to handle. And that list is exactly what a domain expert needs to see before they say yes."

---

## Scene 4 — The discipline: smallest reversible decision (4:45–6:00)

**Visual:** Highlight `AGENTS.md` section 3, the closing line.

**Code shown:**
```markdown
If unresolved ambiguity remains, write an ADR note in vault/00-Core/ and
proceed with the smallest reversible decision.
```

**Narration:**
> "This is the rule that keeps exploration from turning into paralysis.
>
> If something is still ambiguous after you have explored it, you do not wait for perfect certainty. You write down the ambiguity. Then you make the smallest decision that you can still walk back later.
>
> AI can help you explore a requirement almost forever. This rule stops that exploration from becoming its own kind of procrastination."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card, next-episode pointer.

**Narration:**
> "Once you have explored a requirement honestly, the next step is to turn what you found into a specification.
>
> A specification is something AI can actually build from.
>
> That is next."

---

## Production Notes

- **Screen recordings needed:** `AGENTS.md` section 4 (Current Vault Status)
  and the closing line of section 3; `vault/00-Core/ADR-002-Pricing-Extensions.md`
  header + Context section.
- **Source material:** files above, read directly from the repository.
- **B-roll:** none required.
- **Fact-check note:** ADR-002 is genuinely unimplemented — confirmed by its own
  status line ("Proposed, Phase-2, not implemented") rather than assumed.
