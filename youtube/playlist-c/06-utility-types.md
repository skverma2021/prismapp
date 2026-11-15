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
> "Many of TypeScript's built-in utility types answer one question.
>
> I already have a type or a value. Can I get a new type from it, instead of writing it again by hand?
>
> Today you will see two real examples from this app. The first is `Record`. The second is deriving a union from an object's own keys."

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
> "`where` starts as an empty object. Fields are added conditionally, so you cannot know its exact keys ahead of time.
>
> `Record<string, unknown>` types it as 'an object with string keys and values of unknown shape'. That is flexible enough for this job. It is still an object, not `any`.
>
> You still cannot call `.toUpperCase()` on a value without narrowing it first.
>
> The browse hook uses the same pattern in `filters: Record<string, string>`. It holds an arbitrary set of filter keys. Every value is guaranteed to be a `string`."

---

## Scene 2 — Deriving a union from an object's own keys (1:45–3:15)

**Visual:** Open `src/modules/contributions/contributions.service.ts`,
~lines 33–37.

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
> "This is worth slowing down on, because it feels backwards the first time you see it.
>
> `typeof CORRECTION_STATUS` is the *type* of that object. It has three properties. Each has a literal string value, thanks to `as const`.
>
> `keyof` on that gives you the union of its property names: `"POSTED" | "PENDING" | "REJECTED"`.
>
> Now index back into the object type with that union. You get the union of its *values*. Because of `as const`, they are the exact same three strings.
>
> The result is a type derived entirely from one object literal.
>
> Add a fourth status to the object, and the type gains it automatically. There is no second list to remember to update."

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
> "Suppose `UpdateAppUserInput` were exactly `CreateAppUserInput` with every field made optional. Then `Partial<CreateAppUserInput>` would be the right tool. It is one line, fully derived.
>
> But it is not a match here. Update drops `individualId` entirely. It also adds `isActive`, which create never had.
>
> So this app writes it out by hand.
>
> That is the real judgment call with utility types. Use them when one shape is truly a transformation of another. Write the type by hand when the shapes diverge. Then you are not forcing `Partial<T>` into a shape it was never meant to describe."

---

## Outro / CTA (4:15–4:45)

**Visual:** End card pointing to Episode 7.

**Narration:**
> "Next: every mutation in this app is `async`.
>
> Every one of them must type what a database call looks like, and what a failure looks like.
>
> Let us follow one all the way through."

---

## Production Notes

- **Screen recordings needed:** `src/modules/app-users/app-users.service.ts`
  (~line 30), `src/hooks/use-browse-state.ts` (`filters: Record<string, string>`),
  `src/modules/contributions/contributions.service.ts` (~lines 33–37),
  `src/modules/app-users/app-users.schemas.ts` (`CreateAppUserInput` /
  `UpdateAppUserInput`).
- **Source material:** the files above, read directly from the running codebase.
- **B-roll:** none required.
