# Playlist F · Episode 7 — "What Stays Under Human Control"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development
- **Case-study app:** PrismApp
- **Sub-arc:** Judgment: What AI Doesn't Get to Decide (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show a real, phased decision about financial control —
  maker-checker approval — as a concrete example of a call that depends on
  business risk tolerance, not technical capability, and therefore cannot be
  delegated to AI.
- **Title options:**
  1. What Stays Under Human Control
  2. A Decision AI Can Draft but Can't Make
  3. Why This App Doesn't Require Dual Approval — Yet
- **Thumbnail concept:** A single approval stamp, with a second, greyed-out
  stamp behind it labeled "not yet."
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Not every decision in this project is a technical one. Some of them are
   risk decisions — and those ones, this project is explicit about, stay with
   people."

---

## Scene 1 — A phased approval model, written down (0:20–2:00)

**Visual:** Open `ADR-001-Data-Immutability-and-Corrections.md`'s "Approval
Model (Phased)" section.

**Code shown:**
```markdown
## Approval Model (Phased)

### V1 (Current)
1. Single-step correction is allowed for authorized Society Admin/Manager
   users.
2. Every correction must capture reason code/text and full audit metadata.

### V2+ (Hardening)
1. Introduce maker-checker workflow for selected or all correction scenarios.
2. Maker submits correction request; checker approves/rejects before posting.
3. Maker and checker must be different users.
```

**Narration:**
> "Financial corrections in this app today can be made by one authorized
   person, alone. A future version requires two different people — one to
   submit, one to approve. Both of those are real, buildable features. The
   question of *which one this app should use right now* isn't a coding
   question at all — it's a question about how much fraud risk this specific
   society is willing to accept at its current size."

---

## Scene 2 — The triggers that decide it (2:00–3:30)

**Visual:** Open the "Maker-Checker Rollout Triggers" list.

**Code shown:**
```markdown
## Maker-Checker Rollout Triggers
Enable maker-checker when one or more of the following is true:
1. Monthly correction count crosses agreed threshold.
2. Per-correction amount crosses agreed financial threshold.
3. Compliance/audit policy explicitly requires dual approval.
4. Fraud-risk incidents indicate need for separation of duties.
```

**Narration:**
> "Here's the part that's genuinely not AI's call to make: what those
   thresholds should actually be, and whether a real incident has crossed
   them. An AI assistant can implement the maker-checker workflow perfectly —
   the state machine, the pending/approved/rejected statuses, the audit
   fields. It cannot tell this specific society what dollar amount, or what
   monthly correction count, represents an acceptable level of risk for them.
   That's a business judgment, made by people who own the consequences."

---

## Scene 3 — A second example: the accepted OWASP gap (3:30–5:00)

**Visual:** Return to `OWASP-Top10-Gap-Review.md`'s A01 gap.

**Code shown:**
```markdown
Open gap:
- A01-GAP-1: No resource-level ownership check... For a single-society app
  this is acceptable, but it is a design assumption that must be documented.
```

**Narration:**
> "Same shape of decision, different domain. The review found a real gap. It
   didn't get silently fixed, and it didn't get silently ignored either — a
   human decision was made to *accept* it, on the explicit condition that it
   gets documented and revisited the moment this app stops being single-
   tenant. Accepting a known risk, on the record, is itself a form of human
   control — arguably a more honest one than pretending every gap must be
   closed immediately."

---

## Scene 4 — The pattern (5:00–6:00)

**Visual:** Talking head.

**Narration:**
> "Both examples share the same shape: AI can implement either option, and AI
   can even lay out the trade-offs clearly. What it can't do is decide how
   much risk a specific business, with specific finances and specific
   customers, should be willing to carry. That decision needs someone who
   answers for the consequences if it's wrong — and that's the actual
   dividing line, not 'is this technically hard.'"

---

## Outro / CTA (6:00–6:30)

**Visual:** End card, final-episode pointer.

**Narration:**
> "One episode left in this playlist — pulling all of this together into what
   it actually means to use AI without handing over your engineering
   judgment."

---

## Production Notes

- **Screen recordings needed:** `ADR-001-Data-Immutability-and-Corrections.md`'s
  Approval Model (Phased) and Maker-Checker Rollout Triggers sections;
  `OWASP-Top10-Gap-Review.md`'s A01 finding (reused from Episode 4, different
  framing).
- **Source material:** files above, read directly from the repository.
- **B-roll:** none required.
