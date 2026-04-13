import assert from "node:assert/strict";
import { exec, execSync } from "node:child_process";
import process from "node:process";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { createSessionHeaders, waitForAuthServerReady } from "./lib/api-auth.mjs";

const PORT = 3111;
let BASE_URL = `http://127.0.0.1:${PORT}`;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Configure it in .env before running timeline API tests.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

async function cleanupTestData(unique) {
  const marker = String(unique);

  const blocks = await prisma.block.findMany({
    where: {
      description: {
        contains: marker,
      },
    },
    select: { id: true },
  });

  const blockIds = blocks.map((row) => row.id);

  const units = await prisma.unit.findMany({
    where: {
      OR: [
        {
          description: {
            contains: marker,
          },
        },
        ...(blockIds.length > 0 ? [{ blockId: { in: blockIds } }] : []),
      ],
    },
    select: { id: true },
  });

  const unitIds = units.map((row) => row.id);

  const individuals = await prisma.individual.findMany({
    where: {
      OR: [
        {
          eMail: {
            contains: marker,
          },
        },
        {
          sName: {
            contains: marker,
          },
        },
      ],
    },
    select: { id: true },
  });

  const individualIds = individuals.map((row) => row.id);

  if (unitIds.length > 0) {
    await prisma.unitResident.deleteMany({ where: { unitId: { in: unitIds } } });
    await prisma.unitOwner.deleteMany({ where: { unitId: { in: unitIds } } });
    await prisma.contribution.deleteMany({ where: { unitId: { in: unitIds } } });
  }

  if (individualIds.length > 0) {
    await prisma.individual.deleteMany({ where: { id: { in: individualIds } } });
  }

  if (unitIds.length > 0) {
    await prisma.unit.deleteMany({ where: { id: { in: unitIds } } });
  }

  if (blockIds.length > 0) {
    await prisma.block.deleteMany({ where: { id: { in: blockIds } } });
  }
}

