# Slide Script — A-01: Why Requirements Go Wrong

---

## Slide 1 — Opening: The Two Project Killers

**Type:** `Title`

**Headline:**
> Most software projects don't fail from bad code. They fail from bad scope.

**Visual / layout:**
Two large words centered on a dark background: **SCOPE** and **CODE**. A line crosses out CODE; an arrow underlines SCOPE. Clean, minimal.

**Narration:**
When a software project goes over budget, misses its deadline, or gets rebuilt from scratch within two years, the post-mortem almost always points to the same two causes: the team built the wrong thing, or they built the right thing but kept changing what "right" meant.

Neither of those is a coding problem. Both are scope problems.

In this module we are going to look at how to define scope in a way that is precise enough to guide engineers, honest enough to set stakeholder expectations, and structured enough to survive the inevitable changes that come in every real project.

We will use a real application — PrismApp, a Society Management System built for a residential apartment complex — as our working example throughout.

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
Most students are taught to write a Software Requirements Specification — an SRS — and treat it as the source of truth for the entire project.

The problem is not with having a document. The problem is when one document tries to do three completely different jobs at the same time.

It tries to describe what the business absolutely cannot allow — rules like "a flat cannot have two owners at the same moment." It also tries to describe what the data looks like — entities, fields, relationships. And it tries to describe what features the product should have in version one.

Each of those three things changes at a completely different rate. Mixing them in the same document means every time a feature changes — which happens constantly — you re-open the document, and you risk accidentally modifying the rules that should never change.

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
Think of requirements in three separate buckets, each with a different rate of change.

The first bucket is domain rules. These are the invariants — the things the business can never allow, regardless of what feature is being built. "A unit cannot have two active owners." "A contribution record cannot be deleted once posted." These do not change between sprints.

The second bucket is entity contracts — what data exists, what it is called, how entities relate to each other. These change occasionally: a new field gets added, a relationship is refactored. But they are far more stable than features.

The third bucket is the feature vision — what the application does for users in a given version. This changes constantly. Priorities shift, customers ask for new things, competitors release features.

Separating these three buckets is the foundational discipline of good requirements work. The rest of this module will show you exactly how PrismApp does it.

**On-screen action / demo:**
None — static diagram slide.

**Key takeaway:**
Separate your requirements by rate of change — rules, contracts, features — before you write a single entity.

---

## Transition note

We have seen *why* requirements fail and *what* the three buckets are. Next we will open the actual PrismApp vault and see how each bucket is captured in a separate document — and why that separation saved the project during the CMM module.
