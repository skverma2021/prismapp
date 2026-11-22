import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import { assertResolvedCanBeClosed, isReopenWindowOpen } from "../complaints.helpers";

const deadline = new Date("2026-11-24T10:00:00.000Z");
const at = (iso: string) => new Date(iso);

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

describe("assertResolvedCanBeClosed (CM4a)", () => {
  it("rejects closing a Resolved complaint inside the reopen window with 409 PRECONDITION_FAILED", () => {
    const attempt = () =>
      assertResolvedCanBeClosed(
        { status: "Resolved", reopenDeadline: deadline },
        at("2026-11-23T09:59:59.000Z")
      );

    expect(attempt).toThrow(HttpError);
    try {
      attempt();
    } catch (error) {
      expect((error as HttpError).status).toBe(409);
      expect((error as HttpError).code).toBe("PRECONDITION_FAILED");
    }
  });

  it("allows closing a Resolved complaint after the window has elapsed", () => {
    expect(() =>
      assertResolvedCanBeClosed(
        { status: "Resolved", reopenDeadline: deadline },
        at("2026-11-24T10:00:00.001Z")
      )
    ).not.toThrow();
  });

  it("does not restrict closing from other statuses", () => {
    for (const status of ["Open", "Assigned", "InProgress", "Reopened"]) {
      expect(() =>
        assertResolvedCanBeClosed({ status, reopenDeadline: deadline }, at("2026-11-23T10:00:00.000Z"))
      ).not.toThrow();
    }
  });
});
