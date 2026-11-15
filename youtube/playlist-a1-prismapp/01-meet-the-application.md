# Playlist A1 · PrismApp — Episode 1 — "Meet the Society Management Application"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** ~7:30
- **Primary goal:** Give the viewer a full, concrete picture of the application —
  what it is, who uses it, what it does today, and why its financial records can be
  trusted — before any technical teaching starts.
- **Title options:**
  1. Meet the Society Management Application
  2. This Is the App We're Building From Scratch
  3. Inside a Real Society Management System (Full App Tour)
- **Thumbnail concept:** Screenshot of the PrismApp home dashboard with a bold
  label "Episode 1: Meet the App".

---

## Cold Open (0:00–0:20)

**Visual:** Screen recording opens on the login screen (or a brief title card ahead
of it) — no talking head yet.

**Narration:**
> "Here is an introductory tour of the Society Management System. It is the application we use as our case study.
>
> The application is built around a society called MSH, or Magadh Signature Homes. The society is inspired by the heritage of Magadh.
>
> It has three blocks. Nalanda stands for learning. Rajgir stands for harmony. And Vaishali stands for Buddhism, Jainism, and prosperity.
>
> Magadh Signature Homes uses technology for community living that is secure, transparent, and well connected."
>
> [login]

---

## Scene 1 — Who this app is for (0:20–1:00)

**Visual:** Talking head, or a simple text-on-screen graphic: "Magadh Signature
Homes — 3 Blocks, dozens of Units, Owners, Residents, Monthly Contributions".

**Narration:**
> "Picture an apartment complex with three towers. Call them Nalanda, Vaishali, and Rajgir.
>
> Each tower has a number of flats. People own those flats. Some owners live there. Some rent their flats to someone else.
>
> Every month, money changes hands for maintenance and other services. And every so often, someone has a complaint. It might be a leaking pipe or a broken gate.
>
> Somebody has to track all of that, correctly, for years.
>
> And when money is involved, 'correctly' must mean something you can prove. It cannot be only something you believe.
>
> That is the real-world problem behind this app."

---

## Scene 2 — Login and home dashboard (1:00–1:40)

**Visual:** Screen recording — login, then the `/home` dashboard, logged in as
Society Admin.

**Narration:**
> "Here is the login screen. After a successful login, the home page is displayed
> next."
>
> [Home Page]
>
> "What you see depends on who you are.
>
> The app has three roles. They are Society Admin, Manager, and Read-Only.
>
> Admins and managers can record and change data. Read-only users can look, but they cannot change anything. Sensitive details, like mobile numbers and emails, are masked for them.
>
> These rules are enforced on the server. They are not only enforced by hiding buttons on the screen."

---

## Scene 3 — Blocks and units (1:40–2:20)

**Visual:** Screen recording — `/blocks` list, then `/units` filtered to Nalanda.

**Narration:**
> "We will start with the block management page."
>
> [the Blocks page]
>
> "The three blocks are Nalanda, Rajgir, and Vaishali."
>
> [the browse page]
>
> "Now we choose Nalanda. We look at the units, or flats, in this block."
>
> [the page for units belonging to Nalanda block]
>
> "A list of units is shown. Each unit has links to define ownership, residency, and contributions."

---

## Scene 4 — People, ownership and residency for one unit (2:20–3:30)

**Visual:** Screen recording — a short `/individuals` list (optional but
recommended), then `/ownerships` for flat 1001 in Nalanda, then `/residencies` for
the same unit.

**Narration:**
> "Everyone in the system is a person in one common list. This includes owners, residents, and even people who only pay a bill.
>
> A person is not the same thing as a flat. And not every person is an owner or a resident."
>
> [individuals page]
>
> "We will select ownership for flat 1001 in the Nalanda block."
>
> [ownership page]
>
> "On this page, you can assign the owner. You can also view all details related to ownership, including current and historical records.
>
> From here, you can go to the residency, contribution, or transaction pages for the selected unit.
>
> We will now choose residency."
>
> [residency page]
>
> "Like ownership, this section lets you record residency details for the selected flat. You can also review its residency history.
>
> Ownership and residency are two different ways to link a person to a flat. Both are timelines, not single fields.
>
> The app keeps the history. And it refuses to record two owners for the same flat on the same day."

---

## Scene 5 — Contributions, and records that can't be quietly changed (3:30–6:00)

**Visual:** Screen recording in four beats:
1. Home page → contribution capture page, recording one payment.
2. The paid/unpaid matrix report.
3. A posted contribution — point out that there is no edit and no delete.
4. The correction flow: choose a posted contribution, choose full reversal or
   partial adjustment, enter a reason; then the pending-corrections page where a
   different admin approves it; finish on the transactions report showing the
   original and the correction side by side.

