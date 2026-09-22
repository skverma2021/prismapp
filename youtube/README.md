# "From Concept to Commissioning" — YouTube Production Pack

This folder contains ready-to-record narrations and visual direction for the channel
described in [`The Blueprint V-1.0.docx`](../The%20Blueprint%20V-1.0.docx).

It is **separate from `course/`**. `course/` is Udemy-style written course material
(slide decks, module outlines) for a paid course. `youtube/` is spoken-word video
scripts for free public videos. They can share source facts (the `vault/` domain specs
and the `course/00-intro/*` reference docs) but the *format* is different: shorter,
punchier, camera/voice-first instead of slide-first.

## What's in here

| File | Video | Playlist |
|---|---|---|
| [00-start-here.md](00-start-here.md) | From Concept to Commissioning — What This Channel Is About | Channel trailer |
| [playlist-a1-prismapp/01-meet-the-application.md](playlist-a1-prismapp/01-meet-the-application.md) | Meet the Society Management Application | A1 — PrismApp |
| [playlist-a1-prismapp/02-core-society-model.md](playlist-a1-prismapp/02-core-society-model.md) | The Core Society Model | A1 — PrismApp |
| [playlist-a1-prismapp/03-ownership-residency-history.md](playlist-a1-prismapp/03-ownership-residency-history.md) | Ownership & Residency: Why History Matters | A1 — PrismApp |
| [playlist-a1-prismapp/04-contributions-engine.md](playlist-a1-prismapp/04-contributions-engine.md) | The Contributions Engine | A1 — PrismApp |
| [playlist-a1-prismapp/05-complaint-management-workflow.md](playlist-a1-prismapp/05-complaint-management-workflow.md) | Complaint Management as a Workflow System | A1 — PrismApp |
| [playlist-a1-prismapp/06-browser-to-database.md](playlist-a1-prismapp/06-browser-to-database.md) | From Browser Click to Database | A1 — PrismApp |
| [playlist-b/01-vague-ask-to-domain-rules.md](playlist-b/01-vague-ask-to-domain-rules.md) | From Vague Ask to Domain Rules | B |
| [playlist-b/02-architecture-in-one-diagram.md](playlist-b/02-architecture-in-one-diagram.md) | The Architecture in One Diagram | B |
| [playlist-b/03-designing-the-api-contract.md](playlist-b/03-designing-the-api-contract.md) | Designing the API Contract Before Writing Code | B |
| [playlist-b/04-who-is-allowed-to-do-what.md](playlist-b/04-who-is-allowed-to-do-what.md) | Who's Allowed to Do What | B |
| [playlist-b/05-validation-at-the-boundary.md](playlist-b/05-validation-at-the-boundary.md) | Validation at the Boundary | B |
| [playlist-b/06-financial-record-that-cant-lie.md](playlist-b/06-financial-record-that-cant-lie.md) | A Financial Record That Can't Lie | B |
| [playlist-b/07-proving-it-works-testing.md](playlist-b/07-proving-it-works-testing.md) | Proving It Works: Testing a Real Workflow | B |
| [playlist-b/08-from-local-to-live.md](playlist-b/08-from-local-to-live.md) | From Local to Live, and Keeping It Alive | B |

That is **16 videos** — the Start Here trailer, all six episodes of Playlist A1
("PrismApp: Building a Real Society Management System"), and all eight episodes of
Playlist B ("Architecture & SDLC"). See the Observations section below for why
Playlists C–F are intentionally not scripted yet.

### Playlist B's internal structure

B's topic list in the blueprint (13 loose subjects) was grouped into 4 sub-arcs of
2 episodes each, so the playlist has an order instead of reading as a topic dump:

| Sub-arc | Episodes | Question it answers |
|---|---|---|
| Discovery & Domain | B1–B2 | What are we building, and how is it shaped? |
| Design & Contracts | B3–B5 | What's the contract at the system's edges? |
| Build Practices | B6 (+ ties to B5) | How do we protect the riskiest data? |
| Verification & Ops | B7–B8 | How do we know it works, and keep it live? |

