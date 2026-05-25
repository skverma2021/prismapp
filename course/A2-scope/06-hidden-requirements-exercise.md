# Slide Script — A-06: Exercise — Finding What Was Never Said

---

## Slide 1 — The Exercise Setup

**Type:** `Exercise`

**Headline:**
> "Residents can log complaints." Count the requirements hiding in that sentence.

**Visual / layout:**
A single sentence centred in large type: *"Residents can log complaints."*
Below it, a blank list with numbered placeholders: 1. __ 2. __ 3. __ 4. __ 5. __ with a prompt: "Pause here. List your answers before continuing."

**Narration:**
Here is the exercise. A product manager writes one sentence in the requirements document: "Residents can log complaints."

That sentence is not wrong. But it is dangerously incomplete.

Before you watch the next slide, pause. List every question that sentence raises. Think about who can do it, what data it requires, what happens after, who can see the result, and what the system must never allow.

I will give you 60 seconds.

[pause]

Let us compare your list.

**On-screen action / demo:**
Show a blank whiteboard or empty document. Wait before advancing.

**Key takeaway:**
A single user story sentence can hide ten requirements. Your job as an engineer is to surface them before you start building.

---

## Slide 2 — The Hidden Requirements, Revealed

**Type:** `Concept`

**Headline:**
> Five categories of questions that every user story must answer.

**Visual / layout:**
Five coloured rows, each with a category label and 2–3 bullet points:

**WHO** (blue)
- Who counts as a "resident"? (Only current residents, or also owners? Former residents?)
- Who can *see* the complaint once submitted?
- Can a non-resident submit on behalf of a resident?

**WHAT** (green)
- What data is required? (Title? Description? Category? Photo?)
- What is the minimum valid input — and what is rejected?
- Is the reporter identity always required, or can it be anonymous?

**WHEN** (amber)
- When does the lifecycle begin and end?
- Can a complaint be reopened, and for how long?
- What happens if the SLA is breached?

**HOW MANY** (teal)
- Can one resident submit multiple complaints?
- Can the same complaint be submitted by multiple residents (upvote)?
- Is there a limit per unit per day?

**WHAT NEVER** (red)
- Can a complaint be deleted?
- Can the ticket ID change?
- Can a Closed complaint be reopened?

**Narration:**
Here is a framework for surfacing hidden requirements. Five categories of questions applied to any user story.

**Who** — the sentence says "residents" but does not define it. In PrismApp, `Individual` covers owners, residents, and third-party payers. A complaint reporter must be a valid `Individual`, but does not need to be an active resident. Rule CM8 requires a category, which implies the reporter picks from a list. Already we have data requirements the original sentence never mentioned.

**What** — the sentence says "log" a complaint but does not say what that means. The domain rules document answers this: title, description, category, priority, unit reference, and a reporter identity. Five fields, all mandatory.

**When** — the sentence says nothing about time. But the domain rules define a six-state lifecycle, a 48-hour reopen window, and SLA targets. Three temporal constraints that were completely invisible in the original sentence.

**How many** — not addressed. The current implementation allows unlimited complaints per unit. But the vision mentions upvoting as a deduplication mechanism — which means the team has thought about it and explicitly deferred it.

**What never** — this is often the most important category. CM4 says once a complaint is Closed and the reopen window has elapsed, no further transitions are permitted. CM6 says the ticket ID is immutable. These are the "what never" rules, and they are among the hardest things to retrofit if you discover them after data is in production.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. For each category, point to the corresponding rule:
- WHO → CM12/CM13 (anonymity and role-based visibility)
- WHAT → CM8/CM9 (category and priority required)
- WHEN → CM1–CM5 (lifecycle), CM3 (48-hour window)
- HOW MANY → CM7 (unique ticket ID)
- WHAT NEVER → CM4 (no transitions after closed), CM6 (immutable ticket ID)

**Key takeaway:**
Apply WHO / WHAT / WHEN / HOW MANY / WHAT NEVER to every user story before writing any code. These five questions surface the requirements that stakeholders never think to mention.

---

## Slide 3 — Module Wrap-Up

**Type:** `Summary`

**Headline:**
> What we covered in this module.

**Visual / layout:**
Five bullet points, each matching a learning objective, with a brief one-line recap:
1. **Why requirements fail** — mixing stability levels in one document
2. **Three layers** — rules (never change), contracts (rarely change), vision (every sprint)
3. **Reading domain rules** — scan for must/cannot, temporal qualifiers, actor qualifiers
4. **Vision as backlog** — direction + deferred list, not a feature checklist
5. **Hidden requirements** — WHO / WHAT / WHEN / HOW MANY / WHAT NEVER

**Narration:**
Let us recap what we covered.

We started by looking at why a single requirements document fails — because different requirements have completely different rates of change, and mixing them means every feature revision threatens the rules.

We introduced three layers: domain rules as invariants enforced by code, entity contracts as the stable structure those rules demand, and the feature vision as the evolving delivery plan.

We practised reading a domain rules document — specifically how to classify each rule by the implementation artefact it demands: a database constraint, a service-layer check, or a transaction guard.

We analysed the CMM vision document and learned that a good vision document is as valuable for its deferred list as for its committed features.

And we practised the hidden requirements exercise — using five question categories to surface everything that a plain-English user story leaves unsaid.

These habits do not require any particular tool or technology. They apply to any project in any stack.

In the next module we will take the domain rules and entity contracts from this module and turn them into an Entity Relationship Diagram — showing exactly how the rules drive the schema design.

**On-screen action / demo:**
Briefly show the vault folder structure one final time:
`vault/01-Domain/Domain-Rules.md` → `vault/01-Domain/ERD.md` → `vault/CMM/cmm-vision.md`
Name each layer as you point to its file.

**Key takeaway:**
Define scope in layers. Lock the rules. Version the vision. Surface what was never said — before you write a line of code.

---

## Production checklist for this slide group

- [ ] Narration timed (target: 7 minutes)
- [ ] Blank whiteboard ready for exercise pause in Slide 1
- [ ] All five question categories rehearsed with live vault navigation
- [ ] Speaker notes pasted into PPT notes panel
- [ ] Camtasia clip recorded and labelled `A-06-hidden-requirements-exercise`