**Narration:**
> "Next is the contribution system. It covers monthly maintenance, gym, swimming pool, annual celebrations, feasts, and similar expenses.
>
> We begin from the home page. It has a link for contribution capture."
>
> [Contribution Capture Page]
>
> "We choose the contribution type. We choose the unit making the payment. We choose the payer. We enter the transaction ID. And we choose the months covered by the payment.
>
> Then the process is complete.
>
> Notice what we did not type: the amount.
>
> The app works it out from the rate in force on the day of payment. For maintenance, it also uses the area of the flat. Then it locks the amount in.
>
> And the system will not let the same flat pay the same head for the same month twice."
>
> [paid unpaid matrix]
>
> "This matrix can be filtered by year, contribution type, and block. It shows payment amounts across months for all units in the selected block."
>
> [a posted contribution]
>
> "Now the part that matters most for trust.
>
> Once a payment is recorded, it cannot be edited or deleted. Not by an admin. Not through the API.
>
> If a mistake must be fixed, the app does what an accountant would do. It adds a new, linked entry that offsets the original. The offset can be for the full amount or for part of it. And it needs a reason."
>
> [correction form]
>
> "That correction is not final on its own. A second person, a different admin, must approve it before it counts."
>
> [pending corrections page, then transactions report]
>
> "Every step is recorded. The app records who did it, in what role, and when.
>
> The report shows the original payment and the correction side by side. So the history tells the true story, including the mistake."

---

## Scene 6 — Complaints (6:00–6:45)

**Visual:** Screen recording — the complaints summary on the home page, then the
complaints browse/create page, then a complaint detail page.

**Narration:**
> "The home page also shows a summary of complaints. It shows open complaints, breached deadlines, and the oldest unresolved issues.
>
> A view-all option opens a page for creating and browsing all complaints.
>
> An authorized user can select any complaint ID. Then they can update its status or add relevant notes."

---

## Scene 7 — What this episode was, and wasn't (6:45–7:15)

**Visual:** Talking head.

**Narration:**
> "What you just saw is the finished behavior, not the code.
>
> That is on purpose. In this playlist, we build the mental model of the application before we touch a single file.
>
> Here are two ideas to carry forward. People and flats are linked by timelines, not fields. And money records are never rewritten. They are only corrected by adding to them.
>
> In the next episode, we will zoom into the core model. That means blocks, units, and individuals.
>
> We will also start looking at why ownership and residency are treated as relationships, not just fields."

---

## Outro / CTA (7:15–7:30)

**Visual:** End card pointing to Episode 2.

**Narration:**
> "Subscribe if you want to follow this build from the ground up.
>
> I will see you in Episode 2."

---

## Production Notes

- **Status: to be re-recorded in full.** An earlier take covered login through
  complaints without the role explanation, the `/individuals` clip, or the
  immutable-records and correction story. This version replaces it; narration for
  Scenes 2–6 is mirrored in `youtube/00-start-here-video-script.txt`.
- **Demo data to prepare before recording:**
  - Flat 1001 in Nalanda needs ownership history **and residency history**. Its
    residency rows were deleted on 2026-10-20 (snapshot saved in the git-ignored
    `backups/` folder), so either restore them or add a resident through the
    `/residencies` page on camera.
  - Scene 5 needs one posted maintenance payment to correct, one correction
    submitted by a Manager, and a second user (Society Admin) to approve it. Do
    the approval on camera, or record the pending state and the approved state as
    two short takes. Use a throwaway unit if you do not want to touch real
    entries; the app never deletes them, so any correction you post stays in the
    ledger.
  - Log in as a Read-Only user briefly in Scene 2 (or cut a short clip) to show
    the masked mobile/email fields.
- **Pages involved:** `/home`, `/blocks`, `/units`, `/individuals`, `/ownerships`,
  `/residencies`, `/contributions` (capture and correction form),
  `/reports/contributions/paid-unpaid-matrix`, `/contributions/corrections`
  (admin approval queue), `/reports/contributions/transactions`, and the
  complaints pages. There is no separate `/contribution-heads` capture planned.
- **Source material:** `youtube/00-start-here-video-script.txt` (narration for
  Scenes 2–6), `course/00-intro/app-tour.md`, `vault/00-Core/System-Overview.md`
  (society name, block names, V1 module list), `vault/00-Core/Roles-and-Permissions.md`
  (roles and masking), `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`
  and `ADR-004-Partial-Adjustment-Corrections.md` (corrections).
- **Fact check before recording:** confirm the correction form shows the
  "Correction Type" selector (full reversal / partial adjustment), and that the
  pending-corrections page is reachable from the navigation for a Society Admin.
- **B-roll:** none required; this episode is 100% product screen capture plus
  talking head.
- **Follow-up consideration:** a short trailer for `youtube/00-start-here.md`
  (the channel intro) reuses 3–4 silent clips cut from this same recorded
  footage — see that script's Scene 2 production note.
- **Where the deeper versions live:** the immutability and correction story is
  taught in depth in Episode 4 (the contributions engine) and in Playlist B
  Episode 6; this episode only plants the idea.
