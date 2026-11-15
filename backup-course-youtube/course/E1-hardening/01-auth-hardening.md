# E-01 — AuthN vs AuthZ: The Two-Layer Model

---

## Slide 1 of 3 — Two Questions, Two Answers

**Headline:** Authentication asks "who are you?" Authorization asks "are you allowed to do this?"

**Talking points:**
- These are two separate concerns. Confusing them produces systems that are locked down for the wrong reasons — or open for the wrong ones.
- **Authentication (AuthN):** Verifies identity. In PrismApp, this happens once at login: the `authorize()` function in `auth.ts` calls `db.appUser.findUnique({ where: { email } })`, compares the password hash with `bcryptjs.compare`, and returns a user object. From that point forward, the identity is encoded in a JWT. No more database lookups for subsequent requests.
- **Authorization (AuthZ):** Verifies permission. This happens on every request that touches a protected resource. The JWT contains `userId` and `role`. `getAuthContext` in `authz.ts` verifies the JWT cryptographically — it never hits the database. If the token is valid, the role is trusted.

```typescript
// src/lib/authz.ts — the full chain

export async function getAuthContext(request: Request): Promise<AuthContext> {
  const token = await getToken({
    secret: authSecret,
    req: { headers: request.headers, cookies: getRequestCookies(request) } as never,
  });

  const userId = typeof token?.userId === "string" ? token.userId : ...;
  const roleValue = typeof token?.role === "string" ? token.role : null;

  if (!userId || !roleValue) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const role = parseUserRole(roleValue);
  if (!role) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication is invalid.");
  }

  return { userId, role };
}
```

- `getToken` verifies the JWT signature against `AUTH_SECRET`. If the signature is invalid (tampered token, wrong secret, expired), `token` is null. No valid token → 401.
- The database is not consulted. If a user account is deactivated after login, their JWT remains valid until it expires. This is the trade-off of the JWT strategy — stateless verification at the cost of no real-time revocation. Acceptable for V1.

**Visual:** Two-box diagram — "Login" (one DB hit) → "JWT issued" → all subsequent requests → "JWT verified cryptographically (no DB hit)". Arrow label: "Identity travels in the token."

**Takeaway: Authentication hits the database once. Authorization never hits the database. The JWT is the proof of identity for the session lifetime.**

---

## Slide 2 of 3 — 401 vs 403: Not Interchangeable

**Headline:** 401 means "I don't know who you are." 403 means "I know who you are, and you can't do this."

**Talking points:**
- This distinction is not cosmetic — it tells clients how to recover.
- **401 Unauthorized:** No valid token, or the token is malformed. The correct client action is to redirect to login. The auth system failed to establish identity.
- **403 Forbidden:** Valid token, but the user's role is not in the allowed set. The correct client action is to show an "access denied" message — not a login redirect. Redirecting to login when the user is already authenticated is confusing UX.

```typescript
// src/lib/authz.ts

export async function requireRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<AuthContext> {
  const auth = await getAuthContext(request); // throws 401 if no valid token

  if (!allowedRoles.includes(auth.role)) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }

  return auth;
}

export function requireReadRole(request: Request)    { return requireRole(request, READ_ACCESS_ROLES); }
export function requireMutationRole(request: Request) { return requireRole(request, MUTATION_ROLES); }
export function requireAdminRole(request: Request)    { return requireRole(request, ["SOCIETY_ADMIN"]); }
```

- `getAuthContext` throws 401. `requireRole` throws 403 after a successful `getAuthContext`. The status codes are determined by where in the chain the failure occurs.
- `READ_ACCESS_ROLES = ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"]`. All three roles can read.
- `MUTATION_ROLES = ["SOCIETY_ADMIN", "MANAGER"]`. Read-only users are rejected with 403 on any write.
- `requireAdminRole` is used for admin-only operations: user management, audit log access.

**Visual:** Decision tree — "No token or invalid token?" → 401. "Valid token, wrong role?" → 403. "Valid token, correct role?" → `AuthContext { userId, role }` returned.

**Takeaway: The HTTP status code tells the client what to do next. 401 → go log in. 403 → you're logged in, but you don't have access.**

---

## Slide 3 of 3 — UI Gating Is Not Security

**Headline:** Hiding a button is UX. Rejecting the request is security. Both are required.

**Talking points:**
- Open `app/(dashboard)/blocks/page.tsx`. Near the top:

```tsx
const { session } = useAuthSession();
const canMutate = session.role !== "READ_ONLY";

// ... in JSX:
<button
  type="button"
  disabled={!canMutate || crud.createLoading || createDescription.trim().length === 0}
  onClick={handleCreate}
>
  Create Block
</button>
```

- The Create button is disabled when `canMutate` is false. A Read-Only user sees the form but cannot submit it. This is the UI layer.
- Now open `app/api/blocks/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request); // ← rejects READ_ONLY with 403
    ...
  }
}
```

- `requireMutationRole` runs regardless of what the UI showed. Even if someone bypasses the UI entirely — calls `fetch("POST /api/blocks")` from a browser console, a Postman collection, or a curl command — the route handler still rejects them.
- The UI layer and the server layer serve **different purposes**:
  - UI layer: prevents accidental clicks, provides visual feedback that a feature is unavailable, reduces user frustration.
  - Server layer: enforces the actual security boundary. Must work even when the UI is absent.
- The rule: never rely on the UI to protect a sensitive operation. The UI can be bypassed by anyone who can open a terminal.

**Visual:** Split diagram — Left: browser showing disabled button (label: "UI layer — courtesy only"). Right: server receiving a direct POST with a Read-Only JWT and returning 403 (label: "Server layer — actual enforcement"). Arrow between them: "Anyone can bypass the left side."

**Takeaway: Server-side role checks are not optional even when the UI hides the button. Both layers exist, but only the server layer is the security boundary.**
