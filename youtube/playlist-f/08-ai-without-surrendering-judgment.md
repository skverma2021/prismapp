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
> "In this playlist, we watched AI explore requirements and draft specs. We watched it generate a candidate design. We watched it get reviewed and corrected. And we asked it to explain code and write tests.
>
> This last episode is about the rules that made all of that safe to do.
>
> Those rules are written down in this project's own operating document. They were not improvised as we went."

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
> "Notice what kind of rules these are.
>
> They are not 'always ask AI before coding.' They are constraints on the *outcome*, no matter who or what produces the code.
>
> Look at rule 5 especially. An AI assistant could generate perfectly clean, idiomatic code that quietly bypasses a domain rule. It would not know that rule exists unless it is told to check.
>
> Writing the rule down, where both people and AI can read it, closes that gap."

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
> "This is essentially the whole playlist, compressed into six lines.
>
> Read the spec. Read the framework's own rules. Propose the smallest change. Test it. Verify it.
>
> And then say out loud what you assumed and what is still unfinished. This is the step that is easy to skip.
>
> That last step is where engineering judgment actually shows up. A human has to decide whether the assumptions of an AI-assisted change are acceptable. It is not enough that the code runs."

---

## Scene 3 — Where the six playlists actually met (3:45–5:15)

**Visual:** A simple recap graphic: A → B → C/D/E → F, each arrow labeled with
one word ("what," "how," "with what," "how responsibly").

**Narration:**
> "Let us zoom out. This playlist connects to everything before it.
>
> Playlist A showed the real application. Playlist B showed how it was engineered. C, D, and E showed the specific technologies that the engineering was built with.
>
> And this playlist showed something a little different. It is not another technology. It is a way of working.
>
> It is the discipline that made it safe to move quickly through all the others. And it did this without quietly breaking something that a domain rule depended on."

---

## Scene 4 — The actual closing point (5:15–6:30)

**Visual:** Talking head.

**Narration:**
> "AI made almost every episode in this channel faster to research and write.
>
> It did not decide which security gap was acceptable to leave open. It did not decide which correction workflow this app should use today. And it did not decide which rejected design belonged in a permanent record, so nobody proposes it again.
>
> Those decisions came from people. They used AI to see the options clearly. AI did not decide on its own.
>
> That division of labor is the actual subject of this playlist. And it is the same division that this whole channel has shown, across six playlists."

---

## Outro / CTA (6:30–7:00)

**Visual:** End card — channel identity card, subscribe animation.

**Narration:**
> "That closes the channel's first full arc. Playlists A through F, all grounded in one real application.
>
> If a second application joins this channel, every one of these playlists keeps growing with it.
>
> It will use exactly this same method."

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
