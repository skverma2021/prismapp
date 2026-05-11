import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import {
  parseCreateOwnershipInput,
  parseUpdateOwnershipInput,
  parseTransferOwnershipInput,
} from "../ownerships.schemas";

// ---------------------------------------------------------------------------
// parseCreateOwnershipInput
// ---------------------------------------------------------------------------
describe("parseCreateOwnershipInput", () => {
  const VALID = {
    unitId: "unit-abc",
    indId: "ind-xyz",
    fromDt: "2026-01-01",
    toDt: "2026-12-31",
  };

  it("parses a valid payload with both dates", () => {
    const result = parseCreateOwnershipInput(VALID);
    expect(result.unitId).toBe("unit-abc");
    expect(result.indId).toBe("ind-xyz");
    expect(result.fromDt).toBeInstanceOf(Date);
    expect(result.toDt).toBeInstanceOf(Date);
  });

  it("parses a valid open-ended ownership (no toDt)", () => {
    const { toDt: _omit, ...rest } = VALID;
    const result = parseCreateOwnershipInput(rest);
    expect(result.toDt).toBeUndefined();
  });

  it("parses null toDt as null (explicitly ended ownership)", () => {
    const result = parseCreateOwnershipInput({ ...VALID, toDt: null });
    expect(result.toDt).toBeNull();
  });

  it("throws HttpError 400 when fromDt is after toDt", () => {
    expect(() =>
      parseCreateOwnershipInput({ ...VALID, fromDt: "2026-12-31", toDt: "2026-01-01" })
    ).toThrow(HttpError);
  });

  it("accepts equal fromDt and toDt (single-day ownership)", () => {
    const result = parseCreateOwnershipInput({ ...VALID, fromDt: "2026-06-01", toDt: "2026-06-01" });
    expect(result.fromDt.getTime()).toBe(result.toDt?.getTime());
  });

  it("throws HttpError 400 for missing unitId", () => {
    const { unitId: _omit, ...rest } = VALID;
    expect(() => parseCreateOwnershipInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for missing indId", () => {
    const { indId: _omit, ...rest } = VALID;
    expect(() => parseCreateOwnershipInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for invalid fromDt", () => {
    expect(() => parseCreateOwnershipInput({ ...VALID, fromDt: "not-a-date" })).toThrow(HttpError);
  });

  it("throws HttpError 400 for non-object payload", () => {
    expect(() => parseCreateOwnershipInput(null)).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// parseUpdateOwnershipInput
// ---------------------------------------------------------------------------
describe("parseUpdateOwnershipInput", () => {
  it("parses a partial update with only toDt", () => {
    const result = parseUpdateOwnershipInput({ toDt: "2026-06-30" });
    expect(result.toDt).toBeInstanceOf(Date);
    expect(result.unitId).toBeUndefined();
    expect(result.indId).toBeUndefined();
    expect(result.fromDt).toBeUndefined();
  });

  it("parses a partial update with only unitId", () => {
    const result = parseUpdateOwnershipInput({ unitId: "unit-new" });
    expect(result.unitId).toBe("unit-new");
  });

  it("throws HttpError 400 when no fields are provided", () => {
    expect(() => parseUpdateOwnershipInput({})).toThrow(HttpError);
  });

  it("throws HttpError 400 when fromDt is after toDt", () => {
    expect(() =>
      parseUpdateOwnershipInput({ fromDt: "2026-12-31", toDt: "2026-01-01" })
    ).toThrow(HttpError);
  });

  it("throws HttpError 400 for non-object payload", () => {
    expect(() => parseUpdateOwnershipInput(null)).toThrow(HttpError);
  });
});

// ---------------------------------------------------------------------------
// parseTransferOwnershipInput
// ---------------------------------------------------------------------------
describe("parseTransferOwnershipInput", () => {
  const VALID = {
    unitId: "unit-abc",
    indId: "ind-new",
    fromDt: "2026-05-01",
  };

  it("parses a valid transfer payload", () => {
    const result = parseTransferOwnershipInput(VALID);
    expect(result.unitId).toBe("unit-abc");
    expect(result.indId).toBe("ind-new");
    expect(result.fromDt).toBeInstanceOf(Date);
  });

  it("throws HttpError 400 for missing fromDt", () => {
    const { fromDt: _omit, ...rest } = VALID;
    expect(() => parseTransferOwnershipInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for invalid fromDt", () => {
    expect(() => parseTransferOwnershipInput({ ...VALID, fromDt: "bad-date" })).toThrow(HttpError);
  });

  it("throws HttpError 400 for missing unitId", () => {
    const { unitId: _omit, ...rest } = VALID;
    expect(() => parseTransferOwnershipInput(rest)).toThrow(HttpError);
  });

  it("throws HttpError 400 for non-object payload", () => {
    expect(() => parseTransferOwnershipInput(null)).toThrow(HttpError);
  });
});
