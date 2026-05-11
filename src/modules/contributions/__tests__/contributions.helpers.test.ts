import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import {
  roundTo2,
  monthLabel,
  normalizeHeadPeriod,
  parseContributionId,
  parseOptionalPositiveInt,
  parseOptionalDate,
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
