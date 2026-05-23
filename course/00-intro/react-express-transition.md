# Transition Guide — From React + Express to Next.js

**Audience:** Developers who have built with a React (Vite/CRA) frontend and Express backend.
**Purpose:** Name the six mental model shifts before they become silent confusion.
**Placement:** Present this before Section C, immediately after the App Tour.

---

## Slide 1 of 5 — One Project, No Separate Server

**Headline:** You don't run two terminals anymore.

**Talking points:**

In the React+Express world, your workspace looks like this:

```
my-project/
  backend/         ← Node.js / Express  (terminal 1: node server.js)
    server.js
    routes/
      blocks.js
  frontend/        ← React / Vite       (terminal 2: npm run dev)
    src/
      pages/
        Blocks.jsx
```

Two projects. Two `package.json` files. Two dev servers. A CORS policy to glue them together. A deployment strategy for each half.

In Next.js, the same system looks like this:

```
prismapp/          ← one project       (one terminal: npm run dev)
  app/
    (dashboard)/
      blocks/
        page.tsx   ← the UI
    api/
      blocks/
        route.ts   ← the API
  src/
    modules/
      blocks/
        blocks.service.ts
```

The API and the UI live in the same project, the same `node_modules`, and the same deployment. There is no CORS configuration because the frontend and backend share the same origin.

**The adjustment:** Stop thinking "frontend talks to backend." Start thinking "the app has UI code and server code, and the framework decides which runs where."

**Visual:** Side-by-side project tree — React+Express (two roots, two terminals) vs Next.js (one root, one terminal). Annotate: "No CORS. No separate deploy. One `npm run dev`."

**Takeaway: Next.js is not a frontend framework that calls a backend. It is one framework that runs both.**

---

## Slide 2 of 5 — There Is No Form Submit

**Headline:** `event.preventDefault()` was a workaround. Next.js doesn't need it.

**Talking points:**

In React+Express, a create form looks like this:

```jsx
// React SPA — Blocks.jsx
function CreateBlockForm({ onCreated }) {
  const [description, setDescription] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();            // ← stop the browser from reloading the page
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const data = await res.json();
    onCreated(data);
    setDescription("");
  }

  return (
    <form onSubmit={handleSubmit}>  {/* ← form with submit handler */}
      <input value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="submit">Create Block</button>
    </form>
  );
}
```

`e.preventDefault()` exists because browser forms, by default, trigger a full page navigation. In a SPA, that destroys your React state — so you intercept it.

In PrismApp's blocks page, the same feature looks like this:

```tsx
// Next.js — blocks/page.tsx (excerpt)
function handleCreate() {
  void crud.create<BlockItem>({
    endpoint: "/api/blocks",
    body: { description: createDescription.trim() },
    errorMessage: "Unable to create block.",
    onSuccess: (data) => {
      setCreateDescription("");
      browse.setSubmitSuccess(`Block created: ${data.description}`);
    },
  });
}

// In JSX:
<button
  type="button"          // ← not "submit"
  onClick={handleCreate} // ← plain click handler
>
  Create Block
</button>
```

There is no `<form onSubmit>`. There is no `e.preventDefault()`.
The button is `type="button"` — it has no default browser behavior to prevent.
The network call is inside `useCrudActions.create()`, a plain async function.

**Why the change?** In a component that manages its own loading state, success messages, and error notices, a `<form>` submit is not adding value — it is adding a behavior you have to immediately cancel. Removing the `<form>` is not a limitation; it is a simplification.

> Note: Next.js also supports **Server Actions** — `<form action={serverAction}>` — where the server receives the form data directly without any JavaScript at all. That is a different pattern built for progressive enhancement. PrismApp uses the `useCrudActions` pattern because the project needs client-side loading states and optimistic list updates. Both patterns are valid; the project picks the right one for its requirements.

**Visual:** The two code blocks above, side by side. Draw a red X through `e.preventDefault()` in the left column. Annotate the right column: "No form element. No default to prevent. The fetch is just a function call."

**Takeaway: `e.preventDefault()` was the workaround, not the pattern. When forms don't submit, there is nothing to prevent.**

---

## Slide 3 of 5 — The API Lives in a File, Not a Router

**Headline:** Express routes become exported functions. The filename IS the route.

**Talking points:**

Express routes are registered imperatively — you tell Express which URL maps to which handler:

