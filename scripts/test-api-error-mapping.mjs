import assert from "node:assert/strict";

import { fromUnknownError } from "../src/lib/api-response.ts";

function main() {
  const connectivityFailure = fromUnknownError(new Error("connect ECONNREFUSED 127.0.0.1:5432"));

  assert.equal(connectivityFailure.status, 503, "Connectivity failures should map to HTTP 503.");
  assert.equal(connectivityFailure.code, "SERVICE_UNAVAILABLE", "Connectivity failures should map to SERVICE_UNAVAILABLE.");
  assert.equal(
    connectivityFailure.message,
    "The database is temporarily unavailable. Please retry the operation.",
    "Connectivity failures should produce the retryable database-unavailable message."
  );

  const concurrentActivityFailure = fromUnknownError({
    code: "P2034",
    meta: { reason: "serialization_failure" },
  });

  assert.equal(concurrentActivityFailure.status, 503, "P2034 should map to HTTP 503.");
  assert.equal(concurrentActivityFailure.code, "SERVICE_UNAVAILABLE", "P2034 should map to SERVICE_UNAVAILABLE.");
  assert.equal(
    concurrentActivityFailure.message,
    "The operation could not be completed due to concurrent database activity. Please retry.",
    "P2034 should produce the concurrency retry message."
  );

  console.log("API error mapping checks passed.");
}

main();