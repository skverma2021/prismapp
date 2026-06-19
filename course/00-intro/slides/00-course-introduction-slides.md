# Slide Script — Course Introduction: Building a Real-World Society Management App

<!--
  Placement: course/00-intro/slides/00-course-introduction-slides.md
  This is the first thing a student watches. It is not a section — it is the course-level welcome.
  Run time target: 12–15 minutes.
  Tone: warm, direct, no hype. Show the finished product early; explain the course structure clearly.
  Record this last, after all other sections are complete, so the demos and screenshots are final.
-->

---

## Slide 1 — Course Title

**Type:** `Title`

**Headline:**
> Build a Production-Ready Society Management App with Next.js, Prisma, and PostgreSQL

**Visual / layout:**
Full-width slide. Project name ("PrismApp") as the title in large type. Subtitle: "From domain rules to deployed application." Below the subtitle, three technology logos in a horizontal row: Next.js · Prisma · PostgreSQL. Bottom-right corner: instructor name and course level ("Intermediate — React background assumed").

**Narration:**
"Welcome. In this course, you will build a real, working society management application — from the very first domain requirement document all the way to a deployed URL on Vercel.

The application manages a residential society. It handles blocks, units, residents, owners, monthly contributions, and complaints. Every decision in the codebase is deliberate and documented — you will understand not just how things work, but why they were built that way.

Let me show you what you'll have by the end."

**On-screen action / demo:**
No action. Static title slide.

**Key takeaway:**
This course builds a complete, deployed application — not a tutorial toy.

---

## Slide 2 — The Finished Application (Live Demo)

**Type:** `Demo`

**Headline:**
> Here is what you are building

**Visual / layout:**
Browser screenshot at 1280×800. Show the PrismApp home dashboard — the role-aware launchpad with module cards grouped under Master Data, Timelines, Contribution Master Data, and Operations. Nav sidebar visible on the left with the user's name and role badge.

**Narration:**
"This is the finished application running in production on Vercel with a real PostgreSQL database.

On the left: the navigation sidebar. Your name and role are shown at all times. Role-based access control is built in — a Society Admin sees every module, a Read-Only user can browse but cannot modify data.

The home page groups modules by domain area. Let me click through the key screens so you know what we are building before we write a single line of code."

**On-screen action / demo:**
1. Start on the home page `/home`.
2. Click "Units" — show the paginated unit list with search and block filter.
3. Click "Contributions" — show the contribution capture form.
4. Click "Reports → Contribution Report" — show the paid/unpaid matrix with column totals.
5. Click "Complaints" — show the complaint list with status badges and SLA indicators.
6. Return to home.

**Key takeaway:**
The finished product is a multi-module, role-aware, deployed application — not a prototype.

---

## Slide 3 — The Project: MSH Society

**Type:** `Concept`

**Headline:**
> The real-world context: Magadh Signature Homes (MSH)

**Visual / layout:**
Clean two-column layout. Left column: a simple building diagram with three labelled blocks (Nalanda · Vaishali · Rajgir), each block containing several unit rectangles. Right column: a short bulleted list — "Three blocks · 336 units (14 floors × 8 columns per block) · Owners and residents · Monthly maintenance contributions · Complaints and service requests." Above the diagram, a small note: "All names and data in the course are anonymised."

**Narration:**
"The project is based on a real residential society — Magadh Signature Homes, or MSH — with three blocks: Nalanda, Vaishali, and Rajgir, each containing a number of flats.

In a society like this, a small managing committee handles collections, complaints, and records on behalf of all residents. Before this app, that meant spreadsheets, WhatsApp messages, and disputed records.

This application gives the managing committee a single source of truth. Everything we build has a direct, real user behind it — not a made-up business case."

**On-screen action / demo:**
No action. Static concept slide.

**Key takeaway:**
The domain is real, the constraints are real, and the data rules come from how societies actually operate.

---

