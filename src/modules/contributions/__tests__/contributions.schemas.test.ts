import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import {
  parseCreateContributionInput,
  parseCreateContributionCorrectionInput,
} from "../contributions.schemas";

const VALID_CONTRIBUTION = {
  unitId: "unit-abc",
  contributionHeadId: 1,
  contributionPeriodIds: [10],
  transactionId: "TXN-001",
  transactionDateTime: "2026-04-01T10:00:00.000Z",
  depositedBy: "ind-xyz",
};

// ---------------------------------------------------------------------------
// parseCreateContributionInput
// ---------------------------------------------------------------------------
describe("parseCreateContributionInput", () => {
  it("parses a minimal valid payload", () => {
    const result = parseCreateContributionInput(VALID_CONTRIBUTION);
    expect(result.unitId).toBe("unit-abc");
    expect(result.contributionHeadId).toBe(1);
    expect(result.contributionPeriodIds).toEqual([10]);
    expect(result.transactionId).toBe("TXN-001");
    expect(result.transactionDateTime).toBeInstanceOf(Date);
    expect(result.depositedBy).toBe("ind-xyz");
    expect(result.availingPersonCount).toBeUndefined();
    expect(result.comment).toBeUndefined();
    expect(result.reference).toBeUndefined();
  });

  it("parses optional fields when present", () => {
    const result = parseCreateContributionInput({
      ...VALID_CONTRIBUTION,
      availingPersonCount: 3,
      comment: "Pool",
      reference: "REF-42",
    });
    expect(result.availingPersonCount).toBe(3);
    expect(result.comment).toBe("Pool");
    expect(result.reference).toBe("REF-42");
  });

  it("throws HttpError 400 for non-object payload", () => {
    expect(() => parseCreateContributionInput(null)).toThrow(HttpError);
    expect(() => parseCreateContributionInput("string")).toThrow(HttpError);
  });

  it("throws HttpError 400 for missing unitId", () => {
    const { unitId: _omit, ...rest } = VALID_CONTRIBUTION;
    expect(() => parseCreateContributionInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for missing depositedBy", () => {
    const { depositedBy: _omit, ...rest } = VALID_CONTRIBUTION;
    expect(() => parseCreateContributionInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for empty contributionPeriodIds array", () => {
    expect(() =>
      parseCreateContributionInput({ ...VALID_CONTRIBUTION, contributionPeriodIds: [] })
    ).toThrow(HttpError);
  });

  it("throws HttpError 400 for non-positive contributionHeadId", () => {
    expect(() =>
      parseCreateContributionInput({ ...VALID_CONTRIBUTION, contributionHeadId: 0 })
    ).toThrow(HttpError);
    expect(() =>
      parseCreateContributionInput({ ...VALID_CONTRIBUTION, contributionHeadId: -1 })
    ).toThrow(HttpError);
  });

  it("throws HttpError 400 for invalid transactionDateTime", () => {
    expect(() =>
      parseCreateContributionInput({ ...VALID_CONTRIBUTION, transactionDateTime: "not-a-date" })
    ).toThrow(HttpError);
  });

  it("throws HttpError 400 for duplicate contributionPeriodIds when dedup would change meaning", () => {
    // [10, 11, 10] should throw because duplicates are present before dedup check
    expect(() =>
      parseCreateContributionInput({ ...VALID_CONTRIBUTION, contributionPeriodIds: [10, 11, 10] })
    ).toThrow(HttpError);
  });

  it("throws HttpError 400 for whitespace-only unitId", () => {
    expect(() =>
      parseCreateContributionInput({ ...VALID_CONTRIBUTION, unitId: "   " })
    ).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// parseCreateContributionCorrectionInput
// ---------------------------------------------------------------------------
describe("parseCreateContributionCorrectionInput", () => {
  const VALID_CORRECTION = {
    originalContributionId: 42,
    transactionId: "TXN-CORR-001",
    transactionDateTime: "2026-04-15T12:00:00.000Z",
    reasonCode: "DUPLICATE_PAYMENT",
    reasonText: "Charged twice for the same period.",
  };

  it("parses a valid correction payload", () => {
    const result = parseCreateContributionCorrectionInput(VALID_CORRECTION);
    expect(result.originalContributionId).toBe(42);
    expect(result.transactionId).toBe("TXN-CORR-001");
    expect(result.transactionDateTime).toBeInstanceOf(Date);
    expect(result.reasonCode).toBe("DUPLICATE_PAYMENT");
    expect(result.reasonText).toBe("Charged twice for the same period.");
    expect(result.depositedBy).toBeUndefined();
  });

  it("parses optional depositedBy when present", () => {
    const result = parseCreateContributionCorrectionInput({
      ...VALID_CORRECTION,
      depositedBy: "ind-abc",
    });
    expect(result.depositedBy).toBe("ind-abc");
  });

  it("throws HttpError 400 for missing reasonCode", () => {
    const { reasonCode: _omit, ...rest } = VALID_CORRECTION;
    expect(() => parseCreateContributionCorrectionInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for missing reasonText", () => {
    const { reasonText: _omit, ...rest } = VALID_CORRECTION;
    expect(() => parseCreateContributionCorrectionInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for non-positive originalContributionId", () => {
    expect(() =>
      parseCreateContributionCorrectionInput({ ...VALID_CORRECTION, originalContributionId: 0 })
    ).toThrow(HttpError);
  });

  it("throws HttpError 400 for invalid transactionDateTime", () => {
    expect(() =>
      parseCreateContributionCorrectionInput({
        ...VALID_CORRECTION,
        transactionDateTime: "not-a-date",
      })
    ).toThrow(HttpError);
  });

  it("throws HttpError 400 for non-object payload", () => {
    expect(() => parseCreateContributionCorrectionInput(null)).toThrow(HttpError);
  });
});
