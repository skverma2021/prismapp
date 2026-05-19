import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import {
  roundTo2,
  monthLabel,
  normalizeHeadPeriod,
  parseContributionId,
  parseOptionalPositiveInt,
  parseOptionalDate,
  checkRatePeriodCoverage,
} from "../contributions.helpers";

// ---------------------------------------------------------------------------
// roundTo2
// ---------------------------------------------------------------------------
describe("roundTo2", () => {
  it("leaves whole numbers unchanged", () => {
    expect(roundTo2(100)).toBe(100);
    expect(roundTo2(0)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(roundTo2(1.234)).toBe(1.23);
    expect(roundTo2(1.235)).toBe(1.24);
    // Note: 1.005 is represented as 1.00499999... in IEEE 754 binary floating point,
    // so Math.round rounds down to 1.00. This is expected and correct behaviour.
    expect(roundTo2(1.005)).toBe(1);
    expect(roundTo2(1.0050001)).toBe(1.01);
  });

  it("handles negative values", () => {
    expect(roundTo2(-1.234)).toBe(-1.23);
    expect(roundTo2(-1.005)).toBe(-1);
  });

  it("handles large amounts", () => {
    expect(roundTo2(99999.999)).toBe(100000);
    expect(roundTo2(12345.678)).toBe(12345.68);
  });
});

// ---------------------------------------------------------------------------
// monthLabel
// ---------------------------------------------------------------------------
describe("monthLabel", () => {
  it("returns correct short name for each valid month", () => {
    const expected = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    expected.forEach((name, i) => {
      expect(monthLabel(i + 1)).toBe(name);
    });
  });

  it("throws HttpError 400 for month 0 (yearly period sentinel)", () => {
    expect(() => monthLabel(0)).toThrow(HttpError);
    expect(() => monthLabel(0)).toThrow("refMonth must be between 1 and 12");
  });

  it("throws HttpError 400 for month 13", () => {
    expect(() => monthLabel(13)).toThrow(HttpError);
  });

  it("throws HttpError 400 for negative month", () => {
    expect(() => monthLabel(-1)).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// normalizeHeadPeriod
// ---------------------------------------------------------------------------
describe("normalizeHeadPeriod", () => {
  it("accepts MONTH (uppercase)", () => {
    expect(normalizeHeadPeriod("MONTH")).toBe("MONTH");
  });

  it("accepts YEAR (uppercase)", () => {
    expect(normalizeHeadPeriod("YEAR")).toBe("YEAR");
  });

  it("normalises lowercase to uppercase", () => {
    expect(normalizeHeadPeriod("month")).toBe("MONTH");
    expect(normalizeHeadPeriod("year")).toBe("YEAR");
  });

  it("normalises mixed-case", () => {
    expect(normalizeHeadPeriod("Month")).toBe("MONTH");
    expect(normalizeHeadPeriod("Year")).toBe("YEAR");
  });

  it("trims surrounding whitespace before normalising", () => {
    expect(normalizeHeadPeriod("  MONTH  ")).toBe("MONTH");
  });

  it("throws HttpError 400 for unrecognised value", () => {
    expect(() => normalizeHeadPeriod("WEEKLY")).toThrow(HttpError);
    expect(() => normalizeHeadPeriod("")).toThrow(HttpError);
    expect(() => normalizeHeadPeriod("MON")).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// parseContributionId
// ---------------------------------------------------------------------------
describe("parseContributionId", () => {
  it("parses a valid positive integer string", () => {
    expect(parseContributionId("1")).toBe(1);
    expect(parseContributionId("9999")).toBe(9999);
  });

  it("throws HttpError 400 for non-numeric string", () => {
    expect(() => parseContributionId("abc")).toThrow(HttpError);
  });

  it("throws HttpError 400 for zero", () => {
    expect(() => parseContributionId("0")).toThrow(HttpError);
  });

  it("throws HttpError 400 for negative number", () => {
    expect(() => parseContributionId("-5")).toThrow(HttpError);
  });

  it("throws HttpError 400 for decimal", () => {
    expect(() => parseContributionId("1.5")).toThrow(HttpError);
  });

  it("throws HttpError 400 for empty string", () => {
    expect(() => parseContributionId("")).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// parseOptionalPositiveInt
// ---------------------------------------------------------------------------
describe("parseOptionalPositiveInt", () => {
  it("returns undefined for null", () => {
    expect(parseOptionalPositiveInt(null, "field")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseOptionalPositiveInt("", "field")).toBeUndefined();
    expect(parseOptionalPositiveInt("   ", "field")).toBeUndefined();
  });

  it("parses valid positive integer string", () => {
    expect(parseOptionalPositiveInt("5", "field")).toBe(5);
    expect(parseOptionalPositiveInt("100", "field")).toBe(100);
  });

  it("throws HttpError 400 for zero", () => {
    expect(() => parseOptionalPositiveInt("0", "field")).toThrow(HttpError);
  });

  it("throws HttpError 400 for negative", () => {
    expect(() => parseOptionalPositiveInt("-1", "field")).toThrow(HttpError);
  });

  it("throws HttpError 400 for decimal", () => {
    expect(() => parseOptionalPositiveInt("2.5", "count")).toThrow(HttpError);
  });

  it("includes field name in error message", () => {
    try {
      parseOptionalPositiveInt("-1", "availingPersonCount");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect((e as HttpError).message).toContain("availingPersonCount");
    }
  });
});

// ---------------------------------------------------------------------------
// parseOptionalDate
// ---------------------------------------------------------------------------
describe("parseOptionalDate", () => {
  it("returns undefined for null", () => {
    expect(parseOptionalDate(null, "field")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseOptionalDate("", "field")).toBeUndefined();
    expect(parseOptionalDate("   ", "field")).toBeUndefined();
  });

  it("parses a valid ISO date string", () => {
    const result = parseOptionalDate("2026-01-15T00:00:00.000Z", "transactionDateTime");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2026);
    expect(result?.getUTCMonth()).toBe(0); // Jan = 0
    expect(result?.getUTCDate()).toBe(15);
  });

  it("parses a date-only string", () => {
    const result = parseOptionalDate("2026-03-01", "fromDt");
    expect(result).toBeInstanceOf(Date);
  });

  it("throws HttpError 400 for an invalid date string", () => {
    expect(() => parseOptionalDate("not-a-date", "transactionDateTime")).toThrow(HttpError);
  });

  it("throws HttpError 400 for a structurally invalid date", () => {
    expect(() => parseOptionalDate("2026-13-01", "field")).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// checkRatePeriodCoverage
// ---------------------------------------------------------------------------
describe("checkRatePeriodCoverage", () => {
  // Helper: build a UTC midnight Date
  const d = (iso: string) => new Date(iso + "T00:00:00.000Z");

  // ── no-warning cases ────────────────────────────────────────────────────

  it("returns undefined when rate started before the period", () => {
    // Rate: 2026-01-01, Period: Mar 2026 → rate predates period → OK
    const result = checkRatePeriodCoverage(
      [{ refYear: 2026, refMonth: 3 }],
      d("2026-01-01")
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when rate started on the exact period start", () => {
    // Rate: 2026-03-01, Period: Mar 2026 → rate starts exactly on period start → OK
    const result = checkRatePeriodCoverage(
      [{ refYear: 2026, refMonth: 3 }],
      d("2026-03-01")
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined for an annual period when rate started on Jan 1 of that year", () => {
    // Annual period refMonth=0 → start is 2026-01-01; rate on same day → OK
    const result = checkRatePeriodCoverage(
      [{ refYear: 2026, refMonth: 0 }],
      d("2026-01-01")
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined for an annual period when rate started before Jan 1 of that year", () => {
    const result = checkRatePeriodCoverage(
      [{ refYear: 2026, refMonth: 0 }],
      d("2025-06-15")
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when multiple periods exist and rate predates the earliest", () => {
    // Periods: Jan, Feb, Mar 2026 — rate from 2025-12-01 predates all of them
    const result = checkRatePeriodCoverage(
      [
        { refYear: 2026, refMonth: 3 },
        { refYear: 2026, refMonth: 1 },
        { refYear: 2026, refMonth: 2 },
      ],
      d("2025-12-01")
    );
    expect(result).toBeUndefined();
  });

  // ── warning cases ────────────────────────────────────────────────────────

  it("returns a warning string when rate started after the period", () => {
    // Rate: 2026-04-01, Period: Jan 2026 → rate is AFTER period start
    const result = checkRatePeriodCoverage(
      [{ refYear: 2026, refMonth: 1 }],
      d("2026-04-01")
    );
    expect(result).toBeTypeOf("string");
    expect(result).toContain("2026-04-01");
    expect(result).toContain("Jan 2026");
  });

  it("uses the earliest period as the comparison baseline in a multi-period submission", () => {
    // Periods: Apr, Feb, Jun 2026 — Feb is earliest; rate from Mar should trigger on Feb
    const result = checkRatePeriodCoverage(
      [
        { refYear: 2026, refMonth: 4 },
        { refYear: 2026, refMonth: 2 },
        { refYear: 2026, refMonth: 6 },
      ],
      d("2026-03-15")
    );
    expect(result).toBeTypeOf("string");
    expect(result).toContain("Feb 2026");
  });

  it("returns a warning for an annual period when rate started after Jan 1 of that year", () => {
    // Annual period 2026 → start is 2026-01-01; rate from Feb means mismatch
    const result = checkRatePeriodCoverage(
      [{ refYear: 2026, refMonth: 0 }],
      d("2026-02-01")
    );
    expect(result).toBeTypeOf("string");
    expect(result).toContain("2026-02-01");
    // Period label for annual period should be just the year string
    expect(result).toContain("2026");
    expect(result).not.toContain("Jan 2026");
  });

  it("includes the policy explanation in the warning message", () => {
    const result = checkRatePeriodCoverage(
      [{ refYear: 2026, refMonth: 1 }],
      d("2026-06-01")
    );
    expect(result).toContain("transaction date per domain policy");
  });

  it("handles cross-year periods: rate after Jan of the earlier year triggers warning", () => {
    // Periods: Dec 2025 and Jan 2026 — earliest is Dec 2025; rate from Feb 2026 warns
    const result = checkRatePeriodCoverage(
      [
        { refYear: 2025, refMonth: 12 },
        { refYear: 2026, refMonth: 1 },
      ],
      d("2026-02-01")
    );
    expect(result).toBeTypeOf("string");
    expect(result).toContain("Dec 2025");
  });
});