## Slide 4 — The Application Code Name: PrismApp

**Type:** `Concept`

**Headline:**
> Why "PrismApp" — and why the name matters for the course

**Visual / layout:**
Single-column. One sentence: "PrismApp is the codebase name. It is not tied to MSH — the same codebase can manage any residential society." Below: a three-column table with three columns: "Domain concept", "MSH example", "Another society example." Rows: Block → Nalanda/Vaishali/Rajgir → Tower A / Tower B; Unit → Flat number → Apartment number; Contribution Head → Maintenance / Gym → Maintenance / Club.

**Narration:**
"We call the codebase PrismApp throughout the course — keeping a clean separation between the software and the specific society it was first deployed for.

Why does this matter? Because one of the things you will learn is how to design software that is domain-aware without being domain-hardcoded. The names in the database — blocks, contribution heads, periods — are all data, not code. Any society could use the same application by changing seed data, not source code.

This is a design principle we will encounter early and return to often."

**On-screen action / demo:**
No action. Static concept slide.

**Key takeaway:**
Separating domain data from code structure is a design decision — not an accident — and it shapes the entire schema.

---

## Slide 5 — What V1 Delivers

**Type:** `Concept`

**Headline:**
> Two production-ready modules: Master Data and Contributions

**Visual / layout:**
Two large cards side by side.

Card 1 — "Master Data":
- Blocks · Units
- Individuals (Owners / Residents)
- Ownership timelines
- Residency timelines

Card 2 — "Contributions":
- Contribution heads · Rates · Periods
- Payment capture with duplicate prevention
- Financial immutability + correction flow
- Paid / unpaid reports with CSV export

Small note below both cards: "Both modules are live in production and covered in full in this course."

**Narration:**
"Version 1 of the application delivers two complete modules.

Master Data is the foundation — every other module depends on knowing which units exist, who owns them, and who lives in them. This sounds simple, but it is not — ownership and residency are temporal. A unit can change owners. The system must record who owned what and when, without destroying history.

Contributions is the financial engine — recording monthly payments against each unit, preventing duplicate entries, and producing audit-grade reports. Financial records are immutable. There is no edit or delete. Corrections are handled through a compensating transaction — a deliberate design choice that we will study in depth."

**On-screen action / demo:**
No action. Static concept slide.

**Key takeaway:**
V1 is not a prototype — it is production-deployed software with real financial records and full audit capability.

---

## Slide 6 — The Course Roadmap

**Type:** `Concept`

**Headline:**
> Eight sections, one complete application

**Visual / layout:**
A numbered roadmap — a vertical or horizontal progression bar with eight stops. Each stop shows the section letter, a short title, and a one-line description.

```
[Setup]  Dev environment, local DB, seed data
  A      Defining Scope — requirements layering
  B      Database Design — ERD to Prisma schema
  C      Technology — Next.js App Router, Auth, Sessions
  D      CRUD — Building all master data modules
  E      Hardening — AuthN/AuthZ, audit logs, error handling
  F      Reporting — Contribution reports and CSV export
  G      Testing — Vitest unit tests and integration patterns
  H      Deployment — Vercel, PostgreSQL, Sentry, environment variables
```

Highlight the full arc: from a blank project to a deployed, tested, production application.

**Narration:**
"Here is the full course structure — eight sections plus setup.

We start with setup: getting your local environment running, database migrated, and seed data loaded. Then Section A dives into requirements — not code, but thinking — how to separate domain rules from feature lists, and how to write constraints that code can enforce.

Section B is database design. We will model the domain in an Entity-Relationship Diagram and translate it directly to a Prisma schema.

Section C covers technology choices — Next.js App Router, authentication with next-auth, and session management.

Section D is where we build: all master data modules, end-to-end, from schema to UI.

Sections E through H take the working application to production quality: hardening, reporting, testing, and deployment.

Each section has slide content, live demos, and hands-on exercises."

