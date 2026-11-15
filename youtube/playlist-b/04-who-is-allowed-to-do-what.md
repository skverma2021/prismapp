# Playlist B · Episode 4 — "Who's Allowed to Do What"

## Video Metadata

- **Playlist:** B — Architecture & SDLC (app-agnostic; episodes accumulate across
  every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Design & Contracts (2 of 3)
- **Target length:** 6–8 minutes
- **Primary goal:** Distinguish authentication from authorization, show a real
  permission matrix, and explain why enforcement must live on the server even when
  the UI already hides the option.
- **Title options:**
  1. Who's Allowed to Do What
  2. 401 vs 403: The Difference That Actually Matters
  3. Designing Roles Before You Design a Login Page
- **Thumbnail concept:** A simple 3×N permission matrix grid with a green check /
  red cross pattern, roles as columns.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Two questions sound similar, but they are completely different.
>
> 'Do I know who you are?' And 'are you allowed to do this?'
>
> If you confuse them in your code, you will ship a security bug that looks like a UI bug.
>
> Today, we see how this app keeps them separate on purpose."

---

## Scene 1 — Authentication vs. authorization, concretely (0:20–1:30)

**Visual:** Two-step diagram: Step 1 "Who are you?" (login, session cookie) → Step 2
"What can you do?" (role check per action).

**Narration:**
> "Authentication answers 'who are you?' It is the login, the session, and the cookie.
>
> Authorization answers a separate question. We ask it again on every action. 'Is this specific person, who we already know, allowed to do this specific thing?'
>
> You can be fully authenticated and still be told no.
>
> Combining these two checks into one is a classic source of bugs. The correct failure response is different for each. An unauthenticated request gets a `401`. An authenticated request that is not allowed gets a `403`."

---

## Scene 2 — Three roles, one matrix (1:30–2:50)

**Visual:** Screen recording — `vault/00-Core/Roles-and-Permissions.md` Permission
Matrix table (Society Admin / Manager / Read-Only across capability rows).

**Narration:**
> "This app defines three roles. For now, we deliberately keep nothing more granular than that.
>
> Society Admin has full access, including managing other users' roles.
>
> Manager has full operational access. But a Manager cannot change role assignments or perform destructive financial actions.
>
> Read-Only can view everything but cannot change anything.
>
> Notice one row that applies to every role equally. Nobody, at any role, can edit or delete a posted contribution.
>
> Some rules are not about role at all. They are absolute. And the matrix says so explicitly, instead of leaving it implied."

---

## Scene 3 — A payer doesn't need to be a role (2:50–3:50)

**Visual:** Diagram: an "Individual" (payer) box separate from an "AppUser" (system
role) box, connected by a dotted "may or may not be the same human" line.

**Narration:**
> "Here is a distinction that is easy to get wrong.
>
> Anyone in the system can be a payer. That can be an owner, a resident, or just a person recorded in the system. They do not need any platform role at all.
>
> Only a Manager or Admin can *record* that payment in the system.
>
> The person handing over cash and the person with a login are often different humans. So the data model keeps them as separate concepts. It does not force every payer to also be a system user."

---

## Scene 4 — Enforcement lives on the server, full stop (3:50–5:00)

**Visual:** Screen recording — attempting a direct API call (e.g. via a browser
devtools fetch or a REST client) to a mutation endpoint as a Read-Only session,
showing a `403 FORBIDDEN` response even though no UI button for it exists.

**Narration:**
> "Here is the rule that matters most in this episode. UI visibility is not authorization.
>
> Hiding a button for a Read-Only user is a convenience. It is not a security boundary.
>
> The real check happens again, every time, inside the route handler or server action. It runs before any business logic.
>
> I will prove it. Here is a direct call to a mutation endpoint. The Read-Only UI has no button for it at all.
>
> It is still rejected, with a proper `403`. It is not a silent failure or a stack trace."

---

## Scene 5 — What's deliberately deferred (5:00–5:50)

**Visual:** Screen recording — the "Open Questions" section of
`Roles-and-Permissions.md` (block-level scoping, maker-checker, PII default
visibility).

**Narration:**
> "Not every access-control question gets answered on day one. That is fine, as long as it is written down and not silently ignored.
>
> Should roles be scoped per block instead of global? Should financial corrections need a second approver?
>
> This document answers the questions needed for V1. It lists the rest as open, with recommended defaults. Roles are global for now. There is no mandatory second approver yet.
>
> So nobody mistakes 'not built yet' for 'forgotten.'"

---

## Outro / CTA (5:50–6:20)

**Visual:** End card pointing to Episode B5.

**Narration:**
> "Next episode, we go one layer deeper.
>
> We will see what happens to input the moment it arrives at the server, before any of these authorization checks even matter.
>
> Subscribe, and I will see you there."

---

## Production Notes

- **Screen recordings needed:** `vault/00-Core/Roles-and-Permissions.md` permission
  matrix and open-questions sections; a direct API call (devtools or REST client) to
  a mutation endpoint under a Read-Only session showing a `403`.
- **Diagrams needed:** authN-vs-authZ two-step diagram; Individual-vs-AppUser
  separation diagram.
- **Source material to reuse:** `vault/00-Core/Roles-and-Permissions.md` in full;
  `vault/03-API/Error-Model.md` "Authorization and Access-Control Mappings" section
  for the 401/403 mapping table.
- **Fact check before recording:** verify a Read-Only session actually receives
  `403` (not `401` or a silent no-op) on a real mutation endpoint before recording
  Scene 4 — this is the credibility moment of the episode and must be a genuine,
  unedited result.
