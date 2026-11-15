# Slide Script — A-01: Why Requirements Go Wrong

---

## Slide 1 — Opening: The Two Project Killers

**Type:** `Title`

**Headline:**
> Most software projects don't fail from bad code. They fail from bad scope.

**Visual / layout:**
Two large words centered on a dark background: **SCOPE** and **CODE**. A line crosses out CODE; an arrow underlines SCOPE. Clean, minimal.

**Narration:**
Sometimes a software project goes over budget. Sometimes it misses its deadline. Sometimes it is rebuilt from scratch within two years.

The post-mortem almost always points to the same two causes.

The team built the wrong thing. Or the team built the right thing, but kept changing what "right" meant.

Neither of those is a coding problem. Both are scope problems.

In this module, we will learn how to define scope well.

Good scope is precise enough to guide engineers. It is honest enough to set stakeholder expectations. And it is structured enough to survive the changes that come in every real project.

We will use a real application as our working example. It is PrismApp, a Society Management System built for a residential apartment complex.

**On-screen action / demo:**
Open project root in VS Code. Show the top-level folder structure briefly — `app/`, `vault/`, `prisma/`. No deep dive yet.

**Key takeaway:**
Scope failure is more common than code failure — and more preventable.

---

## Slide 2 — The Single-Document Trap

**Type:** `Concept`

**Headline:**
> One requirements document means one revision wipes out everything.

**Visual / layout:**
A single large document icon labelled "Requirements v1.0". Arrows pointing to it from multiple directions labelled: *Developer*, *Manager*, *Client*, *Tester*. A red stamp over it: OUTDATED.

**Narration:**
Most students learn to write a Software Requirements Specification. This is called an SRS.

Students then treat the SRS as the source of truth for the entire project.

The problem is not the document itself. The problem is one document doing three different jobs at the same time.

First, it describes what the business can never allow. One example is the rule "a flat cannot have two owners at the same moment."

Second, it describes what the data looks like. That means entities, fields, and relationships.

Third, it describes which features the product should have in version one.

Each of these three things changes at a different rate.

Features change constantly. So you re-open the document again and again.

Each time, you risk accidentally changing the rules that should never change.

**On-screen action / demo:**
None — static concept slide.

**Key takeaway:**
Requirements mixed at different stability levels corrupt each other during revision.

---

## Slide 3 — Three Rates of Change

**Type:** `Concept`

**Headline:**
> Rules never change. Contracts rarely change. Features change every sprint.

**Visual / layout:**
A horizontal timeline labelled "Project lifetime" at the top. Three rows, each with a different colour and frequency of change marker:
- Row 1 (red): **Domain Rules** — flat line, zero changes
- Row 2 (amber): **Entity Contracts** — one or two bumps over the timeline
- Row 3 (green): **Feature Vision** — frequent peaks and troughs

**Narration:**
Think of requirements as three separate buckets. Each bucket has a different rate of change.

The first bucket is domain rules. These are the invariants. They are the things the business can never allow, whatever feature we build.

"A unit cannot have two active owners." "A contribution record cannot be deleted once posted." These rules do not change between sprints.

The second bucket is entity contracts. They describe what data exists, what it is called, and how entities relate to each other.

These change occasionally. A new field is added. A relationship is refactored. But they are far more stable than features.

The third bucket is the feature vision. It describes what the application does for users in a given version.

This bucket changes constantly. Priorities shift. Customers ask for new things. Competitors release new features.

Separating these three buckets is the foundation of good requirements work.

The rest of this module shows exactly how PrismApp does it.

**On-screen action / demo:**
None — static diagram slide.

**Key takeaway:**
Separate your requirements by rate of change — rules, contracts, features — before you write a single entity.

---

## Transition note

We have seen *why* requirements fail and *what* the three buckets are. Next we will open the actual PrismApp vault and see how each bucket is captured in a separate document — and why that separation saved the project during the CMM module.
