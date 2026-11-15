# Playlist F · Episode 8 — "AI Without Surrendering Engineering Judgment"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development
- **Case-study app:** PrismApp
- **Sub-arc:** Judgment: What AI Doesn't Get to Decide (2 of 2)
- **Target length:** 7–8 minutes
- **Primary goal:** Close the playlist — and the channel's initial six-playlist
  arc — by naming the concrete rules this real project uses to keep AI a
  partner in engineering rather than a replacement for it.
- **Title options:**
  1. AI Without Surrendering Engineering Judgment
  2. The Rules That Keep AI a Partner, Not a Replacement
  3. What Six Playlists of Real Code Actually Taught Us About AI
- **Thumbnail concept:** A steering wheel with a hand clearly still on it,
  an "AI" label on the dashboard beside the hand, not instead of it.
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "We've spent this playlist watching AI explore requirements, draft specs,
   generate a candidate design, get reviewed and corrected, and get asked to
   explain code and write tests. This last episode is about the rules that
   made all of that safe to do — the ones written down in this project's own
   operating document, not improvised as we went."

---

## Scene 1 — Rules that don't bend (0:25–2:00)

**Visual:** Open `AGENTS.md` section 2, "Non-Negotiable AI Rules."

**Code shown:**
```markdown
## 2) Non-Negotiable AI Rules
1. This project uses modern Next.js. Do not assume old patterns.
2. Before changing framework-sensitive code, read relevant local docs in
   node_modules/next/dist/docs/.
3. Prefer App Router, Server Components, Route Handlers, and Server Actions
   where appropriate.
4. Keep business rules server-side and deterministic.
5. Never bypass domain constraints defined in
   vault/01-Domain/Domain-Rules.md.
6. Keep the implementation simple: no speculative abstractions, no premature
   microservices.
```

**Narration:**
> "Notice what kind of rules these actually are. They're not 'always ask AI
   before coding' — they're constraints on the *outcome*, regardless of who or
   what produces the code. Rule 5 especially: an AI assistant could generate
   perfectly clean, perfectly idiomatic code that quietly bypasses a domain
   rule, because it doesn't know that rule exists unless it's told to check.
   Writing the rule down where both people and AI can read it is what closes
   that gap."

---

## Scene 2 — The seven-step process, end to end (2:00–3:45)

**Visual:** Open `AGENTS.md` section 8, "Coding Process for AI Agents."

**Code shown:**
```markdown
## 8) Coding Process for AI Agents
For every task:
1. Read relevant vault/* documents.
2. Read relevant Next.js local docs in node_modules/next/dist/docs/.
3. Propose smallest change that satisfies the requirement.
4. Implement with tests where feasible.
5. Run lint and build.
6. Summarize what changed, what assumptions were made, and what remains.
```

**Narration:**
> "This is essentially the whole playlist, compressed into six lines: read the
   spec, read the framework's own rules, propose the smallest change, test it,
   verify it, and then — this is the step that's easy to skip — say out loud
   what you assumed and what's still unfinished. That last step is where
   engineering judgment actually shows up. It's the moment where a human has
   to decide whether the assumptions an AI-assisted change made are
   acceptable, not just whether the code runs."

---

## Scene 3 — Where the six playlists actually met (3:45–5:15)

**Visual:** A simple recap graphic: A → B → C/D/E → F, each arrow labeled with
one word ("what," "how," "with what," "how responsibly").

**Narration:**
> "Zoom out, and this playlist connects to everything before it. Playlist A
   showed the real application. Playlist B showed how it was engineered.
   C, D, and E showed the specific technologies that engineering was built
   with. And this playlist showed something a little different: not another
   technology, but a way of working — the discipline that made it safe to move
   quickly through all the others without quietly breaking something a domain
   rule depended on."

---

## Scene 4 — The actual closing point (5:15–6:30)

**Visual:** Talking head.

**Narration:**
> "AI made almost every episode in this channel faster to research and write.
   It did not decide which security gap was acceptable to leave open, which
   correction workflow this app should use today, or which rejected design
   belonged in a permanent record so nobody proposes it again. Those calls
   came from people, using AI to see the options clearly — not from AI
   deciding on its own. That division of labor is the actual subject of this
   playlist, and it's the same division this whole channel has been an
   example of, six playlists in."

---

## Outro / CTA (6:30–7:00)

**Visual:** End card — channel identity card, subscribe animation.

**Narration:**
> "That closes the channel's first full arc — A through F, all grounded in one
   real application. If a second application joins this channel, every one of
   these playlists keeps growing with it, using exactly this same method."

---

## Production Notes

- **Screen recordings needed:** `AGENTS.md` section 2 (Non-Negotiable AI
  Rules) and section 8 (Coding Process for AI Agents), full text.
- **Source material:** file above, read directly from the repository.
- **B-roll:** brief recap montage of thumbnails/title cards from Playlists
  A1, B, C, D, E (reuse existing production stills once available).
- **Series note:** this closes the initial 8-episode run of Playlist F. All
  11 blueprint Playlist F topics are covered across the 8 episodes (some
  paired per episode: architecture discussions folded into F2, hallucination-
  catching folded into F4, debugging folded into F6), grounded entirely in
  this project's own real ADRs, `AGENTS.md`, security review, and test
  scripts — no invented "AI conversation" examples were used.
