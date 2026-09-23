# Playlist D · Episode 4 — "Transactions: Making Multi-Step Writes Atomic and Safe"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Handling Change Over Time (2 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show why "check, then write" needs a real database transaction
  with an explicit isolation level, using ownership-overlap prevention and
  duplicate-payment prevention as the two real examples.
- **Title options:**
  1. Transactions: Making Multi-Step Writes Atomic and Safe
  2. The Gap Between "Check" and "Write" Is Where Bugs Live
  3. Why This App Picks `ReadCommitted` on Purpose
- **Thumbnail concept:** Two overlapping clocks labeled "Request A" and "Request B,"
  both reading the same row at the same instant, with a padlock icon between them
  labeled `$transaction`.
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "Episode 3's overlap check reads existing ownership rows, decides they're fine,
> and then writes a new one. But what if two requests do that at almost the same
> instant? Both read 'no overlap' before either has written anything. Both proceed.
> Now you have two owners for the same day. This episode is about closing that
> gap."

---

## Scene 1 — The race condition, made concrete (0:25–1:30)

**Visual:** Simple two-column timeline diagram — Request A and Request B, both
reading the ownership table at the same millisecond, both seeing "no conflict,"
both writing.

**Narration:**
> "This isn't theoretical — it's the normal failure mode of any 'check, then write'
> logic that isn't wrapped in something atomic. Two separate database round-trips,
> read then write, with nothing stopping a second process from slipping in between
> them. The fix isn't smarter application code — it's telling Postgres to treat the
> whole check-and-write sequence as one indivisible unit."

---

## Scene 2 — `$transaction` with an explicit isolation level (1:30–3:00)

**Visual:** Open `src/modules/ownerships/ownerships.service.ts`, `createOwnership`,
~lines 257–280.

**Code shown:**
```ts
export async function createOwnership(input: CreateOwnershipInput, actor: AuthContext) {
  const result = await db.$transaction(
    async (tx) => {
      const unit = await ensureOwnershipReferencesExist(tx, input.unitId, input.indId);
      ensureNotBeforeUnitInception(unit.inceptionDt, input.fromDt, "Ownership start date");
      await ensureNoOwnershipOverlap(tx, input.unitId, input.fromDt, input.toDt ?? null);
      await ensureOwnershipContinuity(tx, input.unitId, unit.inceptionDt, {
        fromDt: input.fromDt,
        toDt: input.toDt ?? null,
      });

      return tx.unitOwner.create({ data: { /* ... */ } });
    },
    { isolationLevel: "ReadCommitted" }
  );
  return result;
}
```

**Narration:**
> "Every check from Episode 3 — reference checks, the overlap check, the
> continuity check — and the final `create`, all run against the same `tx` handle,
> inside one `db.$transaction` callback. If anything inside throws — and every one
> of those helper functions throws an `HttpError` on failure — Postgres rolls back
> the whole thing. No partial write, ever. And notice the second argument:
> `{ isolationLevel: "ReadCommitted" }` is explicit, not left at whatever Prisma's
> default happens to be. That's a deliberate choice about exactly how much a
> concurrent transaction is allowed to see."

---

## Scene 3 — The same shape, protecting money instead of dates (3:00–4:30)

**Visual:** Open `src/modules/contributions/contributions.service.ts`,
`ensureNoDuplicateContribution` (~lines 132–160) and the surrounding
`createContribution` transaction (~lines 413+).

**Narration:**
> "The identical pattern protects contributions. `ensureNoDuplicateContribution`
> reads every existing `ContributionDetail` row for this unit, head, and period,
> and refuses to proceed if any of them already carries a positive amount — you
> can't pay the same maintenance head for the same unit and period twice. That
> check, the rate lookup, and the final `contribution.create` all run inside one
> `db.$transaction` callback in `createContribution`, for the exact same reason as
> ownership: reading 'has this already been paid?' and writing 'record this
> payment' have to be one atomic operation, or two near-simultaneous payment
> submissions could both slip through."

---

## Scene 4 — Two shapes of `$transaction` (4:30–5:30)

**Visual:** Side-by-side: the callback form (`db.$transaction(async (tx) => {...})`)
versus the array form used elsewhere for reads
(`const [items, totalItems] = await db.$transaction([...])`).

**Narration:**
> "Prisma actually gives you two forms of `$transaction`. The callback form — what
> we just saw — is for when later steps depend on earlier results, like using a
> looked-up rate to compute an amount. The array form batches independent
> queries — a page of results plus its total count, say — so they execute against
> one consistent database snapshot without one query's result depending on
> another's. Same guarantee, atomicity, applied to two different problems: safe
> writes, and consistent reads."

---

## Outro / CTA (5:30–6:00)

**Visual:** End card pointing to Episode 5.

**Narration:**
> "We've been reading these where-clauses filter by unit, by date range, by head —
> and every one of those filters exists because an index backs it. Next episode:
> how the indexes from Episode 2 actually earn their keep."

---

## Production Notes

- **Screen recordings needed:** `src/modules/ownerships/ownerships.service.ts`
  (`createOwnership`, ~lines 257–280), `src/modules/contributions/contributions.service.ts`
  (`ensureNoDuplicateContribution`, ~lines 132–160, and the `createContribution`
  transaction, ~lines 413+), a quick side-by-side of the array-form `$transaction`
  in `contributions.service.ts` line 227.
- **Source material:** the files above, read directly from the repository.
- **B-roll:** the race-condition diagram in Scene 1 should be a simple animated
  slide (two parallel timelines), not real footage.
