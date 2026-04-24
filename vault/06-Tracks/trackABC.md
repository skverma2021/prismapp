User: Although I am working solo, I want to get close (to the extent possible) to a production-grade app - Track-A
I want to gift a working app (SQLite version) to my society - Track-B
I want to prepare an AI-augmented course as well - Track-C

I will be testing the present app and plan for future - new modules on Safety, Security, and Organizing events etc. Meanwhile please suggest a full course outline (Track-C)


GitHub Copilot: A good way to structure Track-C is to make the course about building one serious app with AI, not about “learning Copilot features.” The app becomes the vehicle; the real learning outcomes are:
•	strategy, 
•	requirements, 
•	design, 
•	prompting, 
•	verification, 
•	testing, 
•	review, and 
•	controlled delivery

I would run it as a 12-week intermediate project course with PrismApp as the spine. That gives enough time to cover the AI-augmented workflow properly without collapsing into prompt demos.

**Course Title**
AI-Augmented Development of an Information System

**Course Positioning**
Intermediate, project-based, studio format

**Primary Goal**
Teach students how to use AI as a development multiplier across the full SDLC while still applying human judgment in scoping, requirements, design, coding, testing, review, and release decisions.

**Course Outcomes**
By the end of the course, students should be able to:
1. Translate a business problem into strategy, scope, users, domain rules, and acceptance criteria.
2. Produce usable design artifacts before coding.
3. Use AI tools to accelerate coding, refactoring, documentation, and test generation.
4. Critically review AI output for correctness, risk, and maintainability.
5. Build and validate one non-trivial information system module.
6. Explain the difference between feature completeness and production readiness.
7. Document development decisions, tradeoffs, and residual risks.

**Course Spine**
Use the current PrismApp repository as the working system.
Students should repeatedly work with artifacts such as:
1. Product-Delivery-Strategy.md
2. Domain-Rules.md
3. ERD.md
4. Roles-and-Permissions.md
5. Execution-Status.md
6. ADR-003-Ownership-Continuity-and-Builder-Inventory.md

**Suggested Weekly Structure**
Each week should have:
1. One concept lecture
2. One guided studio/lab
3. One applied deliverable
4. One reflection on AI use

**13-Week Outline (Week 0 + 12 Weeks)**

**Week 0 (Self-Paced Pre-Work)**
Theme: Environment Setup and Orientation
1. Clone the PrismApp repo, install dependencies, run `npm run dev`.
2. Read AGENTS.md and vault/00-Core/System-Overview.md end to end.
3. Browse the running app: navigate blocks, units, individuals, contributions.
4. Set up Git identity, create a personal branch, make one trivial commit and push.

Deliverable:
1. One-page "What I understand so far" note covering: what the system does, who the users are, what stack it uses, and one question the student wants answered.

Instructor note:
This prevents Week 1 from being consumed by setup logistics and ensures every student enters with a running environment and a minimum shared baseline.

**Week 1**
Theme: AI-Augmented Development Mindset
1. Why AI changes software development but does not remove engineering responsibility.
2. Difference between using AI for syntax generation and using AI across the SDLC.
3. Introduce PrismApp as the semester-long case.
4. Prompting primer: how to frame a task for AI (context, constraint, output format). This is a lightweight introduction; Week 6 will go deep.
5. Version control discipline: why checkpointing before every AI-generated change matters. Branch, commit, diff, revert as survival skills.

Lab:
1. Explore the repo, vault, domain docs, and route structure.
2. Ask AI to explain one module, then verify manually.
3. Practice: create a branch, ask AI to make a small change, review the diff, commit or revert.

Deliverable:
1. Short critique of the system: what it is, who it serves, what is already strong, what is risky.
2. Prompt log entry for the AI explanation task (first entry in the semester-long prompt journal).

**Week 2**
Theme: Product Strategy and Scope
1. Product vision, stakeholders, scope control, and success criteria.
2. Why AI performs better when strategy is explicit.
3. Converting a vague problem into a delivery roadmap.

