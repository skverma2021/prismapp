import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import { VALID_TRANSITIONS, assertReopenWindowElapsed, isReopenWindowOpen } from "../complaints.helpers";

const deadline = new Date("2026-11-24T10:00:00.000Z");
const at = (iso: string) => new Date(iso);

describe("VALID_TRANSITIONS (CM4b)", () => {
  it("allows Closed only from Resolved", () => {
    const canClose = Object.entries(VALID_TRANSITIONS)
      .filter(([, targets]) => targets.includes("Closed"))
      .map(([status]) => status);

    expect(canClose).toEqual(["Resolved"]);
  });

  it("sends a Reopened ticket back through work, not straight to Closed", () => {
    expect(VALID_TRANSITIONS.Reopened).toEqual(["Assigned", "InProgress"]);
    expect(VALID_TRANSITIONS.InProgress).toContain("Resolved");
  });

  it("keeps Closed terminal", () => {
    expect(VALID_TRANSITIONS.Closed).toEqual([]);
  });
});

describe("isReopenWindowOpen", () => {
  it("is open before the deadline and exactly at it", () => {
    expect(isReopenWindowOpen(deadline, at("2026-11-23T10:00:00.000Z"))).toBe(true);
    expect(isReopenWindowOpen(deadline, deadline)).toBe(true);
  });

  it("is closed after the deadline, or when there is no deadline", () => {
    expect(isReopenWindowOpen(deadline, at("2026-11-24T10:00:00.001Z"))).toBe(false);
    expect(isReopenWindowOpen(null, at("2026-11-23T10:00:00.000Z"))).toBe(false);
  });
});

describe("assertReopenWindowElapsed (CM4a)", () => {
  it("rejects closing inside the reopen window with 409 PRECONDITION_FAILED", () => {
    const attempt = () => assertReopenWindowElapsed({ reopenDeadline: deadline }, at("2026-11-23T09:59:59.000Z"));

    expect(attempt).toThrow(HttpError);
    try {
      attempt();
    } catch (error) {
      expect((error as HttpError).status).toBe(409);
      expect((error as HttpError).code).toBe("PRECONDITION_FAILED");
    }
  });

  it("allows closing after the window has elapsed", () => {
    expect(() =>
      assertReopenWindowElapsed({ reopenDeadline: deadline }, at("2026-11-24T10:00:00.001Z"))
    ).not.toThrow();
  });
});
