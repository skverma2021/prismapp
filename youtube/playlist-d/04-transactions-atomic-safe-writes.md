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
  3. Why This App Picks `Serializable` for Overlap and Duplicate Checks
- **Thumbnail concept:** Two overlapping clocks labeled "Request A" and "Request B,"
  both reading the same row at the same instant, with a padlock icon between them
  labeled `$transaction`.
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "The overlap check from Episode 3 reads existing ownership rows. It decides they are fine. Then it writes a new one.
>
> But what if two requests do that at almost the same instant?
> Both read 'no overlap' before either has written anything. Both proceed.
>
> Now you have two owners for the same day.
>
> This episode is about closing that gap."

---

## Scene 1 — The race condition, made concrete (0:25–1:30)

**Visual:** Simple two-column timeline diagram — Request A and Request B, both
reading the ownership table at the same millisecond, both seeing "no conflict,"
both writing.

**Narration:**
> "This is not theoretical.
> It is the normal failure mode of any 'check, then write' logic that is not wrapped in something atomic.
>
> There are two separate database round-trips, a read and then a write.
> Nothing stops a second process from slipping in between them.
>
> The fix is not smarter application code.
> The fix is to tell Postgres to treat the whole check-and-write sequence as one indivisible unit."

---

## Scene 2 — `$transaction` with an explicit isolation level (1:30–3:00)

**Visual:** Open `src/modules/ownerships/ownerships.service.ts`, `createOwnership`,
~lines 256–277, then `runSerializable` at the bottom of `src/lib/db.ts`.

**Code shown:**
```ts
export async function createOwnership(input: CreateOwnershipInput, actor: AuthContext) {
  const result = await runSerializable(
    async (tx) => {
      const unit = await ensureOwnershipReferencesExist(tx, input.unitId, input.indId);
      ensureNotBeforeUnitInception(unit.inceptionDt, input.fromDt, "Ownership start date");
      await ensureNoOwnershipOverlap(tx, input.unitId, input.fromDt, input.toDt ?? null);
      await ensureOwnershipContinuity(tx, input.unitId, unit.inceptionDt, {
        fromDt: input.fromDt,
        toDt: input.toDt ?? null,
      });

      return tx.unitOwner.create({ data: { /* ... */ } });
    }
  );
  return result;
}

// src/lib/db.ts
export function runSerializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return retryOnSerializationConflict(() =>
    db.$transaction(work, { isolationLevel: "Serializable" })
  );
}
```

**Narration:**
> "Every check from Episode 3 runs against the same `tx` handle.
> That includes the reference checks, the overlap check, and the continuity check. The final `create` runs there too.
> All of it happens inside one transaction.
>
> If anything inside throws, Postgres rolls back the whole thing.
> Every one of those helper functions throws an `HttpError` on failure.
> So there is never a partial write.
>
> But here is the subtle part. Being inside a transaction is not enough.
>
> At Postgres's default level, called read committed, two requests can each read 'no overlap'. Then each can write.
> I tested exactly that against the real database.
> Two simultaneous check-then-insert transactions ran, and both succeeded. That gave two rows.
>
> At the `Serializable` level, Postgres notices that the two transactions depend on each other's reads.
> It lets one commit, and it aborts the other.
>
> Our small `runSerializable` helper catches that abort and simply runs the unit of work again.
> This time the check sees the first row. It rejects the second request with the normal conflict error.
>
> There is one winner, and one clean rejection. And there is no duplicate."

---

## Scene 3 — The same shape, protecting money instead of dates (3:00–4:30)

**Visual:** Open `src/modules/contributions/contributions.service.ts`,
`ensureNoDuplicateContribution` (~lines 136–171) and the surrounding
`createContribution` transaction (~lines 419+).

**Narration:**
> "The identical pattern protects contributions.
>
> `ensureNoDuplicateContribution` reads the existing `ContributionDetail` rows for this unit, head, and period.
> It counts only original payments and approved corrections.
> It adds up their signed amounts. And it refuses to proceed if the net is still positive.
>
> So you cannot pay the same maintenance head for the same unit and period twice.
> But a period that an approved correction has fully offset can be billed again.
>
> That check, the rate lookup, and the final `contribution.create` all run inside one `db.$transaction` callback in `createContribution`.
> The reason is the same as for ownership.
> Reading 'has this already been paid?' and writing 'record this payment' must be one atomic, serializable operation.
> Otherwise, two near-simultaneous payment submissions could both slip through.
>
> With it, the second one is retried, sees the first payment, and is rejected as a duplicate."

---

## Scene 4 — Two shapes of `$transaction` (4:30–5:30)

**Visual:** Side-by-side: the callback form (`db.$transaction(async (tx) => {...})`)
versus the array form used elsewhere for reads
(`const [items, totalItems] = await db.$transaction([...])`).

**Narration:**
> "Prisma gives you two forms of `$transaction`.
>
> The callback form is what we just saw.
> It is for when later steps depend on earlier results. One example is using a looked-up rate to compute an amount.
>
> The array form batches independent queries. One example is a page of results plus its total count.
> They execute against one consistent database snapshot. No query's result depends on another.
>
> It is the same guarantee, atomicity, applied to two different problems.
> Safe writes, and consistent reads."

---

## Outro / CTA (5:30–6:00)

**Visual:** End card pointing to Episode 5.

**Narration:**
> "We have been reading where-clauses that filter by unit, by date range, and by head.
> Every one of those filters exists because an index backs it.
>
> Next episode, we see how the indexes from Episode 2 actually become useful."

---

## Production Notes

- **Screen recordings needed:** `src/modules/ownerships/ownerships.service.ts`
  (`createOwnership`, ~lines 256–277), `runSerializable` at the bottom of
  `src/lib/db.ts`, `src/modules/contributions/contributions.service.ts`
  (`ensureNoDuplicateContribution`, ~lines 136–171, and the `createContribution`
  transaction, ~lines 419+), a quick side-by-side of the array-form `$transaction`
  in `contributions.service.ts` line 232.
- **Optional live demo for Scene 2:** run the concurrent checks at the end of
  `scripts/test-contributions-api.mjs` (two simultaneous payments for the same
  unit, head and period: one 201, one 409). The server log shows the conflict
  that was retried ("Transaction failed due to a write conflict or a deadlock").
- **Source material:** the files above, read directly from the repository, and
  `vault/00-Core/ADR-005-Serializable-Isolation-for-Overlap-and-Duplicate-Writes.md`.
- **B-roll:** the race-condition diagram in Scene 1 should be a simple animated
  slide (two parallel timelines), not real footage.