Lab:
1. Analyze Product-Delivery-Strategy.md.
2. Rewrite or refine scope for a constrained release.

Deliverable:
1. Product brief with users, goals, non-goals, release scope, and success metrics.

**Week 3**
Theme: Requirements Gathering and Domain Rules
1. User stories versus domain rules.
2. Temporal rules, invariants, and edge cases.
3. Why most AI-generated bugs come from weak requirements, not weak code generation.

Lab:
1. Read Domain-Rules.md and derive acceptance criteria.
2. Use AI to draft missing rules, then manually review them.

Deliverable:
1. Requirements pack: user stories, business rules, edge cases, acceptance criteria.

**Week 4**
Theme: Database Design and Data Integrity
1. ERD design, normalization, constraints, uniqueness, history tables.
2. Service-layer validation versus database constraints.
3. Production concerns: auditability, backfill, migration safety.
4. Schema evolution in practice: writing migrations, seeding data, validating on a clean database.

Lab:
1. Analyze ERD.md against schema.prisma.
2. Use AI to propose a schema change and critique it.
3. Hands-on: write a Prisma migration for the proposed change, run `prisma migrate dev`, then run `prisma db seed` and verify the seed script still works.

Deliverable:
1. ERD review memo and one schema change proposal with rationale.
2. Migration file and seed validation evidence (screenshot or terminal output).

**Week 5**
Theme: UI/UX Design for Operator Systems
1. UI design for admin/operator workflows.
2. Tables, filters, forms, timelines, and status semantics.
3. Using AI for UI generation without producing incoherent UX.

Lab:
1. Review one dashboard page and identify operator friction.
2. Use AI to redesign it with explicit constraints.

Deliverable:
1. UI wireframe or screen redesign proposal linked to workflow goals.

**Week 6**
Theme: Advanced Prompting, Task Framing, and Human Review
1. Deep dive into prompting strategy (Week 1 covered the basics; this week is the advanced pass).
2. Small scoped tasks versus vague large requests.
3. Context management: what to include in a prompt, what to leave out, when to use file attachments versus inline snippets.
4. Review heuristics: correctness, coupling, data integrity, hidden regressions.
5. The "AI was wrong here" pattern: how to detect, document, and recover from bad AI output.

Lab:
1. Give Copilot the same task framed three different ways.
2. Compare code quality and rework cost.
3. Deliberately introduce a subtle domain-rule violation via AI and practice catching it in review.

Deliverable:
1. Prompt log with before/after prompts and evaluation of AI output.
2. One documented "AI was wrong here" analysis with root cause and correction.

**Week 7**
Theme: Backend Implementation with AI
1. Route handlers, services, schema parsing, validation.
2. Keeping domain rules server-side.
3. Refactoring AI-generated code to fit architecture.

Lab:
1. Implement or extend one backend slice with AI assistance.
2. Review against existing module patterns in modules.

Deliverable:
1. One implemented backend feature with a short engineering note explaining what AI generated and what the student corrected.

**Week 8**
Theme: Frontend Implementation with AI
1. State management, filters, pagination, edit flows, error surfaces.
2. Avoiding “generated UI clutter.”
3. Making UI behavior consistent with backend rules.

Lab:
1. Add or improve one browse or edit flow.
2. Verify it against the service/API behavior.

Deliverable:
1. One UI feature or refinement plus screenshots and validation notes.

**Week 9**
Theme: Testing AI-Generated Systems
1. Unit, integration, API, and manual workflow testing.
2. What AI can generate well in tests and where it often lies.
3. Testing for invariants and regressions.
4. Testing the AI's assumptions: give AI a domain rule with a subtle edge case, let it generate tests, then show that the generated tests pass but miss the invariant.

Lab:
1. Review existing scripts such as `scripts/test-*.mjs`.
2. Add regression tests for a real rule, not just a happy path.
3. Edge-case drill: pick one temporal or financial rule (e.g., ownership overlap prevention, rate-period coverage). Ask AI to generate test cases. Identify which edge the AI missed. Write the missing test manually.

