# Module Outline — C2: Technology Stack (Part 2 — API Contract, Auth Boundary, Exercise)

> **This is Part 2 of Section C.** Part 1 is in [`../C1-technology/00-module-outline.md`](../C1-technology/00-module-outline.md).
> Read Part 1 first for prerequisites and the full learning-objectives list.

## Identity

| Field | Value |
|---|---|
| Section | C2 — Technology Stack and Architecture (Part 2 of 2) |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | C1 — Technology Part 1 (Stack Choices + App Router + Modular Monolith) |
| Estimated duration | 21–24 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives (Part 2)

By the end of this part, the student will be able to:

1. Describe the shared API envelope contract and explain why a consistent response shape simplifies client code.
2. Explain why the auth boundary must be enforced at the server layer and cannot rely on UI-only role checks.
3. Trace a request end-to-end through the full stack — browser → Client Component → route handler → authz → service → Prisma → database → response.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 4 | `04-api-contract.md` | The Shared API Contract | 7 min |
| 5 | `05-auth-boundary.md` | The Auth Boundary | 7 min |
| 6 | `06-technology-exercise.md` | Exercise: Trace a Request | 7 min |

---

## Key Takeaways (Part 2)

1. A shared API envelope (`ok()`/`fail()`) makes every API response predictable — the client never needs to guess the response shape.
2. The auth boundary is a server-enforced gate. Role checks in the UI are user experience, not security. If the route handler does not check the role, the endpoint is unprotected — regardless of what the navigation menu shows.
3. Tracing a request end-to-end is the single most useful debugging skill for a full-stack developer. Learn the exact layer names and their responsibilities.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/00-Core/Roles-and-Permissions.md` | 5 | Role definitions and permission matrix |
| `vault/03-API/Error-Model.md` | 4 | Error envelope spec, status code mapping |

## Code References

| File | Used in topic # | What to show |
|---|---|---|
| `src/lib/api-response.ts` | 4 | `ok()`, `fail()`, `HttpError`, error codes |
| `src/lib/authz.ts` | 5 | `requireReadRole()`, `requireMutationRole()` |
| `app/api/blocks/route.ts` | 4, 5 | Route handler shape: auth → parse → service → `ok()`/`fail()` |
| `course/00-intro/request-lifecycle.md` | 6 | Full ASCII architecture trace diagram |

---

## Assessment / Discussion Questions

1. A teammate returns `{ success: true, result: [...] }` from one endpoint and `{ data: [...] }` from another. What problem does this create for the client?
2. A nav menu hides the "Admin" link from non-admins. Is this sufficient access control? What must also be present?
3. You are debugging a 403 response on `POST /api/contributions`. Name every layer you would check, in order.
4. *Stretch:* `requireReadRole()` throws an `HttpError` when the role check fails. Why is throwing preferable to returning a value at the route handler level?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `src/lib/api-response.ts`; `src/lib/authz.ts`; `app/api/blocks/route.ts`; `vault/00-Core/Roles-and-Permissions.md` |
| Diagrams needed | Full request lifecycle diagram (topic 6 exercise) |
| Talking-head segments | Intro to Part 2 (30s); wrap-up for full Section C (90s) |

---