**On-screen action / demo:**
No action. Static roadmap slide.

**Key takeaway:**
The course is a complete journey — setup to deployment — with no gaps.

---

## Slide 7 — CMM: The Module Under Development

**Type:** `Concept`

**Headline:**
> What comes after V1 — the Complaint Management Module

**Visual / layout:**
A "Coming Soon" styled card — slightly dimmed compared to the V1 module cards, with a badge reading "In Development."

Inside the card:
- **CMM — Complaint Management Module**
- Auto-assigned ticket IDs (e.g. HSR-2026-00127)
- Priority levels P1/P2/P3 with SLA targets
- Lifecycle: Open → Assigned → In Progress → Resolved → Closed
- Routing by complaint category
- Resident status visibility

Below the card, a note in a callout box: "CMM Sprints 0–2 are complete and included in the course. Sprint 3 (photo attachment, notifications, SLA cron) requires external service infrastructure and is documented in the vault for live deployments."

**Narration:**
"After V1, the highest-priority backlog module is CMM — the Complaint Management Module. Residents can log complaints. The system assigns a ticket number automatically, sets a priority, and tracks progress through a defined lifecycle until the issue is closed.

CMM is not theoretical — it is partially built. Sprints zero through two are complete: the schema, the APIs, the complaint list, the detail page, the lifecycle transitions, and the SLA visibility dashboard card.

In this course, you will watch CMM being built in real time. You will see the design decisions as they happen — not just the finished result. Sprint three — photo attachment, push notifications, and SLA escalation automation — requires external services that go beyond the software design patterns this course focuses on. Those steps are fully documented in the project vault for anyone deploying this to a live society."

**On-screen action / demo:**
1. Switch to browser on the CMM complaints list page.
2. Open one complaint — show the ticket ID, status badge, priority, and SLA indicator.
3. Click the timeline panel — show status transitions with timestamps.

**Key takeaway:**
CMM is a live module-in-progress — you will learn from watching it grow, not just from studying the finished product.

---

## Slide 8 — Module I: The Student Exercise

**Type:** `Concept`

**Headline:**
> Module I — Events and Common-Space Bookings (You build this)

**Visual / layout:**
Card styled differently from V1 and CMM — an "Exercise" badge. Card content:
- Events scheduling
- Common hall and amenity reservations
- Slot and resource conflict prevention
- Calendar management

A callout below: "The core engineering challenge — slot conflict prevention — is identical in structure to the ownership/residency timeline problem you will master in Section D."

**Narration:**
"Module I is your exercise module. After completing Section D, you will have all the skills to build Events and Common-Space Bookings from scratch.

The central engineering problem — preventing two bookings from overlapping on the same resource — is structurally identical to the ownership timeline problem in the core course. A unit cannot have two active owners simultaneously. A common hall cannot have two bookings in the same time slot. Same invariant, new domain.

There is no external hardware dependency, no third-party service. It is a pure software problem — exactly the right scope for a course exercise.

Full vault documentation and a starter scaffold are provided. How you implement it is up to you."

**On-screen action / demo:**
No action. Static concept slide.

**Key takeaway:**
Module I is not optional busy work — it is the transfer test for one of the most important patterns in the course.

---

## Slide 9 — The Tech Stack at a Glance

**Type:** `Concept`

**Headline:**
> What we use — and why each choice was made

**Visual / layout:**
A two-column table — "Technology" and "Why this, not something else."

| Technology | Why |
|---|---|
| Next.js (App Router) | Server Components, collocated route handlers, no separate API server needed |
| Prisma ORM | Type-safe queries, migration workflow, readable schema |
| PostgreSQL | ACID transactions; essential for financial records |
| next-auth v4 | Session management without a separate auth service; supports Credentials + OAuth |
| Zod | Runtime validation that mirrors TypeScript types |
| Tailwind CSS v4 | Utility-first; no CSS file maintenance |
| Vercel | Zero-config deployment for Next.js; preview deployments per PR |
| Sentry | Error tracking with source map support; free tier sufficient for V1 |
| Vitest | Fast unit tests; compatible with the ESM module setup |

