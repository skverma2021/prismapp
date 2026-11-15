# Slide Script — A-05: Saying No — and Writing It Down

---

## Slide 1 — The Cost of an Unwritten Deferral

**Type:** `Concept`

**Headline:**
> An unwritten "we'll do it later" becomes an implicit promise that derails sprints.

**Visual / layout:**
A speech bubble from a stick figure developer: "We'll add photo attachments later." A clock fast-forwards. Next sprint: a second figure points at a requirements doc: "Where are the photo attachments?" The developer looks confused. No written record exists.

**Narration:**
Every project has features that the team decides to defer. The question is not whether to defer — deferring is good, responsible engineering. The question is whether the deferral is written down and agreed upon by everyone.

When a deferral is unwritten, it becomes an implicit promise. The developer who said "we'll do it later" means "we might do it eventually, if the priorities align." The product manager who heard "we'll do it later" means "it will be in the next sprint." These two people are having completely different conversations.

In PrismApp, the CMM module was planned with a very long feature list — photo attachments, WhatsApp bot intake, vendor ratings, OTP-based closure, festival event suppression. If any of those had been left as verbal "we'll handle it" decisions, they would have resurfaced as urgent requirements the moment someone read the vision document and expected them to be implemented.

**On-screen action / demo:**
None — concept slide.

**Key takeaway:**
A verbal deferral is a misunderstanding waiting to happen. Write it down, or it does not count.

---

## Slide 2 — How PrismApp Manages Scope Control

**Type:** `Code`

**Headline:**
> AGENTS.md Section 10: a written, enforced scope boundary.

**Visual / layout:**
A screenshot of the relevant section of `AGENTS.md` — Section 10, "Scope Control" — with key phrases highlighted: "CMM is the highest-priority backlog module", "Do not implement CMM features during Contribution Module hardening cycles", "reject or defer" for safety/security/events/notifications.

**Narration:**
Open `AGENTS.md` in the project root. Scroll to Section 10 — Scope Control.

This section does three things that most projects never bother to do.

First, it names the next priority explicitly: CMM, not Safety, not Events. This prevents well-meaning developers from starting on Security features because those seem important.

Second, it states when CMM work begins: only after Phase 3 hardening quality gates are met. This is not a vague "after contributions are done." It is a specific, testable condition.

Third, it lists the deferred modules by name — Safety, Security, Events, WhatsApp bot, OTP closure — and says to *reject or defer* any work on them during current cycles. "Reject" is a strong word. It means if someone raises a pull request that adds an Events table, the reviewer has written authority to say no.

This is scope control as a team agreement, not as a feeling.

**On-screen action / demo:**
Open `AGENTS.md`. Scroll to Section 10. Read the first paragraph aloud.
Read the bullet list under "Still Deferred (Post-CMM Backlog)" aloud.
Point to the phrase "reject or defer."

**Key takeaway:**
Scope control only works when it is written, shared, and enforced — not just discussed.

---

## Slide 3 — Infrastructure Cost as a Deferral Reason

**Type:** `Concept`

**Headline:**
> Defer features that require infrastructure you do not yet have — and say why.

**Visual / layout:**
A two-column table. Left: Deferred feature. Right: Infrastructure it requires.
- Photo attachments → Vercel Blob / S3 storage
- WhatsApp bot → WhatsApp Business API integration
- SLA escalation → Cron / scheduled job infrastructure
- OTP closure → SMS gateway + real-time OTP validation

**Narration:**
There is a pattern in the CMM deferral list that every student should recognise. None of the deferred features are deferred because they are unimportant. They are deferred because they require infrastructure that does not yet exist.

Photo attachments need a file storage service — Vercel Blob or an S3-compatible bucket. That is a new external dependency, a new cost, and a new security surface to protect.

WhatsApp bot intake needs the WhatsApp Business API — a separate vendor integration, rate limits, message template approvals, and webhook handling.

SLA escalation needs a cron job or event-driven scheduler. PrismApp runs on Vercel, which is stateless. There is no "always-on" process to run timers. That constraint alone makes SLA escalation a separate infrastructure decision.

When you write down a deferral, write the reason too. "Photo attachments: deferred — requires file storage provider decision (Vercel Blob vs S3). See vault/CMM/cmm-vision.md — Open Questions 4." This transforms a vague deferral into a trackable decision.

**On-screen action / demo:**
Open `vault/CMM/cmm-vision.md`. Scroll to "New Infrastructure Required" under Implementation Notes.
Read the table aloud: Ticket ID sequence, File/image storage, Notification service, SLA timer.
Then scroll to "Open Questions" and read question 4 (photo storage provider).

**Key takeaway:**
The best deferrals name both the feature and the infrastructure gap that blocks it. That turns a vague "later" into a trackable prerequisite.

---

## Transition note

We have seen how scope is defined, layered, and controlled. Now the most important practical skill: given a single plain-English sentence, how do you find the requirements hiding inside it? That is the next and final topic — the hidden requirements exercise.
