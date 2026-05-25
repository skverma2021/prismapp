# Module Outline — C: Technology Stack and Architecture

## Identity

| Field | Value |
|---|---|
| Section | C — Technology Stack and Architecture |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | Section A (Defining Scope); Section B (ERD); basic familiarity with React and REST APIs |
| Estimated duration | 40–45 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives

By the end of this module, the student will be able to:

1. Explain how each major technology in the stack was chosen to satisfy a specific architectural requirement.
2. Distinguish between Server Components and Client Components in the Next.js App Router and identify the correct use of each.
3. Describe the modular monolith folder structure and explain what belongs in a service file versus a schemas file versus a route handler.
4. Trace the lifecycle of an API request — from browser to database and back — naming every layer it passes through.
5. Explain why the auth boundary must be enforced at the server layer and cannot rely on UI-only role checks.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 1 | `01-stack-overview.md` | Technology Choices Follow Architecture | 6 min |
| 2 | `02-app-router-patterns.md` | The Next.js App Router | 8 min |
| 3 | `03-modular-monolith.md` | The Modular Monolith | 7 min |
| 4 | `04-api-contract.md` | The Shared API Contract | 7 min |
| 5 | `05-auth-boundary.md` | The Auth Boundary | 7 min |
| 6 | `06-technology-exercise.md` | Exercise: Trace a Request | 7 min |

---

## Key Takeaways

1. Technology is not chosen by preference — it is chosen to satisfy deployment constraints, data integrity requirements, and team velocity goals. Every tool in this stack can be traced to a requirement.
2. In the Next.js App Router, Server Components run on the server and are the correct place for auth checks and data fetching. Client Components run in the browser and are correct for interactivity.
3. The modular monolith is the right first architecture for V1: bounded modules without the operational overhead of distributed services.
4. A shared API envelope (`ok()`/`fail()`) makes every API response predictable — the client never needs to guess the response shape.
5. The auth boundary is a server-enforced gate. Role checks in the UI are user experience, not security. If the route handler does not check the role, the endpoint is unprotected — regardless of what the navigation menu shows.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `AGENTS.md` | 1 | Section 5 (Architecture Baseline), Section 2 (non-negotiable rules) |
| `vault/00-Core/Roles-and-Permissions.md` | 5 | Role definitions and permission matrix |
| `vault/03-API/Error-Model.md` | 4 | Error envelope spec, status code mapping |

## Code References

| File | Used in topic # | What to show |
|---|---|---|
| `src/lib/db.ts` | 1, 3 | Prisma singleton, adapter-pg pattern |
| `app/(dashboard)/layout.tsx` | 2 | Server Component auth gate |
| `proxy.ts` | 2 | Next.js 16 middleware pattern |
| `app/api/blocks/route.ts` | 3, 4 | Route handler shape: auth → parse → service → `ok()`/`fail()` |
| `src/modules/blocks/blocks.service.ts` | 3 | Service function structure |
| `src/modules/blocks/blocks.schemas.ts` | 3 | Input parsing with Zod |
| `src/lib/api-response.ts` | 4 | `ok()`, `fail()`, `HttpError`, error codes |
| `src/lib/authz.ts` | 5 | `requireReadRole()`, `requireMutationRole()` |

---

## Assessment / Discussion Questions

1. Why is PostgreSQL a better fit than a document database for this system? Name two domain rules from Section B that require relational enforcement.
2. What is the difference between a Next.js Server Component and a Client Component? Give one example of each from the PrismApp codebase.
3. A junior developer adds a `DELETE /api/contributions/:id` endpoint but forgets to call `requireMutationRole`. What is the security impact? What domain rule does it also violate?
4. The `ok()` function in `api-response.ts` wraps data in an envelope. What fields does the envelope include and why does the client benefit from this consistency?
5. *(Stretch)* The `proxy.ts` file implements rate limiting for the login endpoint only. Why not rate-limit every endpoint? What would be the operational downside?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `src/lib/db.ts`; `app/(dashboard)/layout.tsx`; `proxy.ts`; `app/api/blocks/route.ts`; `src/modules/blocks/`; `src/lib/api-response.ts`; `src/lib/authz.ts` |
| Diagrams needed | Stack diagram (topic 1); Server vs Client component model (topic 2); module folder tree (topic 3); API envelope shape (topic 4); auth boundary swim-lane (topic 5); full request trace diagram (exercise) |
| Talking-head segments | Intro (30s), transition between topics 3 and 4, module wrap-up |

---

## Status

- [ ] Slide scripts drafted (01–06)
- [ ] Speaker notes assembled (slides/C-technology-notes.md)
- [ ] Diagrams created
- [ ] PPT built
- [ ] Camtasia recorded
- [ ] Review pass complete
