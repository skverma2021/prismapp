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
> "Every society has the same money problem.
>
> There is a per square foot, per month payment for maintenance. There is a flat fee for an annual event. And there is a per person, per month payment for using a service.
>
> Once someone has paid, that record must be trustworthy forever.
>
> Today, we look at the engine that makes that true."

---

## Scene 1 — Three ingredients: heads, rates, periods (0:20–1:40)

**Visual:** Screen recording of `/contribution-heads`, then `/contribution-rates`,
then `/contribution-periods`. Diagram: three stacked boxes — Head, Rate, Period.

**Narration:**
> "There are three building blocks.
>
> A contribution head is *what* you are paying for. It might be maintenance, a gym fee, or a one-off event charge. It also defines how the amount is measured: by area, by number of people, or as a flat lump sum.
>
> A contribution rate is the *price* for that head over a date range. Rates change over time. So each rate has a start date and, usually, an end date once a newer rate replaces it.
>
> A contribution period is a calendar bucket. It is a specific month, or an entire year, that a payment gets attached to.
>
> Heads answer 'what.' Rates answer 'how much, and since when.' Periods answer 'for when.'"

---

## Scene 2 — Turning a payment into a number (1:40–3:00)

**Visual:** On-screen formula card: `payable = quantity × applicable rate ×
period count`. Screen recording — a payment capture screen for a per-square-foot
maintenance charge, auto-filling the unit's area.

**Narration:**
> "Every payment, whatever the head, resolves to the same formula.
>
> Quantity times the applicable rate, times the number of periods paid at once.
>
> Quantity depends on the measurement type of the head.
>
> For an area-based head, the app pulls the square footage of the unit automatically. There is no manual entry.
>
> For a per-person head, an operator enters how many people use the service. But this only works if the unit currently has at least one active resident. You cannot bill a per-person service on an empty flat.
>
> For a flat fee, quantity is simply one.
>
> It is the same formula with three different inputs. That consistency keeps the reporting simple later."

---

## Scene 3 — Which rate actually applies? (3:00–4:00)

**Visual:** Timeline diagram: a rate change boundary, with a payment transaction date
marked slightly after the boundary, arrow pointing to the *new* rate even though the
period being paid for is *before* the boundary.

**Narration:**
> "Here is a subtle rule that surprises people the first time they meet it.
>
> The period you are paying for does not decide which rate applies. The date the payment is actually made decides it.
>
> Suppose you settle the dues of January in April, and the rate went up in February. Then you pay the rate of April, not the rate of January.
>
> That is a deliberate policy, not a bug.
>
> When it happens, the app shows a non-blocking warning. So the resident and the operator both see it, and it is never applied silently."

---

## Scene 4 — Once posted, it's permanent (4:00–5:20)

**Visual:** Screen recording — attempt to edit a posted contribution (showing no
edit/delete option), then a compensating correction flow creating a new offsetting
entry.

**Narration:**
> "Once a contribution is recorded, it cannot be edited or deleted. Not by an admin. Not through the API. Not ever.
>
> If a mistake needs fixing, the system creates a compensating transaction. This is a new entry that offsets the original.
>
> So the ledger always tells the true story of what happened, including the mistake and its correction.
>
> A correction can reverse the whole payment. Or it can give back just part of it, for example a rate concession. But it can never exceed what is still correctable.
>
> This is exactly how real accounting systems behave. And the reason is the same: an editable financial record is not trustworthy, however good your intentions are."

---

## Scene 5 — Stopping duplicate payments (5:20–6:20)

**Visual:** Screen recording — attempt to pay the same unit, same head, same period
twice; show the rejection.

**Narration:**
> "Here is one more safeguard.
>
> The same unit cannot be billed twice for the same head and the same period.
>
> That sounds obvious. But it must be enforced at the data layer, not just in the UI. Otherwise a double-click, a network retry, or two operators working at once could double-charge a resident.
>
> There is one deliberate exception.
>
> Suppose every entry for a unit-head-period combination nets out to zero, because an approved correction fully offset the original. Then the system allows a fresh entry for that same period.
>
> A correction that still waits for approval does not count. A partial adjustment does not count either, because the period is still partly paid.
>
> Net zero really means that nothing was ever actually paid."

---

## Scene 6 — Making it reportable (6:20–7:20)

**Visual:** Screen recording — a paid/unpaid matrix report, months across the top,
units down the side, colored cells for paid vs. unpaid.

**Narration:**
> "All of these rules exist for one outcome: a report someone can trust.
>
> This paid/unpaid matrix answers 'who has not paid maintenance this year' at a glance.
>
> And every number behind it traces back to a transaction that is immutable, rate-locked, and duplicate-checked.
>
> That traceability is the entire point of everything we just covered."

---

## Outro / CTA (7:20–7:50)

**Visual:** End card pointing to Episode 5.

**Narration:**
> "Next episode, we leave money behind and look at complaints.
>
> This is a different kind of integrity problem. It is about keeping a workflow honest as it moves through multiple people and multiple states.
>
> Subscribe, and I will see you there."

---

## Production Notes

- **Screen recordings needed:** `/contribution-heads`, `/contribution-rates` (showing
  a superseded rate with a `toDt` and a current rate with none), `/contribution-periods`,
  a per-sqft payment capture (auto-filled quantity), a per-person payment capture
  (with an eligibility check), an attempted edit of a posted contribution (showing
  none exists), a compensating-correction flow (full reversal, and a partial
  adjustment such as giving back part of a payment), a duplicate-payment rejection
  (including a re-post blocked while a correction is still pending), and a
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