Deliverable:
1. Test plan plus implemented regression cases.
2. "AI-generated tests gap analysis" showing which invariant the AI missed and the manually written test that catches it.

**Week 10**
Theme: Security, Roles, and Production Readiness
1. AuthN, AuthZ, audit, data protection, and operator accountability.
2. Difference between internal app security and public production security.
3. Why “works locally” is not a release decision.

Lab:
1. Review Roles-and-Permissions.md against the code.
2. Use AI to identify gaps, then validate manually.

Deliverable:
1. Production-readiness gap assessment.

**Week 11**
Theme: Release Planning, Branching, and AI in Maintenance
1. Branch-based work, preview branches, focused feature branches, ADR-driven changes.
2. AI for debugging, code review, migration planning, and documentation updates.
3. Maintaining coherence in an evolving codebase.

Lab:
1. Trace one feature across docs, schema, services, UI, and tests.
2. Use AI to draft an ADR or implementation plan.

Deliverable:
1. Change set plan for a future module or hardening milestone.

**Week 12**
Theme: Capstone Presentation and Reflection
1. Demonstrate one meaningful slice.
2. Defend architecture and review decisions.
3. Reflect on where AI helped, where it hurt, and what human skill mattered most.

Capstone deliverables:
1. Updated design artifacts
2. Working implementation
3. Test evidence
4. AI usage log
5. Reflection report

**Recommended Student Project Structure**
Instead of having every student do everything, use bounded work packages. Good team or individual slices are:
1. Master data browse/edit consistency
2. Ownership and residency rules
3. Contribution capture and correction flow
4. Reporting and CSV export
5. Auth, roles, audit, and hardening
6. Observability and error diagnostics (structured logging, error envelopes, request-ID tracing, production debugging)
7. Offline SQLite packaging path
8. Future module design for Safety, Security, or Events

**Assessment Scheme**
A balanced rubric works best:
1. 15% strategy and scope artifacts
2. 20% requirements and design artifacts
3. 15% implementation quality
4. 25% testing and validation
5. 15% AI usage discipline and review quality
6. 10% final reflection and presentation

Rationale for weighting testing higher than implementation: AI will generate most of the code. The hard skill is knowing whether the code is correct, not producing it.

**What to Grade Explicitly**
Do not grade only the final code. Grade:
1. Prompt quality
2. Ability to reject bad AI output
3. Traceability from requirement to implementation
4. Testing depth
5. Documentation quality
6. Risk identification

**Minimum Deliverables Per Student or Team**
1. Product brief
2. Requirements pack
3. ERD or schema review
4. UI design note
5. Prompt journal
6. Implemented feature branch
7. Test evidence
8. Production-readiness or deployment-readiness review
9. Final reflection

**Reflection Questions**
These are important because they force students to internalize the new paradigm:
1. What part of the task did AI accelerate most?
2. What part required the most human judgment?
3. What incorrect assumptions did AI make?
4. How did requirements quality affect generated code quality?
5. What would break if this were released without more review?

**Instructor Notes**
To keep the course rigorous:
1. Require design artifacts before implementation starts.
2. Require prompt logs for all major AI-assisted tasks.
3. Require at least one “AI was wrong here” analysis.
4. Penalize unverified generated code.
5. Reward thoughtful scoping, review, and test design.

**How This Connects to Your Three Tracks**
Track-A:
1. Students learn what production-grade really means beyond feature delivery.

Track-B:
1. Students can also see how a constrained offline SQLite version changes architecture and deployment choices.

Track-C:
1. The course directly teaches AI-augmented analysis, design, coding, testing, and iteration using a real evolving system.

---

## Week-by-Week Lecture + Lab Plan

**Format:** 3 contact hours per week — 1 hour lecture, 2 hours studio/lab.
**Assumed class size:** 15–30 students, working individually or in pairs.
**Tools required:** VS Code with GitHub Copilot, Git, Node.js 20+, PostgreSQL (local or shared), a shared PrismApp repo fork per student/pair.

---

