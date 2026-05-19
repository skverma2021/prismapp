import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import { rangesOverlap, addDays, ensureNotBeforeUnitInception } from "../ownerships.helpers";

// ---------------------------------------------------------------------------
// rangesOverlap
// ---------------------------------------------------------------------------
describe("rangesOverlap", () => {
  // Helper: build a UTC midnight Date
  const d = (iso: string) => new Date(iso + "T00:00:00.000Z");

  // ── non-overlapping ──────────────────────────────────────────────────────

  it("returns false when A ends before B starts (clear gap)", () => {
    // A: Jan–Mar, B: May–Jun — clear gap in April
    expect(rangesOverlap(d("2026-01-01"), d("2026-03-31"), d("2026-05-01"), d("2026-06-30"))).toBe(false);
  });

  it("returns false when B ends before A starts (clear gap, reversed)", () => {
    expect(rangesOverlap(d("2026-05-01"), d("2026-06-30"), d("2026-01-01"), d("2026-03-31"))).toBe(false);
  });

  it("returns false when A ends the day before B starts (adjacent, no overlap)", () => {
    // A toDt Jan 31, B fromDt Feb 1 — perfectly adjacent, no same-day collision
    expect(rangesOverlap(d("2026-01-01"), d("2026-01-31"), d("2026-02-01"), d("2026-02-28"))).toBe(false);
  });

  // ── overlapping ──────────────────────────────────────────────────────────

  it("returns true when A includes B entirely", () => {
    expect(rangesOverlap(d("2026-01-01"), d("2026-12-31"), d("2026-03-01"), d("2026-05-31"))).toBe(true);
  });

  it("returns true when ranges partially overlap", () => {
    // A: Jan–Apr, B: Mar–Jun — Mar and Apr are shared
    expect(rangesOverlap(d("2026-01-01"), d("2026-04-30"), d("2026-03-01"), d("2026-06-30"))).toBe(true);
  });

  it("returns true when A toDt equals B fromDt (same-day boundary collision)", () => {
    // Both share Jan 31: A closes Jan 31, B opens Jan 31
    // toDt is inclusive, so the same day cannot belong to two rows
    expect(rangesOverlap(d("2026-01-01"), d("2026-01-31"), d("2026-01-31"), d("2026-02-28"))).toBe(true);
  });

  it("returns true when A is a single-day range inside B", () => {
    expect(rangesOverlap(d("2026-03-15"), d("2026-03-15"), d("2026-01-01"), d("2026-12-31"))).toBe(true);
  });

  // ── open-ended ranges ────────────────────────────────────────────────────

  it("returns true when A is open-ended and B starts after A starts", () => {
    // A: Jan 2026 onwards (no toDt), B: Jun 2026 — clearly inside A
    expect(rangesOverlap(d("2026-01-01"), null, d("2026-06-01"), d("2026-08-31"))).toBe(true);
  });

  it("returns true when both A and B are open-ended", () => {
    expect(rangesOverlap(d("2026-01-01"), null, d("2026-06-01"), null)).toBe(true);
  });

  it("returns true when B is open-ended and starts within A", () => {
    expect(rangesOverlap(d("2026-01-01"), d("2026-12-31"), d("2026-06-01"), null)).toBe(true);
  });

  it("returns false when A is open-ended but B ends the day before A starts", () => {
    // B: whole of 2025, A: starts 2026 — no overlap
    expect(rangesOverlap(d("2026-01-01"), null, d("2025-01-01"), d("2025-12-31"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------
describe("addDays", () => {
  const d = (iso: string) => new Date(iso + "T00:00:00.000Z");

  it("adds 1 day", () => {
    expect(addDays(d("2026-01-31"), 1)).toEqual(d("2026-02-01"));
  });

  it("adds 0 days returns the same instant", () => {
    const base = d("2026-05-15");
    expect(addDays(base, 0).getTime()).toBe(base.getTime());
  });

  it("crosses a month boundary correctly", () => {
    expect(addDays(d("2026-03-31"), 1)).toEqual(d("2026-04-01"));
  });

  it("crosses a year boundary correctly", () => {
    expect(addDays(d("2025-12-31"), 1)).toEqual(d("2026-01-01"));
  });

  it("works for multi-day increments", () => {
    expect(addDays(d("2026-01-01"), 30)).toEqual(d("2026-01-31"));
  });
});

// ---------------------------------------------------------------------------
// ensureNotBeforeUnitInception
// ---------------------------------------------------------------------------
describe("ensureNotBeforeUnitInception", () => {
  const d = (iso: string) => new Date(iso + "T00:00:00.000Z");

  it("does not throw when fromDt equals inception date", () => {
    expect(() =>
      ensureNotBeforeUnitInception(d("2026-01-01"), d("2026-01-01"), "Ownership start")
    ).not.toThrow();
  });

  it("does not throw when fromDt is after inception date", () => {
    expect(() =>
      ensureNotBeforeUnitInception(d("2026-01-01"), d("2026-06-15"), "Ownership start")
    ).not.toThrow();
  });

  it("throws HttpError 400 VALIDATION_ERROR when fromDt is before inception date", () => {
    expect(() =>
      ensureNotBeforeUnitInception(d("2026-03-01"), d("2026-01-01"), "Ownership start")
    ).toThrow(HttpError);
  });

  it("error has status 400 and code VALIDATION_ERROR", () => {
    try {
      ensureNotBeforeUnitInception(d("2026-03-01"), d("2026-01-15"), "Ownership start");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect((e as HttpError).status).toBe(400);
      expect((e as HttpError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("error message contains the inception date in YYYY-MM-DD format", () => {
    try {
      ensureNotBeforeUnitInception(d("2026-03-01"), d("2026-02-01"), "Ownership start");
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as HttpError).message).toContain("2026-03-01");
    }
  });

  it("error message contains the label passed in", () => {
    try {
      ensureNotBeforeUnitInception(d("2026-06-01"), d("2026-05-31"), "Residency start");
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as HttpError).message).toContain("Residency start");
    }
  });

  it("does not throw for a date exactly 1 ms after inception", () => {
    const inception = new Date("2026-01-01T00:00:00.000Z");
    const justAfter = new Date(inception.getTime() + 1);
    expect(() =>
      ensureNotBeforeUnitInception(inception, justAfter, "label")
    ).not.toThrow();
  });
});
