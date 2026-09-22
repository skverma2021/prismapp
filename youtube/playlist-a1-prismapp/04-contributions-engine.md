# Playlist A1 · PrismApp — Episode 4 — "The Contributions Engine"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** 7–9 minutes
- **Primary goal:** Explain how the app turns "what do residents pay, and when" into
  a deterministic, auditable engine, and why posted payments are never edited
  in place.
- **Title options:**
  1. The Contributions Engine — How Maintenance Billing Actually Works
  2. Why This App Never Lets You "Just Edit" a Payment
  3. Designing a Financial Engine That Can't Lie
- **Thumbnail concept:** A ledger/receipt graphic with a padlock icon over a row,
  labeled "Locked".

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Every society has the same money problem: some units pay per square foot, some
> pay a flat fee, some pay per person using a service — and once someone's paid, that
> record has to be trustworthy forever. Today, the engine that makes that true."

---

## Scene 1 — Three ingredients: heads, rates, periods (0:20–1:40)

**Visual:** Screen recording of `/contribution-heads`, then `/contribution-rates`,
then `/contribution-periods`. Diagram: three stacked boxes — Head, Rate, Period.

**Narration:**
> "Three building blocks. A contribution head is *what* you're paying for —
> maintenance, a gym fee, a one-off event charge — and it defines how the amount is
> measured: by area, by number of people, or a flat lump sum. A contribution rate is
> the *price* for that head over a date range — rates change over time, so each rate
> has a start date and, usually, an end date once it's superseded. A contribution
> period is simply a calendar bucket — a specific month, or an entire year — that a
> payment gets attached to. Heads answer 'what.' Rates answer 'how much, and since
> when.' Periods answer 'for when.'"

---

## Scene 2 — Turning a payment into a number (1:40–3:00)

**Visual:** On-screen formula card: `payable = quantity × applicable rate ×
period count`. Screen recording — a payment capture screen for a per-square-foot
maintenance charge, auto-filling the unit's area.

**Narration:**
> "Every payment, no matter the head, resolves to the same formula: quantity times
> the applicable rate, times however many periods are being paid at once. Quantity
> depends on the head's measurement type — for an area-based head, the app pulls the
> unit's square footage automatically, no manual entry. For a per-person head, an
> operator enters how many people are using the service, but only if the unit
> currently has at least one active resident — you can't bill a per-person service on
> an empty flat. For a flat fee, quantity is simply one. Same formula, three
> different inputs — that consistency is what keeps the reporting simple later."

---

## Scene 3 — Which rate actually applies? (3:00–4:00)

**Visual:** Timeline diagram: a rate change boundary, with a payment transaction date
marked slightly after the boundary, arrow pointing to the *new* rate even though the
period being paid for is *before* the boundary.

**Narration:**
> "Here's a subtle rule that surprises people the first time they hit it. Which rate
> applies isn't decided by the period you're paying for — it's decided by the date
> the payment is actually made. If you're settling January's dues in April, and the
> rate went up in February, you pay April's rate, not January's. That's a deliberate
> policy, not a bug, and when it happens the app shows a non-blocking warning so the
> resident and the operator both see it happening, rather than it being silently
> applied."

---

## Scene 4 — Once posted, it's permanent (4:00–5:20)

**Visual:** Screen recording — attempt to edit a posted contribution (showing no
edit/delete option), then a compensating correction flow creating a new offsetting
entry.

**Narration:**
> "Once a contribution is recorded, it cannot be edited or deleted — not by an admin,
> not through the API, not ever. If a mistake needs fixing, the system creates a
> compensating transaction — a new entry that offsets the original — so the ledger
> always tells the true story of what happened, including the mistake and its
> correction. This is exactly how real accounting systems behave, and for the same
> reason: an editable financial record isn't trustworthy, no matter how good your
> intentions are."

---

## Scene 5 — Stopping duplicate payments (5:20–6:20)

**Visual:** Screen recording — attempt to pay the same unit, same head, same period
twice; show the rejection.

**Narration:**
> "One more safeguard: the same unit can't be billed twice for the same head and the
> same period. That sounds obvious, but it has to be enforced at the data layer, not
> just in the UI — otherwise a double-click, a network retry, or two operators
> working at once could double-charge a resident. There's one deliberate exception:
> if every entry for a unit-head-period combination nets out to zero — because a
> correction fully offset the original — the system allows a fresh entry for that
> same period. Net zero really means nothing was ever actually paid."

---

## Scene 6 — Making it reportable (6:20–7:20)

**Visual:** Screen recording — a paid/unpaid matrix report, months across the top,
units down the side, colored cells for paid vs. unpaid.

**Narration:**
> "All of these rules exist in service of one outcome: a report someone can trust.
> This paid/unpaid matrix answers 'who hasn't paid maintenance this year' at a
> glance, and every number behind it traces back to an immutable, rate-locked,
> duplicate-checked transaction. That traceability is the entire point of everything
> we just walked through."

---

## Outro / CTA (7:20–7:50)

**Visual:** End card pointing to Episode 5.

**Narration:**
> "Next episode, we leave money behind and look at complaints — a different kind of
> integrity problem: keeping a workflow honest as it moves through multiple people
> and multiple states. Subscribe, and I'll see you there."

---

## Production Notes

- **Screen recordings needed:** `/contribution-heads`, `/contribution-rates` (showing
  a superseded rate with a `toDt` and a current rate with none), `/contribution-periods`,
  a per-sqft payment capture (auto-filled quantity), a per-person payment capture
  (with an eligibility check), an attempted edit of a posted contribution (showing
  none exists), a compensating-correction flow, a duplicate-payment rejection, and a
  paid/unpaid matrix report.
- **Diagrams needed:** three-box Head/Rate/Period stack; payable formula card;
  rate-resolution-at-payment-date timeline; net-zero unlock illustration (optional,
  can be verbal only if time is short).
- **Source material to reuse:** `vault/01-Domain/Domain-Rules.md` "Contribution
  Rules", "Contribution Period Constraints", "Duplicate Protection Rules", "Quantity
  Rules", "Financial Integrity Rules"; `course/00-intro/domain-glossary.md` entries
  for `Contribution`, `ContributionDetail`, `ContributionHead`, `ContributionPeriod`,
  `ContributionRate`, `payUnit`, `transactionDate/transactionDateTime`; repo memory
  note `prismapp-contribution-master-data.md` for exact API/service names if a code
  cutaway is added.
- **Fact check before recording:** confirm current seed data includes at least one
  head with a superseded rate (so Scene 3's rate-resolution point can be shown live,
  not just described) and one unit with a partially-paid year (for the Scene 6
  report to look realistic rather than all-green or all-red).