### Week 0 — Environment Setup and Orientation (Self-Paced, No Contact Hours)

**Pre-work checklist (estimated 3–4 hours independent):**

| # | Activity | Time | Output |
|---|----------|------|--------|
| 1 | Install Node.js 20+, VS Code, Git, PostgreSQL (or receive cloud DB credentials) | 45 min | Working toolchain |
| 2 | Clone PrismApp repo, run `npm install`, copy `.env.example` to `.env`, configure DB URL | 30 min | Repo on disk |
| 3 | Run `npx prisma migrate dev` and `npx prisma db seed` | 15 min | Seeded database |
| 4 | Run `npm run dev`, open browser, navigate Blocks → Units → Individuals → Contributions | 30 min | App running locally |
| 5 | Read AGENTS.md end to end | 30 min | Familiarity with project rules |
| 6 | Read vault/00-Core/System-Overview.md | 20 min | Domain understanding |
| 7 | Create personal Git branch, make one trivial commit (e.g., add name to a CONTRIBUTORS.md), push | 15 min | Git workflow verified |
| 8 | Write one-page "What I understand so far" note | 30 min | **Deliverable W0-1** |

**Instructor action before Week 1:** Review submitted notes. Flag students who could not get the app running — resolve before first lecture.

---

### Week 1 — AI-Augmented Development Mindset

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | Course introduction: objectives, structure, assessment, tooling | 10 |
| 2 | Why AI changes development but does not remove engineering responsibility | 15 |
| 3 | Using AI for syntax versus using AI across the SDLC — show real examples from PrismApp's own Git history | 10 |
| 4 | Prompting primer: context, constraint, output format. Live demo: ask Copilot to explain the blocks module, show how prompt quality changes the answer | 15 |
| 5 | Version control discipline: branch → prompt AI → diff → commit or revert. Why checkpointing is a survival skill | 10 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Explore repo structure: `app/`, `src/modules/`, `prisma/`, `vault/`. Map the architecture on a whiteboard or shared doc | 25 |  |
| 2 | Pick one module (e.g., ownerships). Ask AI: "Explain how ownership timeline management works in this codebase." Read the AI's answer. Then read `src/modules/ownerships/ownerships.service.ts` and `vault/01-Domain/Domain-Rules.md` manually. Note what AI got right, wrong, or missed | 35 | Notes |
| 3 | Create a branch. Ask AI to add a `console.log` to one route handler. Review the diff. Commit. Then ask AI to revert it. Review the diff again. Commit the revert | 20 | Git log |
| 4 | Write first prompt journal entry: what you asked, what AI returned, what was correct, what was not | 20 | **Deliverable W1-1** |
| 5 | Write system critique: what PrismApp is, who it serves, what is strong, what is risky | 20 | **Deliverable W1-2** |

---

### Week 2 — Product Strategy and Scope

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | What is product strategy? Vision, stakeholders, scope, success criteria | 15 |
| 2 | The cost of vague scope on AI-assisted projects: AI generates more, so scope discipline matters more | 10 |
| 3 | Walk through PrismApp's Product-Delivery-Strategy.md: what is in V1, what is deferred, why | 15 |
| 4 | Exercise preview: "Your society has 200 flats and wants an app in 8 weeks. What do you cut?" | 10 |
| 5 | How to write non-goals that protect delivery focus | 10 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Read Product-Delivery-Strategy.md (if exists) or AGENTS.md §6 Delivery Roadmap and §10 Scope Control | 20 |  |
| 2 | In pairs: write a product brief for a hypothetical constrained release — pick 3 modules only. Define users, goals, non-goals, release scope, success metrics | 40 | Draft |
| 3 | Ask AI to critique the product brief. Evaluate whether AI's suggestions improve focus or add scope creep | 20 | Prompt journal entry |
| 4 | Refine the brief. Peer-review with another pair | 20 |  |
| 5 | Finalize and submit | 20 | **Deliverable W2-1** |

---

