import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import { rangesOverlap, ensureNotBeforeUnitInception } from "../residencies.helpers";

// ---------------------------------------------------------------------------
// rangesOverlap (residency flavour)
// ---------------------------------------------------------------------------
// The same logic as ownerships — both use identical algorithms.
// These tests confirm residency-specific overlap scenarios and open-ended
// active-residency cases that appear in real usage.
describe("rangesOverlap (residency)", () => {
  const d = (iso: string) => new Date(iso + "T00:00:00.000Z");

  it("returns false for completely separate ranges", () => {
    expect(rangesOverlap(d("2026-01-01"), d("2026-03-31"), d("2026-05-01"), null)).toBe(false);
  });

  it("returns false for perfectly adjacent ranges (next-day boundary)", () => {
    // First residency ends Jan 31, second starts Feb 1 — no overlap
    expect(rangesOverlap(d("2026-01-01"), d("2026-01-31"), d("2026-02-01"), null)).toBe(false);
  });

  it("returns true when a closed range collides with the same-day boundary of an open range", () => {
    // Active residency from Jan 2026 (no end), new attempt starts Jan 15 → overlap
    expect(rangesOverlap(d("2026-01-01"), null, d("2026-01-15"), d("2026-02-28"))).toBe(true);
  });

  it("returns true when both are open-ended", () => {
    expect(rangesOverlap(d("2026-01-01"), null, d("2026-03-01"), null)).toBe(true);
  });

  it("returns true for same-day boundary (toDt of A == fromDt of B)", () => {
    // Closing and opening on the same day is still an overlap
    expect(rangesOverlap(d("2026-01-01"), d("2026-03-31"), d("2026-03-31"), null)).toBe(true);
  });

  it("returns false when new range ends before existing range starts", () => {
    // Attempt to create retroactive residency that ends before active one starts
    expect(rangesOverlap(d("2026-06-01"), null, d("2026-01-01"), d("2026-05-31"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ensureNotBeforeUnitInception (residency flavour)
// ---------------------------------------------------------------------------
describe("ensureNotBeforeUnitInception (residency)", () => {
  const d = (iso: string) => new Date(iso + "T00:00:00.000Z");

  it("does not throw when residency start equals unit inception", () => {
    expect(() =>
      ensureNotBeforeUnitInception(d("2024-07-01"), d("2024-07-01"), "Residency start")
    ).not.toThrow();
  });

  it("does not throw when residency start is after unit inception", () => {
    expect(() =>
      ensureNotBeforeUnitInception(d("2024-07-01"), d("2026-01-01"), "Residency start")
    ).not.toThrow();
  });

  it("throws HttpError 400 when residency start is before unit inception", () => {
    expect(() =>
      ensureNotBeforeUnitInception(d("2026-03-01"), d("2026-02-01"), "Residency start")
    ).toThrow(HttpError);
  });

  it("error status is 400 and code is VALIDATION_ERROR", () => {
    try {
      ensureNotBeforeUnitInception(d("2026-03-01"), d("2025-12-31"), "Residency start");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect((e as HttpError).status).toBe(400);
      expect((e as HttpError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("error message contains the inception date", () => {
    try {
      ensureNotBeforeUnitInception(d("2026-03-01"), d("2026-01-01"), "Residency start");
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as HttpError).message).toContain("2026-03-01");
    }
  });
});
