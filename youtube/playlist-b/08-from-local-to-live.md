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
> "Getting code to run on your machine is the easy 90%.
>
> The last 10% is harder. The code must run correctly and repeatably, on infrastructure you do not control, for users who are not you.
>
> That is where a surprising number of projects quietly fail."

---

## Scene 1 — One command, no manual steps (0:20–1:30)

**Visual:** Screen recording — `vercel.json` (`"buildCommand": "prisma generate &&
next build"`) and `package.json` `postinstall: "prisma generate"`.

**Narration:**
> "The entire build is one deterministic command. It generates the Prisma client, then builds the Next.js app.
>
> There is no manual step like 'do not forget to run this script first.' Such a step lives only in someone's memory.
>
> If a deploy can only succeed because a human remembered an unwritten step, it is not a deployment process. It is a hope."

---

## Scene 2 — Migrations and seeds are part of the contract (1:30–2:50)

**Visual:** Screen recording — `prisma/migrations/` folder listing, then
`package.json` scripts `prisma:migrate:deploy` and `prisma:seed`.

**Narration:**
> "Schema changes are captured as migration files. They are checked into the same repository as the code that depends on them.
>
> We never run a manual `ALTER TABLE` once against production and leave it unwritten.
>
> A fresh environment must be able to stand itself up from nothing. You run migrations. Then you run the seed script. And you get a working baseline, with blocks, contribution heads, and reference periods.
>
> If that path ever breaks, you find out on your own machine, not during an actual incident."

---

## Scene 3 — Stateless by requirement, not by accident (2:50–3:50)

**Visual:** Diagram reused/adapted from Episode B2: multiple serverless function
instances, no shared memory, one shared Postgres.

**Narration:**
> "We touched on this in the architecture episode. It is worth restating, because it is a deployment constraint.
>
> On Vercel, your code runs as serverless functions. They can scale to many instances, and they do not share memory between requests.
>
> Suppose your code assumed 'the same server will still have this in memory next time.' It breaks the moment traffic scales past one instance.
>
> Designing for statelessness from day one makes this kind of deployment target possible without a rewrite."

---

## Scene 4 — Quality gates before anything ships (3:50–4:50)

**Visual:** Screen recording — `AGENTS.md` section 9, "Quality Gates" list: lint,
build, migration applies cleanly to an empty database, seed runs successfully,
manual smoke test.

**Narration:**
> "Before any change is considered done, there is a short, explicit checklist.
>
> Lint passes. The build passes. A migration applies cleanly to a genuinely empty database. The seed script runs. And there has been a manual smoke test of whatever changed.
>
> None of these checks are exotic. They are valuable because they are written down as a gate. They are not left as an assumption that 'someone probably checked this.'"

---

## Scene 5 — Saying no on purpose (4:50–6:00)

**Visual:** Screen recording — `vault/00-Core/System-Overview.md`, the "Backlog
Modules" section: CMM next, Events/Bookings after that, Safety/Security explicitly
deferred as hardware-dependent and course-deferred.

**Narration:**
> "The last engineering skill in this playlist is not technical at all.
>
> It is knowing what not to build yet, and saying so in writing.
>
> This project has a real backlog. It includes safety checklists, security workflows, and event bookings. The backlog is ranked, with reasons.
>
> Security and safety modules are explicitly deferred. They need hardware, such as scanners, cameras, and access control. That hardware does not belong in this phase of the project.
>
> That is not laziness. That is scope control. A feature list without priorities and reasons is just a wish list."

---

## Scene 6 — Closing the loop on this playlist (6:00–6:50)

**Visual:** Talking head, with a small graphic recapping the playlist arc: domain
rules → architecture → contracts → auth → validation → immutability → testing →
deployment/scope.

**Narration:**
> "That is the arc of this playlist.
>
> A vague ask becomes a domain rule. The domain rules shape an architecture. The architecture exposes a contract.
>
> The contract is guarded by authentication, authorization, and validation. The riskiest rules are written down as ADRs. Everything is proven with real tests.
>
> And it all ships through a deployment process that does not rely on anyone's memory.
>
> None of it was about a specific framework. That is deliberate. This is the process, independent of the technology. And it is the lens the rest of the channel builds on."

---

## Outro / CTA (6:50–7:20)

**Visual:** End card showing the upcoming technology playlists (TypeScript,
PostgreSQL & Prisma, Next.js) and the AI-Augmented Development playlist.

**Narration:**
> "From here, the channel goes deep on the specific technologies that made all of this possible.
>
> We start with the database layer, because that is where this project's hardest and most interesting rules live.
>
> Subscribe so you do not miss it."

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
