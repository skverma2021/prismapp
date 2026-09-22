# CMM TODO — Deferred Issues Backlog

**Goal:** Track known gaps in the Complaint Management Module discovered during use, so they aren't lost before the module goes through its own hardening pass (per `AGENTS.md` §10, CMM hardening follows Contribution Module Phase 3).
**Scope:** `Complaint`, `ComplaintNote`, `ComplaintCategory`, `ComplaintPriority` and their UI (`app/(dashboard)/complaints/**`).

Items are marked:
- ✅ Done
- 🔄 In progress
- ⬜ Not started

---

## 1. Status Lifecycle and Assignment

| #   | Item                                                                 | Status | Notes |
| --- | --------------------------------------------------------------------- | ------ | ----- |
| 1.1 | "Mark Assigned" button and Assignee picker are decoupled              | ⬜      | **Gap found 2026-09-21.** The "Mark Assigned" status-transition button (`handleStatusTransition("Assigned")`) only PATCHes `status`, independent of the Assignee `<select>` (`handleAssigneeChange`), which PATCHes `assignedToId` and auto-advances `Open → Assigned` (CM1) when set. Net effect: a ticket can reach `status = "Assigned"` while `assignedToId` stays `null`. `Domain-Rules.md` (CM1, CM18) defines the status lifecycle and mutable fields but never states whether `Assigned` requires a non-null assignee — this is a genuine spec gap, not just a code bug. Needs a product decision on one of: (a) disable/hide "Mark Assigned" until an assignee is picked, (b) remove the manual button and let only the assignee picker drive the `Open → Assigned` transition, (c) leave as intentional (status = triaged/queued, assignee = optional refinement) and document it. Not yet implemented pending that decision. |

---

## 2. Hardening Backlog (deferred until after Contribution Module Phase 3)

Full CM1–CM18 checklist re-verification, authz confirmation, audit-log completeness, and test coverage — deferred per `AGENTS.md` §10 scope control. Revisit this file when CMM hardening begins.
