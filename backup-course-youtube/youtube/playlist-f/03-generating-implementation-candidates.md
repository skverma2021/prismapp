# Playlist F · Episode 3 — "Generating Implementation Candidates"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development
- **Case-study app:** PrismApp
- **Sub-arc:** Implementation and Catching What AI Gets Wrong (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show what "generating a candidate" means when the spec is
  good — using a real, still-unbuilt design (ADR-002) to demonstrate what a
  well-specified candidate looks like before a human commits to it.
- **Title options:**
  1. Generating Implementation Candidates
  2. A Design AI Could Build — That Nobody Has Built Yet
  3. What "Propose the Smallest Change" Actually Produces
- **Thumbnail concept:** A blueprint-style JSON schema diagram with a
  "NOT YET BUILT" stamp across it.
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A good specification doesn't just get implemented once. It gets used to
> generate candidates — options a human can compare, before any of them
> becomes real code. Here's a real one, sitting in this project's vault right
> now, deliberately not built."

---

## Scene 1 — A field-level candidate design (0:20–2:00)

**Visual:** Open `ADR-002-Pricing-Extensions.md`, the "ContributionDetail-level
additions" section.

**Code shown:**
```markdown
### ContributionDetail-level additions (authoritative amounts)
1. baseAmount decimal(12,2), nullable
2. discountAmount decimal(12,2), nullable default 0
3. waiverAmount decimal(12,2), nullable default 0
4. surchargeAmount decimal(12,2), nullable default 0
5. netAmount decimal(12,2), nullable
6. pricingMode varchar(32), nullable
   - expected values: LINEAR, TIERED, DISCOUNTED, WAIVED, CUSTOM
7. pricingBreakdownJson jsonb, nullable
```

**Narration:**
> "This is a genuine implementation candidate — specific column names, specific
> types, specific allowed values for `pricingMode`. Someone worked with AI to
> take the earlier ADR-001-style specification and turn 'we might need
> non-linear pricing someday' into something concrete enough to actually
> evaluate. And notice: it's still just a candidate. Nothing here has become a
> Prisma migration."

---

## Scene 2 — The invariant that makes it checkable (2:00–3:15)

**Visual:** Highlight the "Amount Semantics" formula.

**Code shown:**
```markdown
Formula invariant per row:

netAmount = baseAmount - discountAmount - waiverAmount + surchargeAmount

and

amt = netAmount
```

**Narration:**
> "This is what turns a candidate from 'a plausible-looking list of columns'
> into something you can actually test. A generated design that can't state
> its own invariant this precisely isn't ready to be evaluated yet — it's still
> a sketch. This formula is exactly the kind of thing a reviewer checks first,
> and exactly the kind of thing a generated test suite would assert on every
> row."

---

## Scene 3 — Generating a shape for the hard part (3:15–4:30)

**Visual:** Show the `pricingBreakdownJson` example.

**Code shown:**
```json
{
  "mode": "TIERED",
  "version": 2,
  "inputs": {
    "quantity": 7,
    "appliedRate": 120.0
  },
  "tiers": [ /* ... */ ]
}
```

**Narration:**
> "The hardest part of this candidate isn't the simple decimal columns — it's
> the free-form part, the breakdown that has to explain *how* a non-linear
> price was actually computed. Generating a worked example like this one, with
> real sample values, is exactly where AI is genuinely useful: it's tedious to
> hand-write a realistic sample by hand, and having one makes the whole
   candidate concrete enough for a domain expert to react to."

---

## Scene 4 — Candidates get reviewed against the old contract, not just the new idea (4:30–5:45)

**Visual:** Highlight the "Amount Semantics" transition note.

**Code shown:**
```markdown
- V1 existing field amt remains the posted row amount used by reports.
- During transition, write both:
  - amt (authoritative posted amount)
  - extension fields (baseAmount, adjustments, netAmount)
```

**Narration:**
> "And here's the check every candidate has to pass that a first draft often
> misses: does it break anything that already works? This candidate explicitly
> keeps the existing `amt` field authoritative during any transition, so every
> report and every piece of reporting code written in Playlist D keeps working
> unchanged. A candidate that quietly renamed or removed `amt` might look
> cleaner — and would be wrong, because it ignores everything already built on
> top of it."

---

## Outro / CTA (5:45–6:15)

**Visual:** End card, next-episode pointer.

**Narration:**
> "A candidate this concrete is ready for the next stage: real review — the
> stage where you go looking specifically for what it got wrong."

---

## Production Notes

- **Screen recordings needed:** `ADR-002-Pricing-Extensions.md` — the
  ContributionDetail-level additions list, the Amount Semantics section
  including the invariant formula and transition note, and the
  `pricingBreakdownJson` example.
- **Source material:** file above, read directly from the repository.
- **B-roll:** none required.
