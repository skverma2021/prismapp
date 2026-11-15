# Playlist A1 · PrismApp — Episode 5 — "Complaint Management as a Workflow System"

## Video Metadata

- **Playlist:** A1 — PrismApp: Building a Real Society Management System
- **Target length:** 6–8 minutes
- **Primary goal:** Show complaints as a governed workflow (status lifecycle, SLA,
  visibility, anonymity) rather than a simple database record, and explain why that
  distinction matters.
- **Title options:**
  1. Complaint Management as a Workflow System
  2. A Complaint Isn't a Record. It's a Workflow.
  3. Anonymous Complaints, Real Accountability — How That's Even Possible
- **Thumbnail concept:** A status-chain graphic — Open → Assigned → In Progress →
  Resolved → Closed — with a curved "Reopened" arrow looping back to Open.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A broken gate isn't just a row in a table. It's a story with a beginning, several
> possible middles, and rules about who's allowed to say it's over. Today: how this
> app turns a complaint into a governed workflow instead of just a status field."

---

## Scene 1 — The lifecycle (0:20–1:30)

**Visual:** Animated status-chain diagram: Open → Assigned → In Progress → Resolved
→ Closed, with a "Reopened" arrow curving from Resolved back to Open.

**Narration:**
> "Every complaint moves through a fixed set of states: open, assigned, in progress,
> resolved, and closed. Movement is one-directional — you can't jump backward — with
> exactly one exception: a resolved complaint can be reopened, which sends it back to
> open. Everything else only moves forward. That constraint alone rules out an entire
> category of bugs, like someone accidentally 'un-resolving' a complaint by mistake
> through a stray API call."

---

## Scene 2 — The reopen window (1:30–2:30)

**Visual:** Screen recording — a resolved complaint showing a visible reopen deadline
label; then, on a different complaint whose window has already passed, cut to
DevTools console on that same page issuing a direct `PATCH` reopen call and showing
the rejected JSON response. Note in narration that the Reopen button itself is
simply absent once the window closes — the API call is there to prove the rule is
enforced server-side, not just hidden in the UI.
## Fetch
***
To film this shot you need to bypass the UI and call the API directly while logged in (browser session cookie carries auth automatically):

Open the complaint detail page for MSH-2026-00001 so you're authenticated in that tab.
Open DevTools → Console, and run:

fetch(`/api/complaints/${location.pathname.split("/").pop()}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "Reopened" }),
}).then(r => r.json()).then(console.log)
***

**Narration:**
> "Reopening isn't open-ended. A resident has a 48-hour window from the moment a
> complaint is marked resolved to say 'this isn't actually fixed.' After that window,
> and once the complaint is closed, the status is frozen — no more transitions at
> all. That's a deliberate trade-off: it protects staff from complaints being
> reopened weeks later for unrelated reasons, while still giving residents a fair,
> bounded chance to push back. And this isn't just a button that disappears — even
> a direct API call gets rejected once the window's closed."

---

## Scene 3 — Every transition is witnessed (2:30–3:20)

**Visual:** Screen recording — a complaint's audit trail / status history panel
showing timestamps and actor names.

**Narration:**
> "Every single status change is written to an audit log with who did it and when.
> This isn't optional logging bolted on for compliance — it's part of the core
> design, because a workflow without an audit trail is just a rumor. If a resident
> disputes that their complaint was ever actually 'in progress,' there's a real
> record to check."

---

## Scene 4 — Categories, priorities, and SLA (3:20–4:10)

**Visual:** Screen recording — the create-complaint form showing a category dropdown
and a priority dropdown, with an SLA hours value displayed once priority is picked.

**Narration:**
> "Every complaint is filed against a predefined category and a predefined priority
> — not free text, so reporting stays consistent. Priority carries a target
> resolution time, an SLA, in hours. Right now that SLA is tracked and visible, but
> automatic escalation when it's breached is intentionally deferred — a good example
> of scoping a feature honestly instead of half-building automation nobody's
> validated yet."

---

## Scene 5 — Anonymous, but not unaccountable (4:10–5:30)

**Visual:** Split screen — left: a resident's view of an anonymous complaint with
the reporter hidden; right: a manager's view of the same complaint with the reporter
visible.

**Narration:**
> "This is the interesting one. A complaint can be filed anonymously — the reporter's
> identity is hidden from most staff and from other residents. But the system never
> actually forgets who filed it. The identity is stored, just not returned in
> resident-facing responses. Managers and admins can still see it. So 'anonymous'
> here means 'protected from casual visibility,' not 'untraceable' — which is exactly
> the balance a real society needs: residents can report sensitive issues without
> fear, but there's still a real person accountable for false reports if it ever
> comes to that."

---

## Scene 6 — Notes: internal vs. resident-visible (5:30–6:20)

**Visual:** Screen recording — a complaint's notes panel with two note types visibly
tagged, "Internal" and "Resident".

**Narration:**
> "Staff can attach notes to a complaint as they work it — but each note is tagged
> either internal, visible only to managers and admins, or resident-facing, visible
> to everyone. Only managers and admins can post internal notes. And once a note is
> posted, it can't be edited or deleted — notes are append-only, same philosophy as
> the financial ledger in the last episode: the record of what was said and when
> doesn't get quietly rewritten."

---

## Scene 7 — Why this counts as "engineering" (6:20–7:00)

**Visual:** Talking head.

**Narration:**
> "None of this is complicated code. A status field, some booleans, a notes table.
> What makes it engineering is deciding, deliberately, what's allowed to change, who's
> allowed to see what, and how long a decision stays open before it's final. Get
> those decisions right, and the code that enforces them is almost the easy part.
> Next episode, we go back to the very first step we skipped: how the application
> knows who you are, before any of these actions can happen at all."

---

## Outro / CTA (7:00–7:30)

**Visual:** End card pointing to Episode 6.

**Narration:**
> "If you've enjoyed seeing how business rules shape a real system, subscribe — next
> time we follow the login, and then go one level deeper into the architecture
> itself."

---

## Production Notes

- **Screen recordings needed:** complaint list with status badges, one complaint's
  full detail/history panel, resolved-complaint reopen countdown, create-complaint
  form (category/priority/SLA), anonymous complaint shown from a resident view vs. a
  manager view, notes panel with Internal vs. Resident tags.
- **Rejected late-reopen shot:** the Reopen button is not disabled, it's absent once
  `reopenDeadline` has passed (see `app/(dashboard)/complaints/[id]/page.tsx`), so
  there is no button to click for this shot. Capture it via the browser DevTools
  console instead, on the detail page of an already-resolved, out-of-window
  complaint (e.g. one resolved 7+ days ago): run
  `fetch(`/api/complaints/${location.pathname.split("/").pop()}`, { method: "PATCH",
  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status:
  "Reopened" }) }).then(r => r.json()).then(console.log)` and show the returned
  `409 PRECONDITION_FAILED` / "Reopen window has elapsed" JSON.
- **Diagrams needed:** status-chain lifecycle diagram with the Reopened loop-back.
- **Source material to reuse:** `vault/01-Domain/Domain-Rules.md` "Complaint Rules
  (CMM)" section, rules `CM1`–`CM18`; `vault/00-Core/System-Overview.md` for CMM's
  current delivery status (Sprints 0–2 delivered; photo attachments, notifications,
  and SLA escalation cron are explicitly out of scope for now — worth a one-line
  mention if the video invites "why isn't X automated yet" comments).
- **Fact check before recording:** confirm seed/test data has at least one anonymous
  complaint and one complaint with both an internal and a resident-visible note, so
  Scenes 5 and 6 show real data rather than a contrived example.
