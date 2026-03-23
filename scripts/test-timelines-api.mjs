import assert from "node:assert/strict";
import { exec, execSync } from "node:child_process";
import process from "node:process";

const PORT = 3111;
let BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_HEADERS = {
  "x-user-id": "test-manager-1",
  "x-user-role": "MANAGER",
};
const READ_ONLY_HEADERS = {
  "x-user-id": "test-read-only-1",
  "x-user-role": "READ_ONLY",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/blocks`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await sleep(1000);
  }

  throw new Error("Timed out waiting for Next.js dev server readiness.");
}

async function isServerReachable(url) {
  try {
    const response = await fetch(`${url}/api/blocks`);
    return response.ok;
  } catch {
    return false;
  }
}

async function requestJson(method, path, body, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : null;

  return { response, payload };
}

async function requestNoBody(method, path, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
  });

  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : null;

  return { response, payload };
}

function assertStatus(result, expectedStatus, message) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `${message}. status=${result.response.status}, payload=${JSON.stringify(result.payload)}`
  );
}

async function run() {
  const unique = Date.now();
  const ids = {};

  // Verify guard returns UNAUTHORIZED without auth headers.
  {
    const unauthorized = await requestJson("POST", "/api/blocks", { description: `unauth-${unique}` });
    assertStatus(unauthorized, 401, "POST /api/blocks should reject unauthenticated mutation");
    assert.equal(unauthorized.payload?.error?.code, "UNAUTHORIZED");
  }

  // Verify guard returns FORBIDDEN for READ_ONLY role.
  {
    const forbidden = await requestJson(
      "POST",
      "/api/blocks",
      { description: `readonly-${unique}` },
      READ_ONLY_HEADERS
    );
    assertStatus(forbidden, 403, "POST /api/blocks should reject READ_ONLY mutation");
    assert.equal(forbidden.payload?.error?.code, "FORBIDDEN");
  }

  try {
    const block = await requestJson(
      "POST",
      "/api/blocks",
      { description: `IT Timeline Block ${unique}` },
      AUTH_HEADERS
    );
    assertStatus(block, 201, "Creating block should succeed");
    ids.blockId = block.payload.data.id;

    const unit = await requestJson(
      "POST",
      "/api/units",
      { description: `IT-U-${unique}`, blockId: ids.blockId, sqFt: 780 },
      AUTH_HEADERS
    );
    assertStatus(unit, 201, "Creating unit should succeed");
    ids.unitId = unit.payload.data.id;

    const owner = await requestJson(
      "POST",
      "/api/individuals",
      {
        fName: "IT",
        sName: `Owner${unique}`,
        eMail: `it.owner.${unique}@example.com`,
        mobile: `+9111${String(unique).slice(-8)}`,
        genderId: 1,
      },
      AUTH_HEADERS
    );
    assertStatus(owner, 201, "Creating owner should succeed");
    ids.ownerId = owner.payload.data.id;

    const resident = await requestJson(
      "POST",
      "/api/individuals",
      {
        fName: "IT",
        sName: `Resident${unique}`,
        eMail: `it.resident.${unique}@example.com`,
        mobile: `+9222${String(unique).slice(-8)}`,
        genderId: 2,
      },
      AUTH_HEADERS
    );
    assertStatus(resident, 201, "Creating resident should succeed");
    ids.residentId = resident.payload.data.id;

    const ownership = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId: ids.unitId, indId: ids.ownerId, fromDt: "2026-01-01" },
      AUTH_HEADERS
    );
    assertStatus(ownership, 201, "Creating baseline ownership should succeed");
    ids.ownershipId = ownership.payload.data.id;

    const ownershipConflict = await requestJson(
      "POST",
      "/api/ownerships",
      {
        unitId: ids.unitId,
        indId: ids.residentId,
        fromDt: "2026-03-01",
        toDt: "2026-12-31",
      },
      AUTH_HEADERS
    );
    assertStatus(ownershipConflict, 409, "Overlapping ownership must return conflict");
    assert.equal(ownershipConflict.payload?.error?.code, "CONFLICT");

    const ownershipDeleteActive = await requestNoBody(
      "DELETE",
      `/api/ownerships/${ids.ownershipId}`,
      AUTH_HEADERS
    );
    assertStatus(ownershipDeleteActive, 412, "Deleting active ownership must fail precondition");
    assert.equal(ownershipDeleteActive.payload?.error?.code, "PRECONDITION_FAILED");

    const ownershipTransfer = await requestJson(
      "POST",
      "/api/ownerships/transfer",
      { unitId: ids.unitId, indId: ids.residentId, fromDt: "2026-03-01" },
      AUTH_HEADERS
    );
    assertStatus(ownershipTransfer, 201, "Adjacent ownership transfer should succeed");
    ids.ownershipTransferredId = ownershipTransfer.payload.data.id;

    const residency = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId: ids.unitId,
        indId: ids.residentId,
        fromDt: "2026-01-15",
        toDt: "2026-06-30",
      },
      AUTH_HEADERS
    );
    assertStatus(residency, 201, "Creating baseline residency should succeed");
    ids.residencyId = residency.payload.data.id;

    const residencyConflict = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId: ids.unitId,
        indId: ids.ownerId,
        fromDt: "2026-06-01",
        toDt: "2026-12-31",
      },
      AUTH_HEADERS
    );
    assertStatus(residencyConflict, 409, "Overlapping residency must return conflict");
    assert.equal(residencyConflict.payload?.error?.code, "CONFLICT");

    const residencyAdjacent = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId: ids.unitId,
        indId: ids.ownerId,
        fromDt: "2026-07-01",
        toDt: "2026-12-31",
      },
      AUTH_HEADERS
    );
    assertStatus(residencyAdjacent, 201, "Adjacent residency range should succeed");
    ids.residencyAdjacentId = residencyAdjacent.payload.data.id;
  } finally {
    if (ids.residencyAdjacentId) {
      await requestNoBody("DELETE", `/api/residencies/${ids.residencyAdjacentId}`, AUTH_HEADERS);
    }

    if (ids.residencyId) {
      await requestNoBody("DELETE", `/api/residencies/${ids.residencyId}`, AUTH_HEADERS);
    }

    if (ids.ownershipTransferredId) {
      await requestJson(
        "PATCH",
        `/api/ownerships/${ids.ownershipTransferredId}`,
        { toDt: "2026-12-31" },
        AUTH_HEADERS
      );
      await requestNoBody("DELETE", `/api/ownerships/${ids.ownershipTransferredId}`, AUTH_HEADERS);
    }

    if (ids.ownershipId) {
      await requestNoBody("DELETE", `/api/ownerships/${ids.ownershipId}`, AUTH_HEADERS);
    }

    if (ids.ownerId) {
      await requestNoBody("DELETE", `/api/individuals/${ids.ownerId}`, AUTH_HEADERS);
    }

    if (ids.residentId) {
      await requestNoBody("DELETE", `/api/individuals/${ids.residentId}`, AUTH_HEADERS);
    }

    if (ids.unitId) {
      await requestNoBody("DELETE", `/api/units/${ids.unitId}`, AUTH_HEADERS);
    }

    if (ids.blockId) {
      await requestNoBody("DELETE", `/api/blocks/${ids.blockId}`, AUTH_HEADERS);
    }
  }
}

async function main() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  let server = null;

  const existingBaseUrl = "http://127.0.0.1:3000";
  if (await isServerReachable(existingBaseUrl)) {
    BASE_URL = existingBaseUrl;
  } else {
    BASE_URL = `http://127.0.0.1:${PORT}`;
    server = exec(`${npmCommand} run dev -- -p ${PORT}`, {
      env: process.env,
      windowsHide: true,
    });

    if (server.stdout) {
      server.stdout.pipe(process.stdout);
    }

    if (server.stderr) {
      server.stderr.pipe(process.stderr);
    }
  }

  try {
    if (server) {
      await waitForServerReady();
    }

    await run();
    console.log("Timeline API integration checks passed.");
  } finally {
    if (server) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: "ignore" });
        } catch {
          // Ignore if process already exited.
        }
      } else {
        server.kill("SIGTERM");
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