### Week 3 — Requirements Gathering and Domain Rules

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | User stories versus domain rules — both are necessary, they serve different purposes | 15 |
| 2 | Temporal rules and invariants: ownership overlap, rate effectivity, period constraints. Walk through Domain-Rules.md §Ownership, §Contribution | 20 |
| 3 | Why most AI-generated bugs come from weak requirements, not weak code generation. Case study: the rate-period coverage edge case found during PrismApp testing | 15 |
| 4 | Acceptance criteria format: Given/When/Then with boundary conditions | 10 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Read vault/01-Domain/Domain-Rules.md in full | 25 |  |
| 2 | Pick one domain area (e.g., residency). Derive 5+ acceptance criteria from the rules, including at least 2 edge cases | 30 | Draft criteria |
| 3 | Ask AI to generate acceptance criteria for the same domain area. Compare AI output with your manually written criteria. What did AI add? What did it miss? | 25 | Prompt journal entry |
| 4 | Merge into a requirements pack: user stories, business rules, edge cases, acceptance criteria | 30 | **Deliverable W3-1** |
| 5 | Peer review: swap packs with another pair. Flag any missing edge case | 10 |  |

---

### Week 4 — Database Design and Data Integrity

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | ERD design principles: normalization, denormalization tradeoffs, constraints, uniqueness, history/temporal tables | 15 |
| 2 | Walk through PrismApp ERD.md and compare with prisma/schema.prisma. Show where schema constraints match domain rules and where service-layer validation fills the gap | 20 |
| 3 | Migration safety: what a migration is, why order matters, how to write reversible changes | 10 |
| 4 | Seeding and reproducibility: why `prisma db seed` must work on an empty database at all times | 5 |
| 5 | Demo: show a real migration from `prisma/migrations/` — read the SQL, explain the change | 10 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Read vault/01-Domain/ERD.md. Open schema.prisma side-by-side. Annotate 3 differences or design choices between the conceptual ERD and the physical schema | 25 |  |
| 2 | Ask AI to propose a schema change (e.g., "add an email log table" or "add a secondary contact phone to Individual"). Critique the AI's proposal: does it respect existing constraints? Does it need a migration? What about existing data? | 25 | Prompt journal entry |
| 3 | Implement the proposed change: edit schema.prisma, run `npx prisma migrate dev --name <descriptive-name>`, inspect the generated SQL | 25 | Migration file |
| 4 | Run `npx prisma db seed`. Verify no seed errors. If errors occur, diagnose and fix | 15 | Terminal evidence |
| 5 | Write ERD review memo: change rationale, migration SQL, seed validation result | 30 | **Deliverable W4-1** |

---

### Week 5 — UI/UX Design for Operator Systems

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | Operator systems versus consumer apps: different UX priorities (density, efficiency, error prevention, audit trail) | 15 |
| 2 | Walk through PrismApp's shared table/filter/form patterns: how one component serves 8 pages | 15 |
| 3 | Common AI-generated UI problems: incoherent layouts, inconsistent state handling, missing validation, accessibility gaps | 15 |
| 4 | Wireframing for operator workflows: what to specify before asking AI to generate UI code | 15 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Pick one dashboard page (e.g., /ownerships or /contributions). Use the running app. Identify 2–3 operator friction points (confusing flow, missing feedback, extra clicks) | 25 |  |
| 2 | Sketch a redesign (paper, Figma, or Markdown wireframe). Specify constraints: which fields, which filters, what happens on error, what the operator sees after save | 25 | Wireframe |
| 3 | Ask AI to generate a React component for the redesigned flow. Provide your wireframe constraints in the prompt. Evaluate the result: does it match the wireframe? Does it handle validation and error states? | 30 | Prompt journal entry |
| 4 | Write UI redesign proposal linking wireframe to workflow goals, noting what AI generated well and what needed manual correction | 30 | **Deliverable W5-1** |

---

