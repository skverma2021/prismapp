# C-05 — The Auth Boundary

---

## Slide 1 of 3 — What Authentication and Authorization Mean Here

**Headline:** AuthN answers "who are you?" AuthZ answers "what can you do?"

**Talking points:**
- Two terms that are often conflated, especially in tutorials that combine them into a single "auth" step:
  - **Authentication (AuthN)**: verifying that the caller is who they claim to be. Result: a verified identity — a `userId`.
  - **Authorization (AuthZ)**: verifying that the verified identity is permitted to perform the requested operation. Result: a permitted action — or a `403 FORBIDDEN`.
- PrismApp uses **next-auth** for authentication. When a user logs in with their email and password, next-auth verifies the credentials against `bcryptjs`, then issues a **JWT** — a signed token that contains the user's `userId` and `role` claim. The token is stored in a cookie.
- Every subsequent request carries this cookie. The server reads the cookie, verifies the JWT signature with `AUTH_SECRET`, and extracts the identity without hitting the database.

**The three roles** (from `src/lib/user-role.ts`):
```typescript
type UserRole = "SOCIETY_ADMIN" | "MANAGER" | "READ_ONLY"

READ_ACCESS_ROLES  = ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"]  // all can read
MUTATION_ROLES     = ["SOCIETY_ADMIN", "MANAGER"]                // only these two can write
// SOCIETY_ADMIN alone is required for: user management, audit log, bulk operations
```

- The role is embedded in the JWT at login. The server trusts it for the lifetime of the token. This avoids a database lookup on every request.

**Visual:** Sequence diagram: Login → verify credentials → issue JWT with `{ userId, role }` → cookie. Then: subsequent request → read cookie → verify JWT → extract `{ userId, role }` → no database hit.

**Takeaway:** JWT authentication is stateless: the role is cryptographically verified from the cookie on every request. There is no server-side session store.

---

## Slide 2 of 3 — Enforcing the Boundary: `requireReadRole` and `requireMutationRole`

**Headline:** The boundary is a function call, not a convention.

**Talking points:**
- Open `src/lib/authz.ts`. The implementation is short enough to read in full in a lecture.
- The call chain is:
  1. `requireReadRole(request)` calls `requireRole(request, READ_ACCESS_ROLES)`
  2. `requireRole` calls `getAuthContext(request)`
  3. `getAuthContext` calls `next-auth/jwt`'s `getToken()`, verifies the JWT, and extracts `userId` + `role`
  4. If the token is missing or invalid → `throw new HttpError(401, "UNAUTHORIZED", ...)`
  5. If the role is not in `allowedRoles` → `throw new HttpError(403, "FORBIDDEN", ...)`
  6. On success, returns `AuthContext = { userId: string, role: UserRole }`

- Return to `app/api/blocks/route.ts`. Point to the first line of each handler:

```typescript
// GET — any authenticated user (SOCIETY_ADMIN, MANAGER, READ_ONLY)
await requireReadRole(request);

// POST — only SOCIETY_ADMIN or MANAGER; also captures who made the change
const actor = await requireMutationRole(request);
```

- The returned `actor` is passed to `createBlock(input, actor)`. The service writes the actor's `userId` and `role` to the audit log. This is how the system knows **who** made every change — essential for financial immutability (covered in Section B, C-01).
- Three convenience functions handle the three tier levels:
  - `requireReadRole` — all three roles
  - `requireMutationRole` — SOCIETY_ADMIN and MANAGER
  - `requireAdminRole` — SOCIETY_ADMIN only (user management, audit log)

**Visual:** Annotated `authz.ts` with the call chain arrows: `requireMutationRole` → `requireRole` → `getAuthContext` → `getToken` → JWT cookie. Highlight the two throw points in red: 401 (no token) and 403 (wrong role).

**Takeaway:** `requireReadRole` and `requireMutationRole` are the boundary. They must be the first `await` in every Route Handler. Skipping them leaves the endpoint unprotected.

---

## Slide 3 of 3 — The Critical Misconception: UI-Only Role Checks Are Not Security

**Headline:** If the Route Handler doesn't check the role, the endpoint is unprotected — regardless of what the UI shows.

**Talking points:**
- This is one of the most common security mistakes in student projects and junior developer code: hiding a button in the UI based on the user's role, and believing that the operation is therefore protected.
- Live demonstration of the problem. Imagine the delete button for a block is hidden in the UI unless the user is `SOCIETY_ADMIN`. But the Route Handler's `DELETE` function forgets to call `requireMutationRole`. What happens?

```bash
# As a READ_ONLY user, the browser shows no delete button.
# But with curl, anyone can call the API directly:
curl -X DELETE https://prismapp.example.com/api/blocks/some-id \
     -H "Cookie: next-auth.session-token=<READ_ONLY_token>"

# Without requireMutationRole → the deletion succeeds.
```

- The UI is a convenience, not a guard. The network is the attack surface. Any tool that can send an HTTP request can bypass the UI entirely.
- The rule from the implementation checklist in AGENTS.md Section 12: "Keep UI gating aligned with backend rules, but never rely on UI-only enforcement."
- Correct pattern: UI hides the button → UX benefit (the user isn't confused). Route Handler checks the role → security guarantee. Both are needed.

**The two-layer diagram:**
```
Layer 1 — Rendering layer (Next.js layout + page):
  requireServerAppSession() → prevents rendering private pages
  role check in UI → hides unauthorized controls
  ↳ Purpose: user experience, not security

Layer 2 — Data layer (Route Handler):
  requireReadRole() / requireMutationRole() / requireAdminRole()
  ↳ Purpose: security. This is the actual enforcement.
```

- Third-party API clients, automated scripts, and curious developers all bypass the rendering layer. Only Layer 2 stops them.

**Visual:** Two swim lanes: "Rendering Layer" and "Data Layer." Show an arrow from an external curl command jumping past the rendering layer entirely and hitting the Route Handler. Without the auth check, the arrow goes through. With the check, it is stopped.

**Takeaway:** Server-side auth enforcement in Route Handlers is the only real protection. UI-level role checks are user experience, not security. Write both, but never rely on just the first.

**Transition to C-06:** "We've covered every layer of the stack. In the exercise, we'll put it all together and trace a single request from a user's click to the database and back."