```javascript
// Express — routes/blocks.js
const router = express.Router();

router.get("/", async (req, res) => {
  const { q, sortBy } = req.query;         // ← query params from req.query
  const blocks = await db.block.findMany({ where: { description: { contains: q } } });
  res.json(blocks);
});

router.post("/", authenticate, async (req, res) => {
  const { description } = req.body;        // ← body from req.body (after bodyParser)
  const block = await db.block.create({ data: { description } });
  res.status(201).json(block);
});

// server.js
app.use("/api/blocks", router);            // ← registration
```

In Next.js, the URL is the file path. HTTP methods are named exports:

```typescript
// app/api/blocks/route.ts
export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listBlocks(request.nextUrl.searchParams);  // ← searchParams, not req.query
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();  // ← await request.json(), not req.body
    const input = parseCreateBlockInput(payload);
    const data = await createBlock(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

The differences are mechanical — easy to map once you've seen them:

| Express | Next.js Route Handler |
|---|---|
| `req.query.sortBy` | `request.nextUrl.searchParams.get("sortBy")` |
| `req.body` (after `bodyParser`) | `await request.json()` |
| `req.params.id` | `const { id } = await params` (second argument) |
| `res.status(201).json(data)` | `return ok(data, 201)` |
| `app.use("/api/blocks", router)` | file is at `app/api/blocks/route.ts` |
| `app.use(authenticate)` | `await requireReadRole(request)` per handler |

The last row is the most important. Express auth is applied as global middleware — it runs before every handler unless you explicitly opt out. In Next.js Route Handlers, auth is applied per handler — every function calls `requireReadRole` or `requireMutationRole` at its first line. There is no global request pipeline to accidentally skip.

**Visual:** The two code blocks side by side. Below them: the translation table above. Circle `app.use(authenticate)` vs `await requireReadRole(request)` — annotate: "Global middleware vs per-handler. Explicit is harder to accidentally skip."

**Takeaway: The URL is the file path. The HTTP method is the function name. Auth is not middleware — it is a function call at the top of each handler.**

---

## Slide 4 of 5 — The Five Things That Will Surprise You

**Headline:** Symptoms first. Explanations second. You'll hit all five within your first week.

**Talking points:**

These are the five things that produce the most "it worked yesterday, why is it broken today" moments for Express developers new to Next.js:

**1. `params` is a Promise — you must `await` it**

```typescript
// Express
async function handler(req, res) {
  const { id } = req.params;         // plain object, no await needed
}

// Next.js App Router (v15+)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;       // must await — it is a Promise
}
```

Skip the `await` and `id` is `[object Promise]`. The error message is confusing. The fix is one word.

**2. `"use client"` is not optional for stateful components**

Any component using `useState`, `useEffect`, `useRef`, or browser APIs must declare `"use client"` as its first line. Without it, Next.js tries to render it on the server and throws.

```tsx
"use client";           // ← must be the FIRST line, before any imports

import { useState } from "react";

export function CreateBlockForm() { ... }
```

A Server Component (no directive) cannot use hooks. A Client Component (with directive) cannot directly `await` a database call. The boundary is explicit and intentional.

**3. `fetch` in Server Components is not the same as in the browser**

Next.js extends the global `fetch` in Server Components with caching behavior. If you `fetch("/api/blocks")` from a Server Component, it may return a cached response. In PrismApp, all server-side data access goes through Prisma directly — not through the API — specifically to avoid this complexity.

**4. Hot reload does not reset database state**

Express developers are used to `nodemon` restarting the entire process on file changes, which resets any in-memory state. Next.js fast refresh keeps the component state alive across hot reloads. If your UI shows stale data after an edit, the data is probably correct — the component's local state is just stale from before the reload. Refresh the page (not just the code) to reset.

**5. There is no `app.listen()` and no port**

You do not start a server. You do not pick a port. `npm run dev` starts Next.js, which handles all of that. In production on Vercel, there is no server at all — each Route Handler becomes a serverless function. The implications are: no in-memory state between requests, no `setInterval` in server code, and no assumptions about request ordering.

**Visual:** Five numbered callout boxes. Each one: symptom in red ("id is [object Promise]"), fix in green ("add await"). Keep each box to two lines.

**Takeaway: The surprises are predictable. Once you've seen them listed, you'll recognize them immediately when they appear.**

---

## Slide 5 of 5 — Authentication Without the Plumbing

**Headline:** You configure auth once. The framework handles the lifecycle. You only write role enforcement.

**Talking points:**

In a React+Express setup, authentication is infrastructure you build yourself:

```javascript
// Express — auth middleware (typical setup)
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// 1. Configure strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await db.user.findUnique({ where: { username } });
  if (!user) return done(null, false);
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? done(null, user) : done(null, false);
}));

