# Playlist C · Episode 6 — "Utility Types: Record, keyof typeof, and Friends"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Shape of Data (2 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show utility types as a way to derive a new type from a type or
  value that already exists, instead of writing (and maintaining) two versions by
  hand — using real `Record` and `keyof typeof` usage, and one honest example of
  where this app writes a derived shape by hand instead.
- **Title options:**
  1. Utility Types: Record, keyof typeof, and Friends
  2. Stop Writing the Same Shape Twice
  3. Deriving Types Instead of Duplicating Them
- **Thumbnail concept:** An object `{ POSTED, PENDING, REJECTED }` with an arrow
  pointing to a type `"POSTED" | "PENDING" | "REJECTED"`, labeled "derived, not
  duplicated."
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A lot of TypeScript's built-in utility types exist to answer one question: I
> already have a type or a value — can I get a new type out of it instead of
> writing it again by hand? Today, two real examples from this app: `Record`, and
> deriving a union from an object's own keys."

---

## Scene 1 — `Record`: a dynamic map, still typed (0:20–1:45)

**Visual:** Open `src/modules/app-users/app-users.service.ts`, ~line 30
(`const where: Record<string, unknown> = {}`), and
`src/hooks/use-browse-state.ts` (`filters: Record<string, string>`).

**Code shown:**
```ts
const where: Record<string, unknown> = {};
if (q) {
  where.OR = [/* ... */];
}
if (role) {
  where.role = role;
}
```

**Narration:**
> "`where` starts as an empty object, and fields get added conditionally — you
> can't know its exact keys ahead of time. `Record<string, unknown>` types it as
> 'an object with string keys, values of unknown shape' — flexible enough for that,
> while still being an object, not `any`. You still can't call `.toUpperCase()` on
> a value without narrowing it first. Same pattern in the browse hook's `filters:
> Record<string, string>` — an arbitrary set of filter keys, every value
> guaranteed to be a `string`."

---

## Scene 2 — Deriving a union from an object's own keys (1:45–3:15)

**Visual:** Open `src/modules/contributions/contributions.service.ts`,
~lines 29–34.

**Code shown:**
```ts
export const CORRECTION_STATUS = {
  POSTED: "POSTED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
} as const;

export type CorrectionStatus = (typeof CORRECTION_STATUS)[keyof typeof CORRECTION_STATUS];
```

**Narration:**
> "This is worth slowing down on, because it reads backwards the first time you see
> it. `typeof CORRECTION_STATUS` is the *type* of that object — three properties,
> each with a literal string value, thanks to `as const`. `keyof` on that gives you
> the union of its property names: `"POSTED" | "PENDING" | "REJECTED"`. Indexing
> back into the object type with that union gives you the union of its *values* —
> which, because of `as const`, happen to be the exact same three strings. The
> result: a type derived entirely from one object literal. Add a fourth status to
> the object, and the type gains it automatically — no second list to remember to
> update."

---

## Scene 3 — Where a utility type *could* apply, but doesn't here (3:15–4:15)

**Visual:** Open `src/modules/app-users/app-users.schemas.ts`, `CreateAppUserInput`
and `UpdateAppUserInput` side by side.

**Code shown:**
```ts
export type CreateAppUserInput = {
  individualId: string;
  password: string;
  role: string;
};

export type UpdateAppUserInput = {
  role?: string;
  isActive?: boolean;
  password?: string;
};
```

**Narration:**
> "If `UpdateAppUserInput` were exactly `CreateAppUserInput` with every field made
> optional, `Partial<CreateAppUserInput>` would be the right tool — one line, fully
> derived. But it isn't a match here: update drops `individualId` entirely and adds
> `isActive`, which create never had. So this app writes it out by hand instead.
> That's the actual judgment call with utility types: use them when one shape is
> truly a transformation of another; write it by hand the moment they diverge, so
> you're not fighting the type system to bend `Partial<T>` into a shape it was
> never meant to describe."

---

## Outro / CTA (4:15–4:45)

**Visual:** End card pointing to Episode 7.

**Narration:**
> "Next: every mutation in this app is `async`, and every one of them has to type
> what a database call, and a failure, actually look like. Let's follow one all the
> way through."

---

## Production Notes

- **Screen recordings needed:** `src/modules/app-users/app-users.service.ts`
  (~line 30), `src/hooks/use-browse-state.ts` (`filters: Record<string, string>`),
  `src/modules/contributions/contributions.service.ts` (~lines 29–34),
  `src/modules/app-users/app-users.schemas.ts` (`CreateAppUserInput` /
  `UpdateAppUserInput`).
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
