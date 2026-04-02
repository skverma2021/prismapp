import assert from "node:assert/strict";
import { exec, execSync } from "node:child_process";
import process from "node:process";

import { createSessionHeaders, waitForAuthServerReady } from "./lib/api-auth.mjs";

const PORT = 3111;
let BASE_URL = `http://127.0.0.1:${PORT}`;

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
  const authHeaders = await createSessionHeaders(BASE_URL, "manager@prismapp.local");
  const readOnlyHeaders = await createSessionHeaders(BASE_URL, "readonly@prismapp.local");

  {
    const unauthorized = await requestJson("POST", "/api/blocks", { description: `unauth-${unique}` });
    assertStatus(unauthorized, 401, "POST /api/blocks should reject unauthenticated mutation");
    assert.equal(unauthorized.payload?.error?.code, "UNAUTHORIZED");
  }

  {
    const forbidden = await requestJson(
      "POST",
      "/api/blocks",
      { description: `readonly-${unique}` },
      readOnlyHeaders
    );
    assertStatus(forbidden, 403, "POST /api/blocks should reject READ_ONLY mutation");
    assert.equal(forbidden.payload?.error?.code, "FORBIDDEN");
  }

  try {
    const block = await requestJson(
      "POST",
      "/api/blocks",
      { description: `IT Timeline Block ${unique}` },
      authHeaders
    );
    assertStatus(block, 201, "Creating block should succeed");
    ids.blockId = block.payload.data.id;

    const unit = await requestJson(
      "POST",
      "/api/units",
      { description: `IT-U-${unique}`, blockId: ids.blockId, sqFt: 780 },
      authHeaders
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
      authHeaders
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
      authHeaders
    );
    assertStatus(resident, 201, "Creating resident should succeed");
    ids.residentId = resident.payload.data.id;

    const ownership = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId: ids.unitId, indId: ids.ownerId, fromDt: "2026-01-01" },
      authHeaders
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
      authHeaders
    );
    assertStatus(ownershipConflict, 409, "Overlapping ownership must return conflict");
    assert.equal(ownershipConflict.payload?.error?.code, "CONFLICT");

    const ownershipDeleteActive = await requestNoBody(
      "DELETE",
      `/api/ownerships/${ids.ownershipId}`,
      authHeaders
    );
    assertStatus(ownershipDeleteActive, 412, "Deleting active ownership must fail precondition");
    assert.equal(ownershipDeleteActive.payload?.error?.code, "PRECONDITION_FAILED");

    const ownershipTransfer = await requestJson(
      "POST",
      "/api/ownerships/transfer",
      { unitId: ids.unitId, indId: ids.residentId, fromDt: "2026-03-01" },
      authHeaders
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
      authHeaders
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
      authHeaders
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
      authHeaders
    );
    assertStatus(residencyAdjacent, 201, "Adjacent residency range should succeed");
    ids.residencyAdjacentId = residencyAdjacent.payload.data.id;
  } finally {
    if (ids.residencyAdjacentId) {
      await requestNoBody("DELETE", `/api/residencies/${ids.residencyAdjacentId}`, authHeaders);
    }

    if (ids.residencyId) {
      await requestNoBody("DELETE", `/api/residencies/${ids.residencyId}`, authHeaders);
    }

    if (ids.ownershipTransferredId) {
      await requestJson(
        "PATCH",
        `/api/ownerships/${ids.ownershipTransferredId}`,
        { toDt: "2026-12-31" },
        authHeaders
      );
      await requestNoBody("DELETE", `/api/ownerships/${ids.ownershipTransferredId}`, authHeaders);
    }

    if (ids.ownershipId) {
      await requestNoBody("DELETE", `/api/ownerships/${ids.ownershipId}`, authHeaders);
    }

    if (ids.ownerId) {
      await requestNoBody("DELETE", `/api/individuals/${ids.ownerId}`, authHeaders);
    }

    if (ids.residentId) {
      await requestNoBody("DELETE", `/api/individuals/${ids.residentId}`, authHeaders);
    }

    if (ids.unitId) {
      await requestNoBody("DELETE", `/api/units/${ids.unitId}`, authHeaders);
    }

    if (ids.blockId) {
      await requestNoBody("DELETE", `/api/blocks/${ids.blockId}`, authHeaders);
    }
  }
}

async function main() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  BASE_URL = `http://127.0.0.1:${PORT}`;
  const server = exec(`${npmCommand} run dev -- -p ${PORT}`, {
    env: process.env,
    windowsHide: true,
  });

  if (server.stdout) {
    server.stdout.pipe(process.stdout);
  }

  if (server.stderr) {
    server.stderr.pipe(process.stderr);
  }

  try {
    await waitForAuthServerReady(BASE_URL);

    await run();
    console.log("Timeline API integration checks passed.");
  } finally {
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
