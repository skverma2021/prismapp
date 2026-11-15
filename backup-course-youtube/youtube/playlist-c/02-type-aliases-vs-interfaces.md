# Playlist C · Episode 2 — "Type Aliases vs. Interfaces"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Foundations (2 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show, with real code, that `type` and `interface` aren't
  interchangeable-by-preference — PrismApp uses `type` almost everywhere, and
  `interface` in exactly one place where `type` literally cannot do the job.
- **Title options:**
  1. Type Aliases vs. Interfaces
  2. Why This App Uses `type` Almost Everywhere — Except Here
  3. The One Job Only `interface` Can Do
- **Thumbnail concept:** Two labeled boxes — "type" (checked, used everywhere) and
  "interface" (checked once, labeled "next-auth.d.ts").
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "`type` and `interface` look almost the same, and most tutorials tell you to just
> pick one and move on. That's not quite right. This codebase uses `type` for
> almost everything — and `interface` exactly once, for a job `type` can't do at
> all. Let's see both."

---

## Scene 1 — Where `type` is doing all the work (0:20–1:45)

**Visual:** Open `src/hooks/use-browse-state.ts`, lines ~14–45.

**Code shown:**
```ts
type FilterDef = {
  key: string;
  defaultValue?: string;
  parse?: (raw: string | null) => string;
};

type SortOptionDef<S extends string> = {
  value: S;
  label: string;
};

export type BrowseConfig<T, S extends string> = {
  endpoint: string;
  errorMessage: string;
  pageSize?: number;
  sortOptions: SortOptionDef<S>[];
  defaultSortBy: S;
  defaultSortDir?: "asc" | "desc";
  filters?: FilterDef[];
  buildParams?: (filters: Record<string, string>) => Record<string, string>;
};
```

**Narration:**
> "Every shape in this hook — `FilterDef`, `SortOptionDef`, `BrowseConfig` — is a
> `type`, not an `interface`. And there's a concrete reason: several of them are
> generic — `SortOptionDef<S extends string>`, `BrowseConfig<T, S extends string>` —
> and a couple of them are unions of specific literals, like `"asc" | "desc"`.
> `interface` can express generics too, but unions of literal types are `type`'s
> territory. Once you're reaching for unions and generics together, `type` is the
> natural default, so this codebase just uses it consistently everywhere, even for
> the plain object shapes, for one less decision to make per file."

---

## Scene 2 — The one place `type` can't do the job (1:45–3:15)

**Visual:** Open `src/types/next-auth.d.ts`, full file (25 lines).

**Code shown:**
```ts
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      displayName: string;
      role: UserRole;
    };
  }

  interface User {
    displayName: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    displayName?: string;
    role?: UserRole;
    userId?: string;
  }
}
```

**Narration:**
> "`next-auth` ships its own `Session`, `User`, and `JWT` types — and by default,
> none of them know this app adds a `role` or a `displayName`. This file fixes
> that, but notice: it's `interface`, not `type`. That's not a style choice — it's
> required. Interfaces support declaration merging: two `interface Session`
> declarations with the same name, in the same module, get merged into one. `type`
> does not support this at all — attempt it, and TypeScript just tells you the name
> is already taken. This is the one job `interface` does that `type` structurally
> cannot."

**On-screen action:** Attempt to change one of these to `type Session = {...}` in a
scratch copy — show the compiler error about duplicate identifier / no merging.

---

## Scene 3 — Where this shows up downstream (3:15–4:15)

**Visual:** Quick look at any `auth()`/session-consuming code that reads
`session.user.role` and gets a typed `UserRole`, not `any`.

**Narration:**
> "Because that augmentation exists, everywhere in this app that reads
> `session.user.role`, TypeScript already knows it's a `UserRole` — one of exactly
> three values — not `any`, and not a plain `string` you have to re-validate. The
> augmentation happens once, in one file, and every consumer downstream benefits."

---

## Outro / CTA (4:15–4:45)

**Visual:** End card pointing to Episode 3.

**Narration:**
> "Next: what happens the moment data crosses a boundary you don't control — a
> request body, a caught error — and TypeScript can no longer just take your word
> for its shape."

---

## Production Notes

- **Screen recordings needed:** `src/hooks/use-browse-state.ts` (lines ~14–45),
  `src/types/next-auth.d.ts` (full file, 25 lines). Scene 2's "attempt to convert
  to `type`" moment should be a scratch copy of the file, not an edit to the real
  one — revert/discard after recording.
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