**Narration:**
"Here is the full stack. Every choice has a reason — and you will hear the reason at the point in the course where you encounter each tool.

The most important pairing is Next.js App Router with Prisma and PostgreSQL. The App Router changes where you write logic — directly in the component tree on the server, not in a separate Express API. Once that mental shift clicks, everything else follows.

PostgreSQL is non-negotiable for a financial module. We need ACID transactions: the guarantee that a payment record and its audit log are either both written or both rolled back. SQLite is fine for a tutorial; it is not fine for money.

We cover each of these in depth during the course. This slide is your reference for why the stack was chosen."

**On-screen action / demo:**
No action. Static table slide.

**Key takeaway:**
Every tool in the stack was chosen for a concrete reason — technology decisions are part of what this course teaches.

---

## Slide 10 — How This Course Is Structured (Udemy Advice)

**Type:** `Concept`

**Headline:**
> How to get the most out of this course

**Visual / layout:**
Three columns labelled "Watch", "Pause", "Build."

- **Watch:** Follow the narrated lectures and live demos without pausing the first time. Build the mental model before trying to replicate.
- **Pause:** On any slide marked `Exercise` or `Demo`, pause and try it yourself. Check back against the walkthrough.
- **Build:** Every section ends with a hands-on step. Do not skip these. The exercise is where learning becomes understanding.

Below the three columns: a callout box — "Questions and Discussions: Use the Q&A tab. Reference the file and line number from the course when posting. The vault documents in the project are your spec — read them before asking."

**Narration:**
"A word on how to use this course.

Each section has three types of content: lectures, live demos, and exercises. Watch the lecture to understand the concept. Watch the demo to see it in context. Then pause and do the exercise before watching the solution.

Resist the temptation to copy-paste code without understanding it. Every piece of code in this course traces back to a decision in the vault documents. If you can explain why the code is written the way it is, you have understood it. If you can only say what it does, you have not.

Use the Q&A tab on Udemy for questions. The project has a vault folder — a set of specification documents — that defines the domain rules, the API contracts, and the data model. The answers to most questions are in there. I will show you how to read it in the orientation section."

**On-screen action / demo:**
No action. Static advice slide.

**Key takeaway:**
Watch → Pause → Build. Understanding why beats knowing how.

---

## Slide 11 — Prerequisites

**Type:** `Concept`

**Headline:**
> What you need before starting

**Visual / layout:**
Two-column checklist. Left column: "You must have." Right column: "Nice to have — not required."

**You must have:**
- [ ] Comfortable with React (hooks, props, component structure)
- [ ] Familiar with REST — knows what a GET/POST request is
- [ ] Basic SQL — knows what a table, row, and join mean
- [ ] Node.js installed locally (v18+)
- [ ] A code editor (VS Code recommended)
- [ ] A GitHub account

**Nice to have:**
- [ ] Previous Next.js experience
- [ ] Familiarity with TypeScript
- [ ] PostgreSQL experience
- [ ] Any ORM experience (Sequelize, TypeORM, etc.)

**Narration:**
"You need a working React background — hooks, props, component state. You do not need to know Next.js before starting; we cover the mental model shift from React in the orientation section.

You need a basic understanding of REST and SQL. Not deep expertise — just enough to know what a database table is and what a GET request does.

TypeScript experience helps but is not a prerequisite. We write TypeScript throughout, and the types are explained in context as we go.

Everything else — Next.js, Prisma, PostgreSQL, Vercel — is taught from first principles."

**On-screen action / demo:**
No action. Static checklist slide.

**Key takeaway:**
If you can build a React app with hooks, you have enough to start.

---

## Slide 12 — Orientation: Start Here

**Type:** `Summary`

