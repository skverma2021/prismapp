# Playlist A1 · PrismApp — Episode 1 — "Meet the Society Management Application"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** 6–8 minutes
- **Primary goal:** Give the viewer a full, concrete picture of the application —
  what it is, who uses it, what it does today — before any technical teaching starts.
- **Title options:**
  1. Meet the Society Management Application
  2. This Is the App We're Building From Scratch
  3. Inside a Real Society Management System (Full App Tour)
- **Thumbnail concept:** Screenshot of the PrismApp home dashboard with a bold
  label "Episode 1: Meet the App".

---

## Cold Open (0:00–0:20)

**Visual:** Straight into a screen recording of the PrismApp login screen — no
talking head yet.

**Narration:**
> "This is PrismApp — a real Society Management System, built for an actual
> residential society with three blocks and dozens of units. Before we write a
> single line of code together, I want you to see what it actually does. Let's take
> a walk through it."

---

## Scene 1 — Who this app is for (0:20–1:00)

**Visual:** Talking head, or a simple text-on-screen graphic: "Magadh Signature
Homes — 3 Blocks, dozens of Units, Owners, Residents, Monthly Contributions".

**Narration:**
> "Picture an apartment complex — three towers, call them Nalanda, Vaishali, and
> Rajgir. Each has a number of flats. People own those flats. Some of those owners
> live there; some rent them out to someone else. Every month, money changes hands
> for maintenance and other services. And every so often, someone has a complaint —
> a leaking pipe, a broken gate. Somebody has to track all of that, correctly, for
> years. That's the real-world problem behind this app."

---

## Scene 2 — Home dashboard (1:00–1:40)

**Visual:** Screen recording — `/home` dashboard, logged in as Society Admin. Slowly
pan across the module cards: Master Data, Timelines, Contribution Master Data,
Operations.

**Narration:**
> "After logging in, you land here — a role-aware dashboard. An admin sees every
> module: blocks, units, individuals, ownership and residency timelines, contribution
> setup, and day-to-day operations. A read-only user would see the same layout but
> couldn't change anything — the same rule is enforced again on the server, not just
> hidden in the menu."

**On-screen action:** Hover over each card group as it's named.

---

## Scene 3 — Blocks and units (1:40–2:30)

**Visual:** Screen recording — `/blocks` list, then `/units` filtered to one block.

**Narration:**
> "Blocks are the top level — a tower or wing. Every unit belongs to exactly one
> block. Units carry an area in square feet, because that number later drives
> maintenance billing. This is deliberately the simplest part of the app — it's the
> foundation everything else is built on."

---

## Scene 4 — Individuals, owners, residents (2:30–3:30)

**Visual:** Screen recording — `/individuals` list, then `/ownerships` timeline for
one unit, then `/residencies` for the same unit.

**Narration:**
> "People are modeled separately from units. An individual might own a flat, live in
> a different one they rent, or just be someone who occasionally makes a payment on
> someone else's behalf. Ownership and residency aren't just fields on a person —
> they're their own timelines, because who owned or lived in a unit changes over
> time, and the app needs to answer 'who was the owner on this exact date' just as
> easily as 'who owns it today.' We'll go deep on why that matters in the next
> episode."

---

## Scene 5 — Contributions (3:30–4:30)

**Visual:** Screen recording — `/contribution-heads` list, then a contribution
payment capture screen, then a paid/unpaid report.

**Narration:**
> "This is the financial heart of the app. 'Contribution heads' define what people
> pay for — maintenance, a gym fee, a one-time event charge. Each has its own rate
> history and its own billing rhythm, monthly or yearly. When a payment is recorded,
> it's locked in — no quietly editing a posted transaction later. If something needs
> correcting, the system creates a new offsetting entry instead, so there's always an
> honest paper trail. We'll spend a full episode on this engine because it's the most
> rule-heavy part of the app."

---

## Scene 6 — Complaints (4:30–5:15)

**Visual:** Screen recording — complaint list with status badges, then one complaint
detail page showing status history and notes.

**Narration:**
> "Residents can also raise complaints — a maintenance issue, a security concern.
> Each complaint gets a ticket ID and moves through a defined lifecycle: open,
> assigned, in progress, resolved, closed — with a short reopen window if the
> resident isn't satisfied. Some complaints can even be filed anonymously, which
> adds an interesting wrinkle we'll unpack later: how do you hide who reported
> something from most staff, while still letting managers see it when they need to?"

---

## Scene 7 — What this episode was, and wasn't (5:15–6:00)

**Visual:** Talking head.

**Narration:**
> "What you just saw is the finished behavior, not the code. That's on purpose — in
> this playlist, we're building the mental model of the application before we touch
> a single file. In the next episode, we'll zoom into the core model — blocks, units,
> and individuals — and start looking at why ownership and residency are treated as
> relationships, not just fields."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card pointing to Episode 2.

**Narration:**
> "Subscribe if you want to follow this build from the ground up, and I'll see you in
> Episode 2."

---

## Production Notes

- **Screen recordings needed:** Full app tour — login, `/home`, `/blocks`, `/units`,
  `/individuals`, `/ownerships` (one unit's timeline), `/residencies` (same unit),
  `/contribution-heads`, a contribution payment screen, a paid/unpaid report,
  complaint list, complaint detail. This is the same capture list already scripted
  in `course/00-intro/app-tour.md` — record once, reuse footage for both the course
  and this episode where useful, but re-record fresh narration for the tighter
  YouTube pacing (this script is ~half the word count of the course version).
- **Source material to reuse:** `course/00-intro/app-tour.md` (capture list and
  screen order), `vault/00-Core/System-Overview.md` (society name, block names,
  V1 module list).
- **B-roll:** none required; this episode is 100% product screen capture plus
  talking head.
- **Fact check before recording:** confirm current seed data still has three named
  blocks and at least one populated ownership/residency timeline and one complaint
  in a non-`Open` status, so the capture shows real transitions rather than empty
  states.
