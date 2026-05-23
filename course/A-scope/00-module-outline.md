# Module Outline — A: Defining Scope (Requirements)

## Identity

| Field | Value |
|---|---|
| Section | A — Defining Scope |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | Basic understanding of software projects; no specific tech required |
| Estimated duration | 45–50 minutes |
| Companion project | PrismApp — Society Management System (GitHub: prismapp) |

---

## Learning Objectives

By the end of this module, the student will be able to:

1. Explain why a single requirements document is insufficient for a real-world system.
2. Separate domain rules, entity contracts, and feature vision into distinct, independently-stable layers.
3. Read a domain rules document and identify constraints that must be enforced by code.
4. Analyse a product vision document and distinguish what is in scope now from what is deliberately deferred.
5. Extract hidden requirements from a plain-English user story by asking the right questions.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 1 | `01-why-scope-definition-fails.md` | Why Requirements Go Wrong | 6 min |
| 2 | `02-requirements-layering.md` | Three Layers, Not One List | 8 min |
| 3 | `03-reading-domain-rules.md` | Reading a Domain Rules Document | 10 min |
| 4 | `04-cmm-vision-as-living-backlog.md` | The Vision as a Living Backlog | 8 min |
| 5 | `05-saying-no-deliberately.md` | Saying No — and Writing It Down | 7 min |
| 6 | `06-hidden-requirements-exercise.md` | Exercise: Finding What Was Never Said | 7 min |

---

## Key Takeaways

1. Not all requirements have the same stability — mixing them in one document is how scope creep breaks your schema.
2. Domain rules are invariants; they are enforced by code, not negotiated in sprints.
3. A good product vision document is as valuable for what it explicitly defers as for what it commits to.
4. "Residents can log complaints" contains at least five hidden requirements that a developer must surface before writing a single line of code.
5. Scope is a team agreement, not a wishlist — it needs a written record.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/01-Domain/Domain-Rules.md` | 2, 3 | Ownership rules O1–O8; Complaint rules CM1–CM13 |
| `vault/CMM/cmm-vision.md` | 4, 5 | Vision sections A–E; Deferred items list |
| `vault/00-Core/System-Overview.md` | 1 | System scope paragraph |
| `AGENTS.md` | 5 | Section 10 — Scope Control |

---

## Assessment / Discussion Questions

1. A teammate says "let's store all business logic in the UI because it's faster to change." What is the risk, and how do domain rules address it?
2. Rule O3 says "a Unit cannot have more than one active owner at any given time." Why can a simple `UNIQUE` index not enforce this by itself?
3. The CMM vision defers photo attachments to a later phase. What infrastructure cost justifies that deferral?
4. A user story says "residents can reopen a complaint if not satisfied." List every question you would ask before writing code.
5. *Stretch:* The vision says ticket IDs are immutable after assignment (CM6). Why does immutability matter here — and what could go wrong if it were not enforced?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | VS Code: `Domain-Rules.md`, `cmm-vision.md`, `AGENTS.md` section 10 |
| Diagrams needed | Requirements layer stack (topic 2); Status lifecycle flow (topic 3/6) |
| Talking-head segments | Intro (45s); topic transitions; wrap-up (60s) |
| B-roll | Society notice board; apartment building exterior |

---

## Status

- [ ] Outline reviewed
- [ ] All topic files drafted
- [ ] Speaker notes complete (`slides/A-scope-notes.md`)
- [ ] PPT built (`slides/A-scope.pptx`)
- [ ] Camtasia recording complete
- [ ] Final edit and export done