(B6 is the sole Build Practices episode scripted so far — validation, its natural
partner, was placed in Design & Contracts as B5 since it's really a contract-edge
concern. If you want a second Build Practices episode — e.g. dedicated to logging/
observability — say so and I'll add it as B6.5/B9 without renumbering the rest.)

## Multi-application naming convention (A-series)

The "story" playlist is now app-specific and numbered: **Playlist A1 = PrismApp**.
When a second case-study application joins the channel, it gets its own **Playlist
A2** (folder `youtube/playlist-a2-<appname>/`) with its own 6-ish episode arc,
following the same shape as A1 (meet the app → core model → the app's hardest
domain rule → its most rule-heavy engine → a workflow module → request lifecycle).
A1 is never renumbered or renamed once published — new apps only ever add a new
A-series playlist, they never replace this one.

Playlists B–F stay **app-agnostic and evergreen**: one continuous TypeScript
playlist, one Postgres/Prisma playlist, etc., that keep accumulating episodes over
the channel's life. Today every B–F episode necessarily draws its example from
PrismApp, because it's the only app that exists yet. When App 2 arrives, new B–F
episodes can draw from it too, side by side with the PrismApp-based ones already
published — nothing needs to be re-recorded. Recommended convention going forward:
state the source app explicitly in each B–F script's metadata block (e.g.
`**Case-study app:** PrismApp`) so this stays unambiguous once a second app exists.

## Script format

Every script follows the same shape so a single production workflow (VS Code screen
capture + talking head + simple motion graphics) works for all of them:

- **Video metadata** — title options, target length, thumbnail concept.
- **Cold open** — the first 15–20 seconds, written to earn the "keep watching" decision.
- **Scenes** — numbered beats, each with `Visual`, `Narration` (verbatim, read-aloud
  script), and `On-screen action` (what to actually click/show in the running app or
  editor).
- **Outro / CTA** — subscribe + next-video pointer.
- **Production notes** — exact files/screens to capture, from the real PrismApp
  codebase and `vault/`, so nothing needs to be invented at recording time.

Narration word counts target roughly 130–150 words per minute of spoken video.

---

## Observations from reviewing the codebase and the blueprint

1. **The blueprint only concretely defined 7 videos at the start.** Start Here +
   Playlist A1's six episodes had real titles and scope from day one. Playlists B
   (Architecture & SDLC), C (TypeScript), D (PostgreSQL & Prisma), E (Next.js), and F
   (AI-Augmented Development) were described only as topic lists ("likely
   subjects"), not episodes — the blueprint's section 10 deliberately defers
   "detailed episode titles beyond the established roadmap." Playlist B has since
   been broken into a concrete 8-episode structure (see below) and fully scripted.
   C, D, E, and F remain topic lists only — I'm happy to draft a proposed episode
   list for any of them next, the same way B was just done.

2. **`course/00-intro/` is a goldmine you already have and should reuse, not duplicate.**
   `app-tour.md`, `request-lifecycle.md`, `domain-glossary.md`, and the vault's
   `Domain-Rules.md` / `ERD.md` already contain accurate, narration-ready facts about
   the app (entity names, rule numbers, the exact request-lifecycle diagram, etc.).
   Every script in this folder was grounded in those files rather than re-derived,
   so the facts stay consistent between the paid course and the free channel. If you
   later change a domain rule, both `course/` and `youtube/` need a matching update —
   worth a quick grep for the rule ID (e.g. `O4`, `CM3`) across both trees when that
   happens.

3. **The app itself is a strong "real-world" showcase** — it already has the
   characteristics the blueprint asks for: temporal ownership/residency modeling with
   overlap prevention, immutable financial records with compensating corrections, a
   complaint lifecycle with SLA and anonymity rules, role-based auth, and a full
   Next.js → Prisma → PostgreSQL request path. Episodes 2–6 lean directly on real rule
   IDs (`O3`, `O4`, `O7`, `R4`, `R5`, `CM3`, `CM11–13`, etc.) so the videos double as
   an accurate index into the vault for viewers who go looking for more depth.

4. **`course/` is currently unpublished and doesn't need to be abandoned.** The
   YouTube channel and the Udemy course are complementary, not competing: the channel
   builds an audience and proves the teaching method cheaply; the course is the
   monetized deep-dive for viewers who want the full slide-by-slide treatment. I'd
   avoid deciding "YouTube instead of Udemy" — the two content trees can point at each
   other later (e.g., an outro card: "full hands-on build in the course").

5. **Nothing in `/course` needed to change** for this task — it's reference material,
   not something the YouTube scripts overwrite. I only added the new `youtube/`
   folder.

6. **Suggested next step:** pick one of Playlists B–F, and I'll propose a concrete
   episode breakdown (titles + one-line scope each) for your review before scripting
   — the same way Playlist A already has one in the blueprint.
