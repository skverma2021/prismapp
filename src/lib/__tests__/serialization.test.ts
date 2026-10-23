import { describe, it, expect, vi } from "vitest";
import { HttpError, fromUnknownError } from "../api-response";
import { isSerializationConflict, retryOnSerializationConflict } from "../serialization";

const adapterConflict = Object.assign(new Error("TransactionWriteConflict"), {
  name: "DriverAdapterError",
  cause: { kind: "TransactionWriteConflict", originalCode: "40001" },
});

describe("isSerializationConflict", () => {
  it("recognises the Prisma 7 driver-adapter shape", () => {
    expect(isSerializationConflict(adapterConflict)).toBe(true);
  });

  it("recognises P2034", () => {
    expect(isSerializationConflict({ code: "P2034" })).toBe(true);
  });

  it("recognises a raw-query error carrying SQLSTATE 40001", () => {
    expect(isSerializationConflict({ code: "P2010", meta: { code: "40001" } })).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isSerializationConflict(new HttpError(409, "CONFLICT", "dup"))).toBe(false);
    expect(isSerializationConflict({ code: "P2002" })).toBe(false);
    expect(isSerializationConflict(null)).toBe(false);
    expect(isSerializationConflict("boom")).toBe(false);
  });
});

describe("retryOnSerializationConflict", () => {
  it("returns the result without retrying on success", async () => {
    const work = vi.fn().mockResolvedValue("ok");
    await expect(retryOnSerializationConflict(work, 3, 0)).resolves.toBe("ok");
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("retries a serialization conflict and then succeeds", async () => {
    const work = vi.fn().mockRejectedValueOnce(adapterConflict).mockResolvedValueOnce("ok");
    await expect(retryOnSerializationConflict(work, 3, 0)).resolves.toBe("ok");
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("rethrows the conflict after the last attempt", async () => {
    const work = vi.fn().mockRejectedValue(adapterConflict);
    await expect(retryOnSerializationConflict(work, 3, 0)).rejects.toBe(adapterConflict);
    expect(work).toHaveBeenCalledTimes(3);
  });

  it("never retries domain errors", async () => {
    const domainError = new HttpError(409, "CONFLICT", "Overlapping ownership.");
    const work = vi.fn().mockRejectedValue(domainError);
    await expect(retryOnSerializationConflict(work, 3, 0)).rejects.toBe(domainError);
    expect(work).toHaveBeenCalledTimes(1);
  });
});

describe("fromUnknownError", () => {
  it("maps a serialization conflict to a retryable 503", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mapped = fromUnknownError(adapterConflict);
    expect(mapped.status).toBe(503);
    expect(mapped.code).toBe("SERVICE_UNAVAILABLE");
  });
});
