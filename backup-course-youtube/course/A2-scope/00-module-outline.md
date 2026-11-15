# Module Outline — A2: Defining Scope (Part 2 — Domain Rules, Saying No, Exercise)

> **This is Part 2 of Section A.** Part 1 is in [`../A1-scope/00-module-outline.md`](../A1-scope/00-module-outline.md).
> Read Part 1 first for prerequisites and the full learning-objectives list.

## Identity

| Field | Value |
|---|---|
| Section | A2 — Defining Scope (Part 2 of 2) |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | A1 — Scope Part 1 (Why Requirements Fail + Three Layers + Reading Rules) |
| Estimated duration | 22–25 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives (Part 2)

By the end of this part, the student will be able to:

1. Analyse a product vision document and distinguish what is in scope now from what is deliberately deferred.
2. Write a "not in scope" list as a first-class deliverable — not an afterthought.
3. Extract hidden requirements from a plain-English user story by asking the right questions before writing code.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 4 | `04-cmm-vision-as-living-backlog.md` | The Vision as a Living Backlog | 8 min |
| 5 | `05-saying-no-deliberately.md` | Saying No — and Writing It Down | 7 min |
| 6 | `06-hidden-requirements-exercise.md` | Exercise: Finding What Was Never Said | 7 min |

---

## Key Takeaways (Part 2)

1. A vision document is as valuable for what it explicitly defers as for what it commits to.
2. A deferred list without a written rationale will be re-litigated in every sprint review — write it down.
3. "Residents can log complaints" contains at least five hidden requirements a developer must surface before writing a single line of code.
4. Scope is a team agreement, not a wishlist — it needs a written record with an owner.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/CMM/cmm-vision.md` | 4, 5 | Vision sections A–E; Deferred items list |
| `vault/00-Core/System-Overview.md` | 4 | System scope paragraph |
| `AGENTS.md` | 5 | Section 10 — Scope Control |
| `vault/01-Domain/Domain-Rules.md` | 6 | CM1–CM13 as hidden-requirement source |

---

## Assessment / Discussion Questions

1. The CMM vision defers photo attachments to a later phase. What infrastructure cost justifies that deferral?
2. A user story says "residents can reopen a complaint if not satisfied." List every question you would ask before writing code.
3. A teammate wants to add WhatsApp notification in Sprint 1 "since it's already in the vision." How do you respond?
4. *Stretch:* Rule CM6 says ticket IDs are immutable after assignment. Why does immutability matter here — and what could go wrong if it were not enforced?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | VS Code: `cmm-vision.md`, `AGENTS.md` section 10, `Domain-Rules.md` CM rules |
| Diagrams needed | Status lifecycle flow (topic 6 exercise intro) |
| Talking-head segments | Intro to Part 2 (30s); wrap-up for full Section A (90s) |

---
