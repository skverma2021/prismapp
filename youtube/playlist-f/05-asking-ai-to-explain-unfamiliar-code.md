# Playlist F · Episode 5 — "Asking AI to Explain Unfamiliar Code"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development
- **Case-study app:** PrismApp
- **Sub-arc:** Understanding and Proving the Code (1 of 2)
- **Target length:** 6–7 minutes
- **Primary goal:** Show the difference between code that needs no explanation
  and code that genuinely does — using two real, commented, non-obvious design
  choices already shipped in this app.
- **Title options:**
  1. Asking AI to Explain Unfamiliar Code
  2. The Comment That Tells You Someone Already Thought This Through
  3. When "Why Is It Written This Way?" Is the Right Question
- **Thumbnail concept:** A magnifying glass hovering over a single code
  comment line, everything else blurred out.
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Most code does not need explaining. Some code very much does.
>
> The giveaway is almost always the same. It is a comment that justifies a choice, not just describes what the next line does."

---

## Scene 1 — A choice that needs justifying (0:20–2:00)

**Visual:** Open `src/lib/url-query-state.ts`'s `pushQueryState` function.

**Code shown:**
```ts
// Next.js intercepts pushState and re-fires useSearchParams on every call.
// Use raw history.pushState so we control exactly when a navigation happens,
// and guard against re-pushing the same URL to avoid re-render loops.
export function pushQueryState(nextUrl: string) {
  const currentUrl = window.location.pathname + window.location.search;
  if (nextUrl === currentUrl) return;
  window.history.pushState(null, "", nextUrl);
}
```

**Narration:**
> "This is exactly the kind of code worth asking AI to explain. On its own, it looks almost wrong.
>
> Why call `window.history.pushState` directly instead of the Next.js router? The comment answers it.
>
> But imagine you delete the comment. A reasonable engineer who sees this code for the first time could 'fix' it by using `router.push()`.
>
> That change would quietly bring back the exact re-render loop this code was written to avoid."

---

## Scene 2 — What a good explanation actually does (2:00–3:30)

**Visual:** Side-by-side: a bad explanation ("this updates the URL") vs a good
one (traces the guard clause and names the failure mode it prevents).

**Narration:**
> "A shallow explanation just restates the code in English. For example: 'this checks if the URL changed and updates it if not.'
>
> A useful explanation names the failure mode. Without this guard clause, every keystroke or filter change could re-trigger `useSearchParams`.
>
> That re-runs the data-loading effect. The effect fetches again. And the fetch could re-trigger the very state change that caused it.
>
> Asking 'what breaks without this line' is a sharper question than asking 'what does this line do.'"

---

## Scene 3 — A second real example: justified in-memory state (3:30–5:00)

**Visual:** Open `proxy.ts`, the rate-limiting comment block.

**Code shown:**
```ts
// In-memory Map is acceptable for a single-region internal deployment.
// A new function instance resets state — sufficient to deter automated
// scripts without requiring an external dependency.
```

**Narration:**
> "It is the same pattern in a different file.
>
> On its own, an in-memory rate limiter looks like a bug waiting to happen. Surely it should be Redis?
>
> The comment tells you this was a deliberate, scoped decision. It is a single-region, internal app. It is a good-enough deterrent, not a guarantee.
>
> The value of asking AI to explain this is not just 'what does a Map do here.' It is confirming whether the *justification* still holds.
>
> If this app ever became multi-region, this comment is exactly the sentence that should trigger a redesign."

---

## Scene 4 — The habit worth building (5:00–6:00)

**Visual:** Talking head.

**Narration:**
> "This episode is really about one habit.
>
> When you find a comment that justifies a choice, instead of describing one, slow down. Ask what breaks without it. And ask whether the reason it was written still applies today.
>
> That question is useful in many situations. You can ask it about your own old code. You can ask it about a teammate's code. Or you can ask it about code that an AI assistant just generated for you."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card, next-episode pointer.

**Narration:**
> "Understanding code is only half of the work.
>
> The other half is proving that it works. That uses tests, and AI can help you debug when it does not work.
>
> That is next."

---

## Production Notes

- **Screen recordings needed:** `src/lib/url-query-state.ts`'s `pushQueryState`
  function (full, with comment); `proxy.ts`'s rate-limiting comment block.
- **Source material:** files above, already cited with verified line context
  in Playlist E's episodes 6 and 8 — reused here for a different teaching
  purpose (explanation-seeking, not framework mechanics).
- **B-roll:** none required.
