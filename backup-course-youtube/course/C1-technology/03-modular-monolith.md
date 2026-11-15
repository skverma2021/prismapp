# C-03 — The Modular Monolith

---

## Slide 1 of 3 — What Is a Modular Monolith?

**Headline:** One deployable unit. Multiple isolated modules. No microservice overhead.

**Talking points:**
- The two most common architectures students encounter in tutorials:
  1. **Single-file monolith**: all logic in one file or one folder. Fast to start. Impossible to maintain at 10+ entities.
  2. **Microservices**: each domain is a separate service with its own database, deployment, and API contract. Maximum isolation. Minimum speed for a team of one or two.
- PrismApp uses neither. It uses a **modular monolith**: one Next.js application, one PostgreSQL database, but with hard module boundaries enforced by folder structure and import discipline.
- The rule: a module can import from `src/lib/` (shared utilities) and from its own folder (`src/modules/blocks/`). It cannot import from another module (`src/modules/units/`). Cross-domain operations go through the service layer of the target module.
- Why this matters: when a future team member adds the CMM (Complaint Management Module), they create `src/modules/complaints/`. They do not touch `src/modules/contributions/`. The boundary prevents accidental coupling.

**Visual:** Folder tree of `src/modules/` showing all 13 module folders. Annotate `blocks/` with its three files: `blocks.service.ts`, `blocks.schemas.ts`. Draw a box around the entire `modules/` folder labeled "each module is an island."

| Level | What lives here | Rule |
|---|---|---|
| `src/lib/` | Shared utilities (db, api-response, authz, audit-log) | No domain logic |
| `src/modules/<domain>/` | Service functions + input schemas | No direct imports between modules |
| `app/api/<domain>/route.ts` | HTTP adapter (Route Handler) | Calls service functions only |
| `app/(dashboard)/<domain>/` | UI pages | Calls API over HTTP, never imports modules directly |

**Takeaway:** The folder structure is architecture. When structure enforces boundaries, accidental coupling becomes visible as a lint warning or a failed import.

---

## Slide 2 of 3 — What Goes Where: Service, Schemas, Route Handler

**Headline:** Three files per domain. Each file has exactly one responsibility.

**Talking points:**
- Open the `src/modules/blocks/` folder. Three concepts, three files. Every module in the project follows this pattern.

**`blocks.schemas.ts` — Input Parsing**
```
- Defines the input types: CreateBlockInput, UpdateBlockInput
- Parses and validates raw request payloads
- Throws HttpError(400, "VALIDATION_ERROR", ...) on bad input
- Does NOT touch the database
- Does NOT have business logic
```

Open `blocks.schemas.ts` and point to `parseCreateBlockInput`. Note: there is no Zod schema object here. The parsing is done with helper functions from `api-response.ts` (`requireString`, `parseOptionalString`). This is a deliberate choice: no extra dependency for simple cases. Zod would be introduced if the input shapes became complex.

**`blocks.service.ts` — Business Logic**
```
- Calls the Prisma client (db)
- Enforces domain rules (e.g., pageSize cannot exceed 100)
- Writes audit log entries on mutations
- Returns typed objects
- Does NOT know about HTTP (no Request, no Response, no status codes)
- Does NOT parse raw request payloads
```

Point to `listBlocks()`. It receives a `URLSearchParams` object — the service doesn't care whether this came from HTTP, a test, or a CLI script. It can be called from anywhere.

**`app/api/blocks/route.ts` — HTTP Adapter**
```
- Is a thin shell: auth → parse → service → respond
- Has NO business logic of its own
- Has NO Prisma calls
- Has NO domain knowledge — it delegates everything
```

**Takeaway:** If you see business logic in a Route Handler, it belongs in the service. If you see an HTTP status code in a service file, it belongs in the Route Handler (or as an `HttpError` thrown from the service).

---

## Slide 3 of 3 — Why Not Microservices?

**Headline:** Microservices solve a problem PrismApp doesn't have yet.

**Talking points:**
- The AGENTS.md Section 6 says: "Keep the implementation simple: no speculative abstractions, no premature microservices."
- What problem do microservices solve? They allow **independent scaling**, **independent deployment**, and **team autonomy at scale**. These are real benefits — for a project with 10 teams, 50 services, and millions of daily requests.
- What problem do microservices introduce? Network latency between services, distributed transaction management (the contribution detail must write to the header atomically — how do you do that across two services?), service discovery, separate CI/CD pipelines for each service, separate test environments.
- For PrismApp — a single-society management tool with one or two developers — those costs are not justified today.
- The modular monolith is the correct **first architecture**. The module boundaries (folder structure, no cross-module imports) are designed so that if a future requirement forces a module to scale independently, the extraction is a refactor, not a rewrite.
- Concrete example: if `src/modules/contributions/` needs to be extracted into a separate service someday, the boundary is already drawn. The extraction involves: create a new project, copy the service file, replace the Prisma import with an HTTP client, update the Route Handler to call the external service. No other module changes.

**Visual:** Three-column comparison: "Single file" (red: tangled, no boundaries), "Modular Monolith" (green: bounded, one deployment), "Microservices" (amber: bounded, multiple deployments, complexity arrows). Annotate the modular monolith column: "right choice for V1."

**Takeaway:** Choose the architecture that solves your current scale problem without ruling out future evolution. The modular monolith satisfies V1. Module boundaries make future extraction possible if needed.

**Transition to C-04:** "The service layer handles business logic. The Route Handler wraps it in HTTP. Now let's look at the contract that makes every HTTP response predictable — the shared API envelope."
