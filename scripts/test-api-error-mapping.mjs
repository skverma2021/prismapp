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

  const transactionTimeoutFailure = fromUnknownError({
    code: "P2028",
    meta: { reason: "Transaction already closed" },
  });

  assert.equal(transactionTimeoutFailure.status, 503, "P2028 should map to HTTP 503.");
  assert.equal(transactionTimeoutFailure.code, "SERVICE_UNAVAILABLE", "P2028 should map to SERVICE_UNAVAILABLE.");
  assert.equal(
    transactionTimeoutFailure.message,
    "The database operation could not be completed right now. Please retry.",
    "P2028 should produce the generic retryable database-operation message."
  );

  const closedConnectionFailure = fromUnknownError(new Error("socket hang up"));

  assert.equal(closedConnectionFailure.status, 503, "Socket hang-up errors should map to HTTP 503.");
  assert.equal(closedConnectionFailure.code, "SERVICE_UNAVAILABLE", "Socket hang-up errors should map to SERVICE_UNAVAILABLE.");
  assert.equal(
    closedConnectionFailure.message,
    "The database operation could not be completed right now. Please retry.",
    "Socket hang-up errors should produce the generic retryable database-operation message."
  );

  console.log("API error mapping checks passed.");
}

main();