### Week 6 — Advanced Prompting, Task Framing, and Human Review

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | Recap: Week 1 primer was "how to frame a task." This week: systematic prompting strategy for complex tasks | 10 |
| 2 | Task decomposition: break large changes into small, testable prompts. Show a real example — PrismApp's shared table extraction (8 pages, done in stages, not one prompt) | 15 |
| 3 | Context management: what to attach (file, vault doc, error message), what to state (constraint, architecture rule), what to omit (irrelevant files, speculative features) | 15 |
| 4 | Review heuristics: correctness (does it match the spec?), coupling (does it break other modules?), data integrity (does it bypass constraints?), hidden regressions (does it change behavior elsewhere?) | 10 |
| 5 | The "AI was wrong here" pattern: detect, document, recover. Why this skill is more valuable than prompting | 10 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Pick one real task (e.g., "add a `notes` field to the Ownership edit form, persisted to the database"). Frame the task three different ways: (A) vague one-liner, (B) structured prompt with context, (C) structured prompt with context + constraints + output format | 30 |  |
| 2 | Execute all three prompts. Record AI output for each. Compare: lines of code, correctness, number of manual fixes needed, time to working state | 30 | Comparison table |
| 3 | Deliberately introduce a subtle domain-rule violation via AI (e.g., prompt AI to allow overlapping ownerships). Review the generated code. Identify the violation. Document how you caught it | 25 | "AI was wrong here" analysis |
| 4 | Write prompt log with before/after prompts, evaluation, and the "AI was wrong here" analysis | 35 | **Deliverable W6-1** |

---

### Week 7 — Backend Implementation with AI

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | PrismApp backend architecture: route handler → service → Prisma. Zod for input parsing. Shared error envelope | 15 |
| 2 | Live walkthrough: trace a POST /api/contributions request from route.ts → service → schema → database | 15 |
| 3 | Domain rules must live server-side: why client-side validation is UX, not enforcement | 10 |
| 4 | Refactoring AI-generated code to fit existing patterns: imports, error handling, naming, file placement | 10 |
| 5 | Assign backend feature task (one per student/pair, from the bounded work packages list) | 10 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Review 2–3 existing modules in `src/modules/` to internalize the pattern: schema file, service file, route handler | 20 |  |
| 2 | Implement or extend one backend feature using AI assistance. Examples: add a new query filter to an existing list endpoint, add a validation rule to a service, add a new lookup endpoint | 50 | Working code |
| 3 | Run `npm run lint` and `npm run build`. Fix any errors | 15 | Clean build |
| 4 | Test the feature using a script or curl/httpie. Verify success and error paths | 15 | Test evidence |
| 5 | Write engineering note: what AI generated, what you corrected, what patterns you followed, what domain rule you enforced | 20 | **Deliverable W7-1** |

---

### Week 8 — Frontend Implementation with AI

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | PrismApp frontend architecture: Server Components for data fetch, Client Components for interactivity, shared table/filter/form components | 15 |
| 2 | State management in the app: URL query state for filters, React state for forms, server revalidation after mutations | 15 |
| 3 | Common AI frontend failures: inconsistent state, missing loading/error states, broken accessibility, ignoring existing component library | 15 |
| 4 | How to write a frontend prompt that produces consistent results: reference existing components, specify behavior on empty/error/loading states | 15 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Pick one browse or edit flow to add or improve (aligned with the backend feature from Week 7 if possible) | 10 |  |
| 2 | Review 1–2 existing page components to see the pattern: data fetching, table rendering, filter handling, form submission | 20 |  |
| 3 | Implement the UI feature with AI assistance. Reference existing shared components in the prompt | 40 | Working page |
| 4 | Verify against the backend: does the form send correct data? Does the table show correct columns? Do filters work? Do error messages surface? | 20 | Screenshots |
| 5 | Write validation notes: what works, what AI got wrong, what you fixed | 30 | **Deliverable W8-1** |

---

