# 00-intro — Reading Index

This folder is the orientation layer of the course. Read these files in the order below before starting Section A.
Each document is a standalone reference; the sequence is designed so later documents build on vocabulary and mental models from earlier ones.

---

## Sequence

| # | File | What it gives you | Time |
|---|------|--------------------|------|
| 1 | [react-express-transition.md](react-express-transition.md) | Six mental model shifts from React+Express to Next.js. Read this before anything else or the rest of the course will feel backwards. | 10 min |
| 2 | [project-structure-walkthrough.md](project-structure-walkthrough.md) | A guided tour of every folder in the codebase — what lives where and why. | 10 min |
| 3 | [domain-glossary.md](domain-glossary.md) | Every domain term defined in plain English: Block, Unit, Individual, Ownership, Residency, Contribution Head, Temporal Period, and more. Use this as a reference throughout the course. | 10 min |
| 4 | [how-to-read-the-vault.md](how-to-read-the-vault.md) | The `vault/` folder is the authoritative spec. This guide shows what it contains, how sections relate, and how to use it while coding. | 8 min |
| 5 | [app-tour.md](app-tour.md) | A narrated walkthrough of the running application — every module, every screen. Now that you have the vocabulary, the tour makes sense. | 6 min |
| 6 | [request-lifecycle.md](request-lifecycle.md) | One user click traced from the browser through the Client Component → fetch → route handler → service → Prisma → PostgreSQL → response. The architecture in motion. | 10 min |
| 7 | [guide-how-to-add-new-module.md](guide-how-to-add-new-module.md) | The synthesis: how the layers learned in 1–6 combine when building a new entity end-to-end. | 15 min |
| 8 | [guide-shared-components.md](guide-shared-components.md) | Reference for the shared UI components used across all module pages. Consult this when building new screens. | 10 min |

---

## What comes before and after

**Before this folder:** Complete `course/00-setup/` first. You need a running local instance before the app tour (step 5) is meaningful.

**After this folder:** Section A (Scope) through Section H (Deployment) build on this foundation.

---

## If you are in a hurry

Minimum viable orientation: read documents 1, 2, 3, and 6. That covers the mental model shift, the file layout, the vocabulary, and the request flow. You can read 4, 5, 7, and 8 as you encounter the relevant sections of the course.
