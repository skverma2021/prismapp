# Playlist C · Episode 1 — "Domain Types and Literal Unions"

## Video Metadata

- **Playlist:** C — TypeScript Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Foundations (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show why a handful of allowed string values should be a type,
  not a comment, using PrismApp's actual role and status fields.
- **Title options:**
  1. Domain Types and Literal Unions
  2. Stop Typing Roles as `string`
  3. The TypeScript Feature That Catches Typos Before They Ship
- **Thumbnail concept:** Split screen — left: `role: string` with a red squiggle
  under a misspelled `"SOCEITY_ADMIN"`. Right: `role: UserRole` with the same typo
  underlined red by the editor itself.
- **Teaching principle:** Syntax → Context → Use Case.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head, code editor visible behind.

**Narration:**
> "Every real app has fields that can only ever be one of a handful of values — a
> role, a status, a category. If you type those as `string`, TypeScript will happily
> let you misspell one and find out in production. There's a better way, and it
> costs you nothing. Let's look at where PrismApp actually uses it."

---

## Scene 1 — The naive version, and why it breaks (0:20–1:15)

**Visual:** Code editor, a hypothetical `function checkRole(role: string)`. Type
`"SOCEITY_ADMIN"` (typo) into a call site — no error, no red squiggle.

**Narration:**
> "If a role is just `string`, this compiles fine. Nothing catches the typo. The bug
> ships, and you find out when an admin can't access their own admin page. The type
> `string` is technically correct and practically useless here — it describes
> 'any text,' when what we actually mean is 'one of exactly three values.'"

---

## Scene 2 — The real fix: a literal union (1:15–2:30)

**Visual:** Open `src/lib/user-role.ts` at line 1.

**Code shown:**
```ts
export type UserRole = "SOCIETY_ADMIN" | "MANAGER" | "READ_ONLY";
```

**Narration:**
> "This is the whole fix. `UserRole` isn't `string` — it's exactly one of these
> three literal strings, and nothing else. Type the same typo now, anywhere `UserRole`
> is expected, and the editor flags it immediately, before you ever run the app.
> This is called a literal union type — a type built out of specific values instead
> of a general shape."

**On-screen action:** Retype `"SOCEITY_ADMIN"` where a `UserRole` is expected (e.g.
a mock call site) — show the red squiggle and the exact compiler error.

---

## Scene 3 — The same pattern, twice more, for statuses (2:30–3:45)

**Visual:** Open `src/modules/complaints/complaints.schemas.ts` around lines 7–16,
then `src/modules/bookings/bookings.schemas.ts` lines 1–2.

**Code shown:**
```ts
export const COMPLAINT_STATUSES = [
  "Open",
  "Assigned",
  "InProgress",
  "Resolved",
  "Closed",
  "Reopened",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
```
```ts
export const BOOKING_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
```

**Narration:**
> "Same idea, slightly different technique. Instead of writing the union by hand,
> PrismApp declares the allowed values once, as a `const` array, then derives the
> type from it with `(typeof ARRAY)[number]`. Now the array of strings — the thing
> your UI loops over to render a dropdown — and the type the compiler checks are
> always in sync. Change the array, the type updates itself. One source of truth,
> not two lists that can quietly drift apart."

---

## Scene 4 — Where this actually pays off (3:45–4:45)

**Visual:** Open `src/lib/authz.ts`, the `getAuthContext` function (around line
58–75), highlighting `parseUserRole(roleValue)`.

**Narration:**
> "Here's the payoff. Every protected route in this app calls something that
> returns a `UserRole`, not a `string`. Every `if (role === "MANAGER")` check downstream
> is comparing against one of exactly three known values — the compiler will tell
> you if you typo it, and your editor will autocomplete the options for you. That's
> the whole value of a domain type: it turns a class of bugs into something that
> simply can't compile."

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 2.

**Narration:**
> "Next time: PrismApp writes almost all of its shapes as `type`, not `interface` —
> except in exactly one place, where it has no choice. We'll look at why, next."

---

## Production Notes

- **Screen recordings needed:** `src/lib/user-role.ts` (line 1),
  `src/modules/complaints/complaints.schemas.ts` (lines 7–19),
  `src/modules/bookings/bookings.schemas.ts` (lines 1–2), `src/lib/authz.ts`
  (`getAuthContext`, ~lines 58–75). The "naive string" and "retyped typo" moments
  in Scenes 1 and 2 can be a scratch file/playground, not real repo code.
- **Source material:** the files above, read directly from the running codebase —
  no invented examples.
- **B-roll:** none required.
