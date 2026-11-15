# Playlist B · Episode 8 — "From Local to Live, and Keeping It Alive"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Verification & Ops (2 of 2) — closes out the playlist's first pass
- **Target length:** 7–8 minutes
- **Primary goal:** Show deployment as an engineering decision (not a checkbox), and
  close the playlist with the theme of deliberate scope control — saying no to
  features on purpose, and writing that decision down.
- **Title options:**
  1. From Local to Live, and Keeping It Alive
  2. Deploying Without Drama: Migrations, Seeds, and One Build Command
  3. The Engineering Skill of Saying "Not Yet"
- **Thumbnail concept:** A simple pipeline: laptop icon → Vercel logo-style cloud →
  checkmark, with a small "NOT YET" stamp on a greyed-out feature card beside it.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Getting code to run on your machine is the easy 90%. Getting it to run correctly,
> repeatably, on infrastructure you don't control, for users who aren't you — that's
> the last 10%, and it's where a surprising number of projects quietly fall apart."

---

## Scene 1 — One command, no manual steps (0:20–1:30)

**Visual:** Screen recording — `vercel.json` (`"buildCommand": "prisma generate &&
next build"`) and `package.json` `postinstall: "prisma generate"`.

**Narration:**
> "The entire build is one deterministic command: generate the Prisma client, then
> build the Next.js app. No manual 'don't forget to run this script first' step that
> only lives in someone's memory. If a deploy can only succeed because a human
> remembered an unwritten step, that's not a deployment process — it's a hope."

---

## Scene 2 — Migrations and seeds are part of the contract (1:30–2:50)

**Visual:** Screen recording — `prisma/migrations/` folder listing, then
`package.json` scripts `prisma:migrate:deploy` and `prisma:seed`.

**Narration:**
> "Schema changes are captured as migration files, checked into the same repository
> as the code that depends on them — never a manual `ALTER TABLE` run once against
> production and never written down. And a fresh environment needs to be able to
> stand itself up from nothing: run migrations, then run the seed script, and get a
> working baseline — blocks, contribution heads, reference periods. If that path
> ever breaks, you find out on your own machine, not during an actual incident."

---

## Scene 3 — Stateless by requirement, not by accident (2:50–3:50)

**Visual:** Diagram reused/adapted from Episode B2: multiple serverless function
instances, no shared memory, one shared Postgres.

**Narration:**
> "We touched this in the architecture episode, but it's worth restating here
> because it's specifically a deployment constraint: on Vercel, your code runs as
> serverless functions that can scale to many instances and don't share memory
> between requests. Anything that assumed 'the same server will still have this in
> memory next time' breaks the moment traffic scales past one instance. Designing
> for statelessness from day one is what makes this kind of deployment target
> possible without a rewrite."

---

## Scene 4 — Quality gates before anything ships (3:50–4:50)

**Visual:** Screen recording — `AGENTS.md` section 9, "Quality Gates" list: lint,
build, migration applies cleanly to an empty database, seed runs successfully,
manual smoke test.

**Narration:**
> "Before any change is considered done, there's a short, explicit checklist: lint
> passes, the build passes, a migration applies cleanly to a genuinely empty
> database, the seed script runs, and there's been a manual smoke test of whatever
> changed. None of these are exotic. What makes them valuable is that they're
> written down as a gate, not left as an assumption that 'someone probably checked
> this.'"

---

## Scene 5 — Saying no on purpose (4:50–6:00)

**Visual:** Screen recording — `vault/00-Core/System-Overview.md`, the "Backlog
Modules" section: CMM next, Events/Bookings after that, Safety/Security explicitly
deferred as hardware-dependent and course-deferred.

**Narration:**
> "The last engineering skill in this playlist isn't a technical one at all: knowing
> what not to build yet, and saying so in writing. This project has real backlog —
> safety checklists, security workflows, event bookings — and it's ranked, with
> reasons. Security and safety modules are explicitly deferred because they need
> hardware — scanners, cameras, access control — that doesn't belong in this phase
> of the project. That's not laziness. That's scope control: a feature list without
> priorities and reasons is just a wish list."

---

## Scene 6 — Closing the loop on this playlist (6:00–6:50)

**Visual:** Talking head, with a small graphic recapping the playlist arc: domain
rules → architecture → contracts → auth → validation → immutability → testing →
deployment/scope.

**Narration:**
> "That's the arc of this playlist: a vague ask becomes a domain rule, the domain
> rules shape an architecture, the architecture exposes a contract, the contract is
> guarded by authentication, authorization, and validation, the riskiest rules get
> written down as ADRs, everything is proven with real tests, and it all ships
> through a deployment process that doesn't rely on anyone's memory. None of it was
> about a specific framework. That's deliberate — this is the process, independent
> of the technology, and it's the lens the rest of the channel builds on."

---

## Outro / CTA (6:50–7:20)

**Visual:** End card showing the upcoming technology playlists (TypeScript,
PostgreSQL & Prisma, Next.js) and the AI-Augmented Development playlist.

**Narration:**
> "From here, the channel goes deep on the specific technologies that made all of
> this possible — starting with the database layer, because that's where this
> project's hardest and most interesting rules actually live. Subscribe so you don't
> miss it."

---

## Production Notes

- **Screen recordings needed:** `vercel.json`, `package.json` scripts section,
  `prisma/migrations/` folder listing, `AGENTS.md` Quality Gates section (§9),
  `vault/00-Core/System-Overview.md` Backlog Modules section.
- **Diagrams needed:** reuse/adapt the stateless multi-instance diagram from
  Episode B2; a simple recap arc graphic for Scene 6 (8 labeled steps, one per B1–B8
  episode).
- **Source material to reuse:** `AGENTS.md` sections 5, 9, and 10 (Architecture
  Baseline, Quality Gates, Scope Control); `vault/00-Core/System-Overview.md` for
  the backlog priority reasoning.
- **Fact check before recording:** confirm the current Vercel project configuration
  and `package.json` scripts still match what's described (these are exactly the
  kind of files that drift as a project evolves) before recording Scenes 1–2.
