# Playlist B · Episode 1 — "From Vague Ask to Domain Rules"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Discovery & Domain (1 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show requirements analysis and domain modeling as a concrete,
  repeatable skill — not a vague "gather requirements" hand-wave — using PrismApp's
  actual numbered domain rules as the worked example.
- **Title options:**
  1. From Vague Ask to Domain Rules
  2. "Track Who Owns a Flat" Is Not a Requirement. Here's What Is.
  3. How Fuzzy Requirements Become Testable Rules
- **Thumbnail concept:** A sticky note reading "track ownership" on the left, an
  arrow to a numbered rule card "O4 — A unit must always have exactly one active
  owner" on the right.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "'Track who owns each flat.' That's a real sentence a client might actually say to
> you. It is also completely useless as a starting point for writing code. Today:
> how you turn a sentence like that into something you can actually build and test."

---

## Scene 1 — Why "requirements" usually aren't (0:20–1:20)

**Visual:** On-screen text of the vague ask, with several question marks appearing
next to ambiguous words: "who owns" (one owner? co-owners?), "each flat" (before
it's sold? during a sale?), "track" (history, or just current state?).

**Narration:**
> "A one-line request like this hides a dozen real decisions. Can two people own a
> flat at once? What happens the day it's built but not yet sold? What happens
> during the week a sale is being processed? If you start writing a schema before
> answering these, you're not doing requirements analysis — you're guessing, and the
> guesses become bugs six months later when reality doesn't match your assumption."

---

## Scene 2 — Turning ambiguity into a rule (1:20–2:40)

**Visual:** Screen recording — `vault/01-Domain/Domain-Rules.md` open in the editor,
scrolled to the Ownership Rules section, highlighting rules `O3` and `O4`.

**Narration:**
> "Here's what that looks like once the ambiguity is resolved. Rule O3: a unit
> cannot have more than one active owner at any time. Rule O4: a unit must always
> have exactly one active owner. Notice these are two separate rules, not one —
> because 'never more than one' and 'never zero' are genuinely different failure
> modes, and a real system has to guard against both independently. Writing them
> down as short, numbered, falsifiable statements is the whole trick. Each one reads
> like something you could write a test for, because you can."

**On-screen action:** Cursor lingering on the rule text; optionally zoom on the rule
numbers to emphasize the numbering convention.

---

## Scene 3 — The rule that wasn't obvious (2:40–3:50)

**Visual:** Screen recording — same file, scrolled to the "Design note — O4 and
BUILDER_INVENTORY" callout.

**Narration:**
> "Rule O4 creates an immediate follow-up question: what satisfies 'exactly one
> owner' on day zero, before any real buyer exists? This is where domain analysis
> earns its keep — the answer isn't a null, and it isn't a special case sprinkled
> through the code. It's a deliberate design decision, written down once, right next
> to the rule it resolves: a system identity, `BUILDER_INVENTORY`, becomes the
> owner of record from the moment the unit is created. One paragraph of domain
> thinking here saves dozens of 'if owner is null' checks later."

---

## Scene 4 — From rule to specification (3:50–5:00)

**Visual:** Split screen — left: the domain rule text; right: the corresponding
Prisma schema field / API behavior it drives (e.g., unit creation atomically
inserting the first ownership row).

**Narration:**
> "A domain rule by itself doesn't tell an implementer what to build — that's the
> job of specification, the next step down. The rule says a unit must always have
> an owner. The specification says: creating a unit and creating its first ownership
> row must happen as a single atomic operation, so there is never even a millisecond
> where the rule is false. That's the translation this whole channel keeps coming
> back to: real problem, to rule, to spec, to code — never skipping a step."

---

## Scene 5 — Why write rules down at all (5:00–5:50)

**Visual:** Talking head, with the `vault/01-Domain/Domain-Rules.md` file visible in
a small inset.

**Narration:**
> "You could keep all of this in your head, or worse, only in the code. The cost of
> writing it down separately is small — a few lines per rule. The payoff is large:
> anyone, including an AI assistant, can be handed this file and correctly reason
> about the system without reverse-engineering it from a thousand lines of
> TypeScript. It's also the single best defense against a very common failure mode:
> quietly weakening a rule while fixing an unrelated bug, because nobody wrote down
> that the rule existed in the first place."

---

## Outro / CTA (5:50–6:20)

**Visual:** End card pointing to Episode B2.

**Narration:**
> "Next time, we go one level up from individual rules to the shape of the whole
> system — why this app is built in layers, and what problem that actually solves.
> Subscribe if you want to keep building this engineering muscle."

---

## Production Notes

- **Screen recordings needed:** `vault/01-Domain/Domain-Rules.md` (Ownership Rules
  section + the BUILDER_INVENTORY design note callout); a brief cutaway to the
  relevant Prisma schema / service code that implements the atomic unit-creation
  behavior (confirm exact file before recording — likely under
  `src/modules/` for units).
- **Diagrams needed:** none essential; this episode is document-walkthrough driven,
  well suited to PowerPoint text callouts over the vault file rather than custom
  diagrams.
- **Source material to reuse:** `vault/01-Domain/Domain-Rules.md` (Ownership Rules,
  O3/O4 and the design note), `vault/00-Core/Template-Usage-Guide.md` if it
  describes the rule-numbering convention (verify before recording).
- **Fact check before recording:** confirm which file currently implements atomic
  unit + first-ownership-row creation, so Scene 4's code cutaway names a real
  function rather than a paraphrase.