### Week 9 — Testing AI-Generated Systems

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | Test levels for an information system: unit (domain logic), integration (service + DB), API (route handlers), workflow (end-to-end user paths) | 15 |
| 2 | What AI generates well in tests: happy-path coverage, API call structure, boilerplate setup. What it misses: boundary conditions, temporal edge cases, financial invariants | 15 |
| 3 | Demo: the PrismApp rate-period coverage edge case. Show how AI-generated tests pass but miss the real invariant | 15 |
| 4 | "AI-generated tests gap analysis" as a technique: let AI write tests, then audit for what it assumed but did not verify | 15 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Review `scripts/test-*.mjs` — understand the existing test approach: API-level, authenticated, sequential | 20 |  |
| 2 | Pick one temporal or financial rule (e.g., ownership overlap prevention, contribution duplicate prevention, rate-period coverage). Ask AI to generate test cases for it | 25 | AI-generated tests |
| 3 | Run the AI-generated tests. Record pass/fail. For passing tests, ask: "Does passing actually prove the invariant, or does it just prove the happy path?" | 20 | Analysis |
| 4 | Identify the edge case AI missed. Write the missing test manually. Run it. Document the gap | 25 | Manual test |
| 5 | Write test plan + gap analysis report | 30 | **Deliverable W9-1** |

---

### Week 10 — Security, Roles, and Production Readiness

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | AuthN versus AuthZ: what they are, why both matter, how they layer | 10 |
| 2 | PrismApp's auth model: NextAuth sessions, role-based guards (`requireReadRole`, `requireMutationRole`), the proxy request-ID wiring for traceability | 15 |
| 3 | OWASP Top 10 for internal operator apps: injection, broken access control, security misconfiguration, insecure deserialization | 15 |
| 4 | "Works locally" is not a release decision: what production readiness actually requires (audit trail, error handling, data protection, backup, monitoring) | 10 |
| 5 | PII handling: masking, access scoping, what Roles-and-Permissions.md says about read-only versus mutation roles | 10 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Read vault/00-Core/Roles-and-Permissions.md in full | 15 |  |
| 2 | Trace one protected mutation (e.g., POST /api/contributions) from route handler through auth guard to service to database. Verify: does an unauthenticated request get 401? Does a read-only role get 403? | 25 | Verification notes |
| 3 | Ask AI: "What security gaps exist in PrismApp's current auth implementation?" Evaluate the AI's answer against what you verified manually. Note false positives and real findings | 25 | Prompt journal entry |
| 4 | Write production-readiness gap assessment: what is enforced, what is missing, what is deferred, risk rating for each gap | 35 | **Deliverable W10-1** |
| 5 | Peer review: swap assessments, challenge each other's risk ratings | 20 |  |

---

### Week 11 — Release Planning, Branching, and AI in Maintenance

**Lecture (1 hour)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | Release planning: what goes in a release, what stays in backlog, how to cut scope without cutting quality | 15 |
| 2 | Branch strategy for AI-augmented work: feature branches, preview deploys, ADR-driven changes, why "commit often" matters more when AI generates code | 15 |
| 3 | AI for maintenance tasks: debugging from error logs, generating migration plans, updating documentation, reviewing dependency changes | 15 |
| 4 | Maintaining coherence as the codebase grows: naming conventions, shared patterns, vault-as-source-of-truth | 15 |

**Lab (2 hours)**

| # | Activity | Minutes | Output |
|---|----------|---------|--------|
| 1 | Pick one feature from the PrismApp backlog: Safety module, Security incidents, Event bookings, or a hardening task | 10 |  |
| 2 | Trace one existing feature across all layers: vault doc → ERD → schema.prisma → service → route handler → UI page → test script. Write a map of all files involved | 30 | Feature map |
| 3 | Use AI to draft an ADR or implementation plan for the new feature. Provide the feature map as context so AI understands the existing architecture | 30 | Draft ADR |
| 4 | Critique the AI-generated plan: does it respect existing patterns? Does it account for migrations, seed updates, test updates? What did it forget? | 20 | Critique notes |
| 5 | Finalize the change-set plan: files to create, files to modify, migration steps, test plan | 30 | **Deliverable W11-1** |

---

### Week 12 — Capstone Presentation and Reflection

**Lecture (30 minutes — shortened for presentation time)**