// 2. Login route — sign and return a token
app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
  const token = jwt.sign({ userId: req.user.id, role: req.user.role },
    process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });                 // ← client must store this somewhere
});

// 3. Verify token on every protected route
app.use("/api/blocks", (req, res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});
```

Three distinct steps: configure a strategy, issue a token, verify that token on every request. On the React side, you store the token in localStorage (or a cookie you manage manually), attach it to every `fetch` call, and handle expiry yourself.

In NextAuth, the same responsibilities are distributed differently:

```typescript
// auth.ts — configure once
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await db.appUser.findUnique({
          where: { username: credentials.username },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        return ok ? { id: user.id, role: user.role, name: user.displayName } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.userId = user.id; token.role = user.role; }
      return token;
    },
  },
};
```

```typescript
// authz.ts — verify on every route handler (no database hit)
export async function getAuthContext(request: NextRequest) {
  const token = await getToken({ req: request }); // ← cryptographic verify, no DB
  if (!token) throw new HttpError(401, "NOT_AUTHENTICATED", "Authentication required.");
  return { userId: token.userId, role: token.role };
}
```

The differences that matter most:

| Concern | React + Express | Next.js + NextAuth |
|---|---|---|
| Auth plumbing | You write passport/jsonwebtoken setup | `authOptions` in `auth.ts` — configured once |
| Token storage | localStorage or manual cookie | Automatic `httpOnly` / `Secure` / `SameSite` cookie |
| Token verification | Manual `jwt.verify()` in middleware | `getToken()` — cryptographic, no DB hit |
| Session in Route Handlers | Parse `Authorization` header | `await getToken({ req: request })` |
| Session in Server Components | Separate fetch or cookie parse | `await getServerSession(authOptions)` |
| Frontend auth state | `useState` + localStorage read | `useSession()` hook or Server Component session |
| Auth errors | Manual 401 response in each middleware | `requireReadRole` throws `HttpError(401)` — caught by `fromUnknownError` |

The key architectural point: NextAuth manages the **session lifecycle** (login → issue cookie → verify cookie → expose session). Your code manages **authorization** — who is allowed to do what. These two concerns are cleanly separated. You never write `jwt.sign`, `jwt.verify`, or cookie headers.

What NextAuth does NOT do: it does not enforce role-based access. That is still your code. `requireReadRole` and `requireMutationRole` in `authz.ts` are explicit calls at the top of every Route Handler — not global middleware. You own the enforcement layer; the framework owns the session layer.

**Visual:** Three-column diagram: `Client` → `NextAuth (session layer)` → `authz.ts (enforcement layer)`. Label the boundary. Show that token storage, cookie security attributes, and cryptographic verification live entirely in the middle column — your code touches neither.

**Takeaway: You configure NextAuth once. It handles cookies, token signing, and session exposure. You call `requireMutationRole` in every handler. The framework and your code each own exactly one layer.**

---

## Reference Card — React + Express vs Next.js

| Concept | React + Express | Next.js (PrismApp) |
|---|---|---|
| Project structure | Two repos, two servers | One project, one `npm run dev` |
| API definition | `app.use("/api/blocks", router)` | `app/api/blocks/route.ts` |
| Route params | `req.params.id` | `const { id } = await params` |
| Query string | `req.query.sortBy` | `request.nextUrl.searchParams.get("sortBy")` |
| Request body | `req.body` (after bodyParser) | `await request.json()` |
| Form submission | `<form onSubmit>` + `e.preventDefault()` | `<button type="button" onClick={handler}>` |
| Hooks in components | Anywhere | Client Components only (`"use client"`) |
| Data fetching on mount | `useEffect(() => { fetch... }, [])` | Server Component: `await db.X.findMany()` |
| Response | `res.status(200).json(data)` | `return ok(data)` |
| No-body response | `res.status(204).send()` | `return new Response(null, { status: 204 })` |
| Auth plumbing | `passport` + `jsonwebtoken` setup | `authOptions` in `auth.ts` — configured once |
| Token storage | localStorage or manual cookie | Automatic `httpOnly` / `Secure` / `SameSite` cookie |
| Token verification | `jwt.verify()` in middleware | `getToken()` — cryptographic, no DB hit |
| Session in handlers | Parse `Authorization` header | `await getToken({ req: request })` |
| Session in Server Components | Separate fetch or cookie parse | `await getServerSession(authOptions)` |
| Auth enforcement | `app.use(authMiddleware)` global | `await requireReadRole(request)` per handler |
