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
> "Most code doesn't need explaining. Some code very much does — and the
   giveaway is almost always the same thing: a comment that's justifying a
   choice, not just describing what the next line does."

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
> "This is exactly the kind of code worth asking AI to explain, because on its
   own it looks almost wrong. Why call `window.history.pushState` directly
   instead of the Next.js router? The comment answers it — but if you deleted
   the comment, a reasonable engineer looking at this for the first time could
   easily 'fix' it by swapping in `router.push()`, and quietly reintroduce the
   exact re-render loop this code was written to avoid."

---

## Scene 2 — What a good explanation actually does (2:00–3:30)

**Visual:** Side-by-side: a bad explanation ("this updates the URL") vs a good
one (traces the guard clause and names the failure mode it prevents).

**Narration:**
> "A shallow explanation just restates the code in English — 'this checks if
   the URL changed and updates it if not.' A useful explanation names the
   failure mode: if this guard clause weren't here, every keystroke or filter
   change could re-trigger `useSearchParams`, which re-runs the data-loading
   effect, which fetches again, which could re-trigger the very state change
   that caused the fetch. Asking 'what breaks without this line' is a sharper
   question than asking 'what does this line do.'"

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
> "Same pattern, different file. On its own, an in-memory rate limiter looks
   like a bug waiting to happen — surely it should be Redis? The comment tells
   you this was a deliberate, scoped decision: single-region, internal app,
   good-enough deterrent, not a guarantee. The value of asking AI to explain
   this isn't just 'what does a Map do here' — it's confirming whether the
   *justification* still holds. If this app ever became multi-region, this
   comment is exactly the sentence that should trigger a redesign."

---

## Scene 4 — The habit worth building (5:00–6:00)

**Visual:** Talking head.

**Narration:**
> "The habit this episode is really about: when you find a comment justifying
   a choice instead of describing one, that's a flag to slow down — ask what
   breaks without it, and ask whether the reason it was written still applies
   today. That question is just as useful whether you're reading your own old
   code, a teammate's code, or code an AI assistant just generated for you."

---

## Outro / CTA (6:00–6:30)

**Visual:** End card, next-episode pointer.

**Narration:**
> "Understanding code is half the battle. Proving it actually works — with
   tests, and with AI helping you debug when it doesn't — is next."

---

## Production Notes

- **Screen recordings needed:** `src/lib/url-query-state.ts`'s `pushQueryState`
  function (full, with comment); `proxy.ts`'s rate-limiting comment block.
- **Source material:** files above, already cited with verified line context
  in Playlist E's episodes 6 and 8 — reused here for a different teaching
  purpose (explanation-seeking, not framework mechanics).
- **B-roll:** none required.