| # | Topic | Minutes |
|---|-------|---------|
| 1 | What makes a good capstone defense: show the requirement, show the implementation, show the test, show the tradeoff | 10 |
| 2 | Reflection framing: AI as multiplier versus AI as crutch — where was the line for you this semester? | 10 |
| 3 | Logistics: presentation order, time per team, Q&A format | 10 |

**Presentations (2.5 hours)**

| # | Activity | Minutes per team | Output |
|---|----------|------------------|--------|
| 1 | Demonstrate one meaningful slice: show the running feature, walk through the code, explain design decisions | 8 | Live demo |
| 2 | Defend architecture: why this approach? What tradeoffs? What would you change? | 4 | Q&A |
| 3 | AI usage summary: where AI helped most, where it hurt, one "AI was wrong here" highlight | 3 | Oral + slide |

*At 15 minutes per team, fits 10 teams in 2.5 hours. Adjust if fewer teams.*

**Capstone Deliverables (due end of week):**
1. Updated design artifacts (ERD changes, ADRs, or domain rule additions)
2. Working implementation on a feature branch — must pass lint and build
3. Test evidence: scripts, terminal output, or screenshots
4. Complete AI usage log (prompt journal from Week 1 through 12)
5. Reflection report (1500–2500 words): what AI accelerated, what required human judgment, what incorrect assumptions AI made, what would break without review, what the student would do differently

---

### Hour Summary

| Week | Lecture | Lab | Independent | Total Contact |
|------|---------|-----|-------------|---------------|
| 0 | — | — | 3–4 hr | 0 hr |
| 1 | 1 hr | 2 hr | 1 hr | 3 hr |
| 2 | 1 hr | 2 hr | 1 hr | 3 hr |
| 3 | 1 hr | 2 hr | 1 hr | 3 hr |
| 4 | 1 hr | 2 hr | 1.5 hr | 3 hr |
| 5 | 1 hr | 2 hr | 1.5 hr | 3 hr |
| 6 | 1 hr | 2 hr | 1.5 hr | 3 hr |
| 7 | 1 hr | 2 hr | 2 hr | 3 hr |
| 8 | 1 hr | 2 hr | 2 hr | 3 hr |
| 9 | 1 hr | 2 hr | 2 hr | 3 hr |
| 10 | 1 hr | 2 hr | 1.5 hr | 3 hr |
| 11 | 1 hr | 2 hr | 2 hr | 3 hr |
| 12 | 0.5 hr | 2.5 hr | 3 hr | 3 hr |
| **Total** | **11.5 hr** | **24.5 hr** | **~24 hr** | **36 hr contact** |

---

### Deliverable Calendar

| Week | ID | Deliverable | Type |
|------|----|-------------|------|
| 0 | W0-1 | "What I understand so far" orientation note | Individual |
| 1 | W1-1 | Prompt journal — first entry | Individual |
| 1 | W1-2 | System critique | Individual |
| 2 | W2-1 | Product brief | Pair |
| 3 | W3-1 | Requirements pack | Pair |
| 4 | W4-1 | ERD review memo + migration evidence | Individual |
| 5 | W5-1 | UI redesign proposal | Individual |
| 6 | W6-1 | Prompt comparison log + "AI was wrong here" analysis | Individual |
| 7 | W7-1 | Backend feature + engineering note | Individual/Pair |
| 8 | W8-1 | Frontend feature + validation notes | Individual/Pair |
| 9 | W9-1 | Test plan + AI-generated tests gap analysis | Individual |
| 10 | W10-1 | Production-readiness gap assessment | Pair |
| 11 | W11-1 | Change-set plan for future module | Individual/Pair |
| 12 | Capstone | Artifacts + implementation + tests + prompt journal + reflection | Individual/Pair |

---

If you want, I can turn this into one of these next:
1. a formal syllabus with learning outcomes, prerequisites, and grading policy
2. a student handbook for "How to use Copilot well in this course"
3. a course version aligned specifically to your PrismApp Tracks A, B, and C together