**Headline:**
> Before Section A: complete the orientation folder

**Visual / layout:**
An ordered list styled as a numbered checklist — the reading sequence from `course/00-intro/00-index.md`. Each item shows file name, a one-line description, and estimated reading time. Below the list, a coloured callout: "Do not skip the setup section. You need a running local instance before the app tour makes sense."

| # | What to read | Why |
|---|---|---|
| 1 | `react-express-transition.md` | Six mental model shifts — read this first |
| 2 | `project-structure-walkthrough.md` | What lives where in the codebase |
| 3 | `domain-glossary.md` | Every domain term defined in plain English |
| 4 | `how-to-read-the-vault.md` | How to use the specification documents |
| 5 | `app-tour.md` | Narrated walkthrough of every screen |
| 6 | `request-lifecycle.md` | One click traced through the full stack |

**Narration:**
"Before you start Section A, go through the orientation folder. It has six short documents — about an hour of reading total.

The most important one is the first: React to Next.js mental model shifts. If you skip that and go straight to the code, you will be confused. The Next.js App Router behaves differently from a React app in ways that catch experienced React developers off guard. Read that document first.

Then set up your local environment using the terminal commands guide in the setup folder. Once you have a running local instance, the app tour — document five — will show you what you are building in context.

The orientation is not mandatory. But students who do it progress significantly faster through the technical sections."

**On-screen action / demo:**
1. Open VS Code — show `course/00-intro/00-index.md` briefly.
2. Scroll to the table — show the six documents in order.

**Key takeaway:**
The orientation folder is the fastest way to avoid the most common early mistakes.

---

## Slide 13 — Let's Begin

**Type:** `Title`

**Headline:**
> Complete setup · Read the orientation · Start Section A

**Visual / layout:**
Clean closing title slide. Three action items in large numbered format:
1. Run through `course/00-setup/terminal-commands.md` — get the project running locally
2. Read the orientation files in `course/00-intro/`
3. Open Section A: Defining Scope

Bottom: a single line in smaller type — "The vault is your spec. The codebase is your implementation. The course connects the two."

**Narration:**
"That is the full picture. You know what you are building, who it is for, why the technology choices were made, and how the course is structured.

Start with setup — get the project running on your machine. Then read through the orientation. Then open Section A.

Everything from this point on is deliberate. Every rule has a reason. Every design decision traces back to a domain constraint or a documented tradeoff. Your job — as a developer — is to understand the connection between the spec and the code.

Let's build."

**On-screen action / demo:**
No action. Static closing slide.

**Key takeaway:**
The spec and the code must agree. This course teaches you to make that happen.

---

## Transition note

After this slide, the student moves to `course/00-setup/` to configure their local environment.
The next recorded segment is the terminal commands walkthrough (`00-setup/terminal-commands.md`), followed by the orientation reading sequence.

The first lecture segment with slides begins at Section A.

---

## Slide Group Summary

| Slide | Type | Duration (est.) |
|---|---|---|
| 1 — Course Title | Title | 0:45 |
| 2 — Finished App Demo | Demo | 2:30 |
| 3 — MSH Society | Concept | 1:30 |
| 4 — PrismApp Name | Concept | 1:15 |
| 5 — V1 Modules | Concept | 1:45 |
| 6 — Course Roadmap | Concept | 2:00 |
| 7 — CMM Module | Concept + Demo | 2:30 |
| 8 — Module I Exercise | Concept | 1:15 |
| 9 — Tech Stack | Concept | 1:45 |
| 10 — How to Learn | Concept | 1:30 |
| 11 — Prerequisites | Concept | 1:15 |
| 12 — Orientation Guide | Summary + Demo | 1:30 |
| 13 — Let's Begin | Title | 0:45 |
| **Total** | | **~21 min** |

> Trim by cutting slides 4 (PrismApp naming) and 8 (Module I) if a 15-minute intro is preferred. These add colour but are not structurally necessary.
