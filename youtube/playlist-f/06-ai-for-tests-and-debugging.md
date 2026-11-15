# Playlist F · Episode 6 — "AI for Tests, and Debugging with AI"

## Video Metadata

- **Playlist:** F — AI-Augmented Software Development
- **Case-study app:** PrismApp
- **Sub-arc:** Understanding and Proving the Code (2 of 2)
- **Target length:** 7–9 minutes
- **Primary goal:** Show a real integration test script asserting on real
  authorization and business rules, and connect it to this project's own
  definition of "done" — quality gates that any AI-assisted change must pass.
- **Title options:**
  1. AI for Tests, and Debugging with AI
  2. The Script That Proves the Rule, Not Just the Code
  3. What "It Works" Has to Mean Before You Believe It
- **Thumbnail concept:** A terminal window with a green "PASS" and a red "FAIL"
  side by side, one clearly winning.
- **Teaching principle:** Requirement → Domain Rule → Specification → Data Model
  → AI-assisted Implementation → Human Review → Tests → Verification.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "AI-assisted implementation is fast. That speed is only valuable if you can prove, afterward, that what got built does what it should.
>
> This episode is about a real test script that does exactly that."

---

## Scene 1 — A test that asserts on a business rule, not just a status code (0:20–2:15)

**Visual:** Open `scripts/test-contribution-rates-api.mjs`, the unauthorized
check.

**Code shown:**
```js
const authHeaders = await createSessionHeaders(BASE_URL, "manager@prismapp.local");
const readOnlyHeaders = await createSessionHeaders(BASE_URL, "readonly@prismapp.local");

const unauthorized = await requestJson("POST", "/api/contribution-rates", {
  contributionHeadId,
  fromDt: "2099-01-01",
  toDt: "2099-01-31",
  amt: 10.5,
});
```

**Narration:**
> "This script signs in as two different real roles. A manager, and a read-only user. Then it tries the same mutation as each one.
>
> That is the point. A test worth writing does not only check 'did the API respond.' It checks the actual rule from the specification. Read-only users cannot create contribution rates. No exceptions.
>
> Generating a test like this only works if you already know which rule you are proving.
>
> That is what makes this a specification-driven test, not a status-code test."

---

## Scene 2 — Where AI genuinely helps here (2:15–3:30)

**Visual:** Highlight the `assertStatus` helper.

**Code shown:**
```js
function assertStatus(result, expectedStatus, message) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `${message}. status=${result.response.status}, payload=${JSON.stringify(result.payload)}`
  );
}
```

**Narration:**
> "Some work is tedious scaffolding. A fetch wrapper. An assertion helper that prints a useful message on failure. A handful of repetitive request and assert pairs for every role and every edge case.
>
> This is exactly the kind of work AI is genuinely fast at.
>
> The part that still needs a human is deciding *which* role and edge-case combinations matter. That decision comes straight from the spec, not from the test framework."

---

## Scene 3 — Debugging with AI means debugging with evidence (3:30–5:00)

**Visual:** Talking head, then the `assertStatus` failure message format on
screen.

**Narration:**
> "When a test like this fails, it prints a message. It shows the expected status, the actual status, and the full response payload.
>
> That message is exactly what you would paste to an AI assistant to debug the failure.
>
> This is the difference between debugging *with* AI and debugging *blind with* AI. A vague 'it does not work' forces the assistant to guess at the same things you would have to guess at.
>
> A precise failure message, with the actual payload attached, makes the conversation much narrower and much more reliable."

---

## Scene 4 — Tests are one gate, not the only one (5:00–6:30)

**Visual:** Open `AGENTS.md` section 9, "Quality Gates."

**Code shown:**
```markdown
## 9) Quality Gates
Minimum checks before considering a task complete:
1. npm run lint
2. npm run build
3. Prisma migration applies cleanly to an empty database
4. Seed script runs successfully
5. Manual smoke test of modified user flow
```

**Narration:**
> "This is the honest end of the story.
>
> A passing integration test is one gate out of five that this project defines as 'done.'
>
> Notice item 5, 'manual smoke test.' It is still explicitly a human action, not an automated one.
>
> Even in a project that relies heavily on AI throughout its process, some verification steps are kept manual on purpose."

---

## Outro / CTA (6:30–7:00)

**Visual:** End card, next-episode pointer.

**Narration:**
> "So which parts should always stay manual? Which parts should always stay under a human's direct control?
>
> That is the question the rest of this playlist is really about.
>
> We start with it next."

---

## Production Notes

- **Screen recordings needed:** `scripts/test-contribution-rates-api.mjs`
  (the role-based unauthorized check, the `assertStatus` helper);
  `AGENTS.md` section 9 (Quality Gates).
- **Source material:** files above, read directly from the repository.
- **B-roll:** none required.
