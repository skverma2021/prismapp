# Playlist A1 · PrismApp — Episode 1 — "Meet the Society Management Application"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** ~5:45 (recorded app-tour footage runs shorter than the
  original 6–8 minute plan; see Production Notes)
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

**Visual:** Screen recording opens on the login screen (or a brief title card ahead
of it) — no talking head yet. **Recorded** — this is the opening of
`youtube/00-start-here-video-script.txt`.

**Narration:**
> "Here is an introductory tour of the Society Management System, the application
> used as our case study. The application is built around a society called MSH, or
> Magadh Signature Homes. Inspired by the heritage of Magadh, the society consists
> of three blocks: Nalanda for learning, Rajgir for harmony, and Vaishali for
> Buddhism, Jainism and prosperity. Magadh Signature Homes applies technology to
> enable community living that is secure, transparent, and well connected."
> 
> [login]

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

## Scene 2 — Home dashboard (1:00–1:20)

**Visual:** Screen recording — `/home` dashboard, logged in as Society Admin.
**Recorded.**

**Narration:**
> "After a successful login, the home page is displayed next."
> 
> [Home Page]

**Note:** The richer "role-aware dashboard" explanation (admin vs. read-only,
server-enforced roles) didn't make it into this take. If it's worth keeping,
fold it into Scene 1's talking-head bridge or add it as a text overlay here
rather than re-recording the walkthrough.

---

## Scene 3 — Blocks and units (1:20–2:00)

**Visual:** Screen recording — `/blocks` list, then `/units` filtered to Nalanda.
**Recorded.**

**Narration:**
> "We will start with the block management page."
> 
> [the Blocks page]
> 
> "The three blocks are Nalanda, Rajgir, and Vaishali."
> 
> [the browse page]
> 
> "Now we choose Nalanda and look into the units or flats within this block."
> 
> [the page for units belonging to Nalanda block]
> 
> "A list of units is shown, with links to define ownership, residency, and
> contributions for each unit."

---

## Scene 4 — Ownership and residency for one unit (2:00–2:50)

**Visual:** Screen recording — `/ownerships` for flat 1001 in Nalanda, then
`/residencies` for the same unit. **Recorded** — note the recorded take goes
straight from the units list to this unit's ownership/residency pages; it does not
include a separate `/individuals` list capture.

**Narration:**
> "We will select ownership for flat 1001 in the Nalanda block."
> 
> [ownership page]
> 
> "This page allows you to assign the owner and view all details related to
> ownership, including current and historical records. From here, you can also
> navigate to residency, contribution, or transaction pages for the selected unit.
> We will now choose residency."
> 
> [residency page]
> 
> "Like ownership, this section allows you to record residency details for the
> selected flat and review its residency history. Ownership and residency
> represent two different ways in which individuals are linked to a flat."

**Note:** The `/individuals` list and the "owner ≠ resident, timelines not fields"
teaching point are not in this take. That framing is still worth making — it's a
good setup for Episode 3 — but it now needs to live in Scene 7's wrap-up talking
head rather than as an on-screen capture here, unless a short `/individuals`
clip gets recorded separately and cut in.

---

## Scene 5 — Contributions (2:50–3:45)

**Visual:** Screen recording — contribution capture screen reached from the home
page, then the paid/unpaid matrix report. **Recorded** — note this take does not
capture a separate `/contribution-heads` list screen.

**Narration:**
> "Next is the contribution system for monthly maintenance, gym, swimming pool,
> annual celebrations, feasts, and similar expenses. We begin from the home page,
> which contains a link for contribution capture."
> 
> [Contribution Capture Page]
> 
> "Then we choose the contribution type, the unit making the payment, the payer,
> the transaction ID, and the months covered by the payment, and the process is
> complete."
> 
> [paid unpaid matrix]
> 
> "This matrix allows filtering by year, contribution type, and block. It displays
> payment amounts across months for all units in the selected block."

**Note:** The immutability/compensating-entry teaching point ("locked in, no
quietly editing a posted transaction") isn't in this take. It's a strong line —
worth keeping for Episode 4 (the contributions engine deep dive) where it belongs
anyway.

---

## Scene 6 — Complaints (3:45–4:30)

**Visual:** Screen recording — the complaints summary on the home page, then the
complaints browse/create page, then a complaint detail page. **Recorded.**

**Narration:**
> "The home page also shows a summary of complaints, including open complaints,
> breached deadlines, and the oldest unresolved issues. A view-all option opens a
> page for creating and browsing all complaints. An authorized user can select any
> complaint ID to update its status or add relevant notes."

**Note:** The status-lifecycle detail ("open, assigned, in progress, resolved,
closed") and the anonymous-complaint teaser aren't in this take. Both are good
hooks for Episode 5 (complaint management workflow) — no need to force them in
here.

---

## Scene 7 — What this episode was, and wasn't (4:30–5:15)

**Visual:** Talking head.

**Narration:**
> "What you just saw is the finished behavior, not the code. That's on purpose — in
> this playlist, we're building the mental model of the application before we touch
> a single file. In the next episode, we'll zoom into the core model — blocks, units,
> and individuals — and start looking at why ownership and residency are treated as
> relationships, not just fields."

---

## Outro / CTA (5:15–5:45)

**Visual:** End card pointing to Episode 2.

**Narration:**
> "Subscribe if you want to follow this build from the ground up, and I'll see you in
> Episode 2."

---

## Production Notes

- **Screen recordings — done.** The full app-tour capture and narration for
  Scenes 2–6 (login through complaints) is recorded, per
  `youtube/00-start-here-video-script.txt`. That take covers: login, home,
  blocks, Nalanda's units, ownership for flat 1001, residency for the same unit,
  contribution capture, the paid/unpaid matrix, and complaints (summary, browse,
  detail). It does not include separate `/individuals` or `/contribution-heads`
  list captures — see the per-scene notes above for where those omissions land.
- **Still to record:** Scene 1 (talking head — "who this app is for") and
  Scene 7 + Outro (talking head — wrap-up and CTA). These bookend the recorded
  tour and haven't been shot yet.
- **Source material:** `youtube/00-start-here-video-script.txt` (recorded
  narration, authoritative for Scenes 2–6 wording), `course/00-intro/app-tour.md`
  (original capture-list plan, now superseded by the actual recording),
  `vault/00-Core/System-Overview.md` (society name, block names, V1 module list).
- **B-roll:** none required; this episode is 100% product screen capture plus
  talking head.
- **Follow-up consideration:** a short trailer for `youtube/00-start-here.md`
  (the channel intro) reuses 3–4 silent clips cut from this same recorded
  footage — see that script's Scene 2 production note.