async function run() {
  const unique = Date.now();
  const missingUnitId = crypto.randomUUID();
  const missingIndividualId = crypto.randomUUID();
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
    await cleanupTestData(unique);

    const block = await requestJson(
      "POST",
      "/api/blocks",
      { description: `IT Timeline Block ${unique}` },
      authHeaders
    );
    assertStatus(block, 201, "Creating block should succeed");
    const blockId = block.payload.data.id;

    const unit = await requestJson(
      "POST",
      "/api/units",
      { description: `IT-U-${unique}`, blockId, sqFt: 780, inceptionDt: "2026-01-01" },
      authHeaders
    );
    assertStatus(unit, 201, "Creating unit should succeed");
    const unitId = unit.payload.data.id;

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
    const ownerId = owner.payload.data.id;

    const repairUnit = await requestJson(
      "POST",
      "/api/units",
      { description: `IT-REPAIR-${unique}`, blockId, sqFt: 640, inceptionDt: "2026-02-01" },
      authHeaders
    );
    assertStatus(repairUnit, 201, "Creating repair candidate unit should succeed");
    const repairUnitId = repairUnit.payload.data.id;

    const futureOwner = await requestJson(
      "POST",
      "/api/individuals",
      {
        fName: "IT",
        sName: `FutureOwner${unique}`,
        eMail: `it.future.owner.${unique}@example.com`,
        mobile: `+9333${String(unique).slice(-8)}`,
        genderId: 1,
      },
      authHeaders
    );
    assertStatus(futureOwner, 201, "Creating future owner should succeed");
    const futureOwnerId = futureOwner.payload.data.id;

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
    const residentId = resident.payload.data.id;

    const ownershipListBeforeTransfer = await requestNoBody(
      `GET`,
      `/api/ownerships?page=1&pageSize=20&unitId=${encodeURIComponent(unitId)}&sortBy=fromDt&sortDir=asc`,
      authHeaders
    );
    assertStatus(ownershipListBeforeTransfer, 200, "Listing ownerships for the new unit should succeed");
    assert.equal(ownershipListBeforeTransfer.payload?.data?.items?.length, 1, "New unit should start with one builder ownership row");

    const builderOwnership = ownershipListBeforeTransfer.payload.data.items[0];
    assert.equal(builderOwnership.fromDt.slice(0, 10), "2026-01-01", "Builder ownership should start on unit inception date");

    const repairUnitBuilderOwnership = await prisma.unitOwner.findFirst({
      where: { unitId: repairUnitId },
      orderBy: [{ fromDt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        indId: true,
        fromDt: true,
        toDt: true,
      },
    });

    assert.ok(repairUnitBuilderOwnership, "Repair candidate unit should bootstrap a builder ownership row");

    await prisma.unitOwner.create({
      data: {
        unitId: repairUnitId,
        indId: repairUnitBuilderOwnership.indId,
        fromDt: repairUnitBuilderOwnership.fromDt,
        toDt: repairUnitBuilderOwnership.toDt,
      },
    });

    const repairDryRunOutput = execSync("node scripts/repair-builder-ownerships.mjs", {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      windowsHide: true,
    });

    assert.match(repairDryRunOutput, /Dry run only\./, "Repair script dry-run should report that no deletions were applied");
    assert.match(
      repairDryRunOutput,
      new RegExp(`IT-REPAIR-${unique}`),
      "Repair script dry-run should list the crafted redundant builder row"
    );

    const repairApplyOutput = execSync("node scripts/repair-builder-ownerships.mjs --apply", {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      windowsHide: true,
    });

    assert.match(repairApplyOutput, /Deleted \d+ redundant builder ownership row/, "Repair script apply mode should delete redundant rows");

    const remainingRepairUnitBuilderRows = await prisma.unitOwner.count({
      where: {
        unitId: repairUnitId,
        indId: repairUnitBuilderOwnership.indId,
      },
    });

    assert.equal(
      remainingRepairUnitBuilderRows,
      1,
      "Repair script should remove the crafted duplicate builder row and leave one bootstrap row"
    );

    const ownershipBeforeInception = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId, indId: ownerId, fromDt: "2025-12-31" },
      authHeaders
    );
    assertStatus(ownershipBeforeInception, 400, "Ownership before unit inception should fail validation");
    assert.equal(ownershipBeforeInception.payload?.error?.code, "VALIDATION_ERROR");

    const ownershipMissingUnit = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId: missingUnitId, indId: ownerId, fromDt: "2026-01-01" },
      authHeaders
    );
    assertStatus(ownershipMissingUnit, 404, "Ownership with missing unit should return not found");
    assert.equal(ownershipMissingUnit.payload?.error?.code, "NOT_FOUND");

    const ownershipMissingIndividual = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId, indId: missingIndividualId, fromDt: "2026-01-01" },
      authHeaders
    );
    assertStatus(ownershipMissingIndividual, 404, "Ownership with missing individual should return not found");
    assert.equal(ownershipMissingIndividual.payload?.error?.code, "NOT_FOUND");

    const ownershipWithSystemIdentity = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId, indId: builderOwnership.indId, fromDt: "2026-01-01" },
      authHeaders
    );
    assertStatus(ownershipWithSystemIdentity, 412, "System identity must not be selectable as owner");
    assert.equal(ownershipWithSystemIdentity.payload?.error?.code, "PRECONDITION_FAILED");

    const directOwnershipConflict = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId, indId: ownerId, fromDt: "2026-01-01" },
      authHeaders
    );
    assertStatus(directOwnershipConflict, 409, "Direct ownership create should conflict against builder bootstrap row");
    assert.equal(directOwnershipConflict.payload?.error?.code, "CONFLICT");

    const creatableUnitsBeforeTransfer = await requestNoBody(
      "GET",
      "/api/ownerships/residency-eligible-unit-ids",
      authHeaders
    );
    assertStatus(creatableUnitsBeforeTransfer, 200, "Listing residency-creatable units before transfer should succeed");
    assert.equal(
      creatableUnitsBeforeTransfer.payload?.data?.includes(unitId),
      false,
      "Builder-owned unit must not be residency-creatable before transfer"
    );

    const residencyBlockedByBuilder = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId,
        indId: residentId,
        fromDt: "2026-01-15",
        toDt: "2026-06-30",
      },
      authHeaders
    );
    assertStatus(residencyBlockedByBuilder, 412, "Residency should fail while unit is still in builder inventory");
    assert.equal(residencyBlockedByBuilder.payload?.error?.code, "PRECONDITION_FAILED");

    const residencyWithSystemIdentity = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId,
        indId: builderOwnership.indId,
        fromDt: "2026-01-15",
        toDt: "2026-06-30",
      },
      authHeaders
    );
    assertStatus(residencyWithSystemIdentity, 412, "System identity must not be selectable as resident");
    assert.equal(residencyWithSystemIdentity.payload?.error?.code, "PRECONDITION_FAILED");

    const redundantFutureBuilderRow = await prisma.unitOwner.create({
      data: {
        unitId,
        indId: builderOwnership.indId,
        fromDt: new Date("2026-04-01T00:00:00.000Z"),
        toDt: null,
      },
      select: { id: true },
    });

    const ownershipTransfer = await requestJson(
      "POST",
      "/api/ownerships/transfer",
      { unitId, indId: ownerId, fromDt: "2026-03-01" },
      authHeaders
    );
    assertStatus(ownershipTransfer, 201, "Builder to natural owner transfer should succeed");

    const repairedFutureBuilderRow = await prisma.unitOwner.findUnique({
      where: { id: redundantFutureBuilderRow.id },
      select: { id: true },
    });
    assert.equal(
      repairedFutureBuilderRow,
      null,
      "Transfer should delete redundant future builder rows before applying the handover"
    );

    const futureOwnershipAfterActiveOwner = await requestJson(
      "POST",
      "/api/ownerships",
      { unitId, indId: residentId, fromDt: "2026-04-01" },
      authHeaders
    );
    assertStatus(
      futureOwnershipAfterActiveOwner,
      409,
      "Direct future ownership after an active open-ended owner should conflict"
    );
    assert.equal(futureOwnershipAfterActiveOwner.payload?.error?.code, "CONFLICT");

    const repeatTransferSameOwner = await requestJson(
      "POST",
      "/api/ownerships/transfer",
      { unitId, indId: ownerId, fromDt: "2026-06-01" },
      authHeaders
    );
    assertStatus(repeatTransferSameOwner, 400, "Transfer to the same active owner should fail validation");
    assert.equal(repeatTransferSameOwner.payload?.error?.code, "VALIDATION_ERROR");

    const transferSameDayAsCurrentOwnerStart = await requestJson(
      "POST",
      "/api/ownerships/transfer",
      { unitId, indId: residentId, fromDt: "2026-03-01" },
      authHeaders
    );
    assertStatus(
      transferSameDayAsCurrentOwnerStart,
      412,
      "Transfer on the same day as the current owner's start date should fail precondition"
    );
    assert.equal(transferSameDayAsCurrentOwnerStart.payload?.error?.code, "PRECONDITION_FAILED");

    const ownershipDeleteBlocked = await requestNoBody("DELETE", `/api/ownerships/${ownershipTransfer.payload.data.id}`, authHeaders);
    assertStatus(ownershipDeleteBlocked, 412, "Deleting ownership history should fail precondition");
    assert.equal(ownershipDeleteBlocked.payload?.error?.code, "PRECONDITION_FAILED");

    const ownershipPatchBlocked = await requestJson(
      "PATCH",
      `/api/ownerships/${ownershipTransfer.payload.data.id}`,
      { toDt: "2026-12-31" },
      authHeaders
    );
    assertStatus(ownershipPatchBlocked, 412, "Patching ownership history should fail precondition");
    assert.equal(ownershipPatchBlocked.payload?.error?.code, "PRECONDITION_FAILED");

    await prisma.unitOwner.create({
      data: {
        unitId,
        indId: futureOwnerId,
        fromDt: new Date("2026-07-01T00:00:00.000Z"),
        toDt: null,
      },
    });

    const transferBlockedByFutureOwner = await requestJson(
      "POST",
      "/api/ownerships/transfer",
      { unitId, indId: residentId, fromDt: "2026-05-01" },
      authHeaders
    );
    assertStatus(transferBlockedByFutureOwner, 412, "Future natural owner should block another transfer");
    assert.equal(transferBlockedByFutureOwner.payload?.error?.code, "PRECONDITION_FAILED");

    await prisma.unitOwner.deleteMany({
      where: {
        unitId,
        indId: futureOwnerId,
      },
    });

    const creatableUnitsAfterTransfer = await requestNoBody(
      "GET",
      "/api/ownerships/residency-eligible-unit-ids",
      authHeaders
    );
    assertStatus(creatableUnitsAfterTransfer, 200, "Listing residency-creatable units after transfer should succeed");
    assert.equal(
      creatableUnitsAfterTransfer.payload?.data?.includes(unitId),
      true,
      "Transferred unit should become residency-creatable immediately"
    );

    const residencyBeforeInception = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId,
        indId: residentId,
        fromDt: "2025-12-31",
        toDt: "2026-01-31",
      },
      authHeaders
    );
    assertStatus(residencyBeforeInception, 400, "Residency before unit inception should fail validation");
    assert.equal(residencyBeforeInception.payload?.error?.code, "VALIDATION_ERROR");

    const residencyMissingUnit = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId: missingUnitId,
        indId: residentId,
        fromDt: "2026-03-15",
        toDt: "2026-06-30",
      },
      authHeaders
    );
    assertStatus(residencyMissingUnit, 404, "Residency with missing unit should return not found");
    assert.equal(residencyMissingUnit.payload?.error?.code, "NOT_FOUND");

    const residencyMissingIndividual = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId,
        indId: missingIndividualId,
        fromDt: "2026-03-15",
        toDt: "2026-06-30",
      },
      authHeaders
    );
    assertStatus(residencyMissingIndividual, 404, "Residency with missing individual should return not found");
    assert.equal(residencyMissingIndividual.payload?.error?.code, "NOT_FOUND");

    const residency = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId,
        indId: residentId,
        fromDt: "2026-03-15",
        toDt: "2026-06-30",
      },
      authHeaders
    );
    assertStatus(residency, 201, "Creating baseline residency should succeed");

    const residencyConflict = await requestJson(
      "POST",
      "/api/residencies",
      {
        unitId,
        indId: ownerId,
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
        unitId,
        indId: ownerId,
        fromDt: "2026-07-01",
        toDt: "2026-12-31",
      },
      authHeaders
    );
    assertStatus(residencyAdjacent, 201, "Adjacent residency range should succeed");

    const residencyUpdateBeforeStart = await requestJson(
      "PATCH",
      `/api/residencies/${residency.payload.data.id}`,
      { toDt: "2026-03-01" },
      authHeaders
    );
    assertStatus(residencyUpdateBeforeStart, 400, "Residency end date before start should fail validation");
    assert.equal(residencyUpdateBeforeStart.payload?.error?.code, "VALIDATION_ERROR");

    const residencyUpdateOverlapNext = await requestJson(
      "PATCH",
      `/api/residencies/${residency.payload.data.id}`,
      { toDt: "2026-08-01" },
      authHeaders
    );
    assertStatus(residencyUpdateOverlapNext, 409, "Residency end date overlapping the next row should conflict");
    assert.equal(residencyUpdateOverlapNext.payload?.error?.code, "CONFLICT");

    const residencyDeleteBlocked = await requestNoBody(
      "DELETE",
      `/api/residencies/${residency.payload.data.id}`,
      authHeaders
    );
    assertStatus(residencyDeleteBlocked, 412, "Deleting residency history should fail precondition");
    assert.equal(residencyDeleteBlocked.payload?.error?.code, "PRECONDITION_FAILED");

    const residencyClosed = await requestJson(
      "PATCH",
      `/api/residencies/${residency.payload.data.id}`,
      { toDt: "2026-03-31" },
      authHeaders
    );
    assertStatus(residencyClosed, 200, "Closing active residency should succeed");

    const residentEligibleUnits = await requestNoBody(
      "GET",
      "/api/residencies/eligible-unit-ids",
      authHeaders
    );
    assertStatus(residentEligibleUnits, 200, "Listing resident-eligible units after active residency should succeed");
    assert.equal(
      residentEligibleUnits.payload?.data?.includes(unitId),
      false,
      "Unit without an active residency should be excluded from resident-eligible payUnit=2 flows"
    );
  } finally {
    await cleanupTestData(unique);
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
    await prisma.$disconnect();

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
