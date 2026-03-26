import assert from "node:assert/strict";
import { exec, execSync } from "node:child_process";
import process from "node:process";

const PORT = 3113;
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

function assertStatus(result, expectedStatus, message) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `${message}. status=${result.response.status}, payload=${JSON.stringify(result.payload)}`
  );
}

async function run() {
  const unique = Date.now();

  const block = await requestJson(
    "POST",
    "/api/blocks",
    { description: `CONTR-B-${unique}` },
    AUTH_HEADERS
  );
  assertStatus(block, 201, "Creating block should succeed");
  const blockId = block.payload.data.id;

  const unit = await requestJson(
    "POST",
    "/api/units",
    { description: `CONTR-U-${unique}`, blockId, sqFt: 1000 },
    AUTH_HEADERS
  );
  assertStatus(unit, 201, "Creating unit should succeed");
  const unitId = unit.payload.data.id;

  const depositor = await requestJson(
    "POST",
    "/api/individuals",
    {
      fName: "Pay",
      sName: `User${unique}`,
      eMail: `pay.user.${unique}@example.com`,
      mobile: `+9777${String(unique).slice(-8)}`,
      genderId: 1,
    },
    AUTH_HEADERS
  );
  assertStatus(depositor, 201, "Creating depositor should succeed");
  const depositedBy = depositor.payload.data.id;

  const resident = await requestJson(
    "POST",
    "/api/individuals",
    {
      fName: "Res",
      sName: `Member${unique}`,
      eMail: `res.member.${unique}@example.com`,
      mobile: `+9778${String(unique).slice(-8)}`,
      genderId: 1,
    },
    AUTH_HEADERS
  );
  assertStatus(resident, 201, "Creating active resident should succeed");
  const residentId = resident.payload.data.id;

  const todayIso = new Date().toISOString().slice(0, 10);
  const residency = await requestJson(
    "POST",
    "/api/residencies",
    {
      unitId,
      indId: residentId,
      fromDt: todayIso,
      toDt: null,
    },
    AUTH_HEADERS
  );
  assertStatus(residency, 201, "Creating residency should succeed");

  const head = await requestJson(
    "POST",
    "/api/contribution-heads",
    {
      description: `CONTR-HEAD-${unique}`,
      payUnit: 3,
      period: "MONTH",
    },
    AUTH_HEADERS
  );
  assertStatus(head, 201, "Creating contribution head should succeed");
  const contributionHeadId = head.payload.data.id;

  const perPersonHead = await requestJson(
    "POST",
    "/api/contribution-heads",
    {
      description: `CONTR-HEAD-PER-PERSON-${unique}`,
      payUnit: 2,
      period: "MONTH",
    },
    AUTH_HEADERS
  );
  assertStatus(perPersonHead, 201, "Creating per-person contribution head should succeed");
  const perPersonHeadId = perPersonHead.payload.data.id;

  const txDate = new Date();
  const txDateIso = txDate.toISOString();

  const rate = await requestJson(
    "POST",
    "/api/contribution-rates",
    {
      contributionHeadId,
      fromDt: new Date(txDate.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      toDt: null,
      amt: 150,
      reference: `rate-${unique}`,
    },
    AUTH_HEADERS
  );
  assertStatus(rate, 201, "Creating contribution rate should succeed");

  const perPersonRate = await requestJson(
    "POST",
    "/api/contribution-rates",
    {
      contributionHeadId: perPersonHeadId,
      fromDt: new Date(txDate.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      toDt: null,
      amt: 100,
      reference: `rate-person-${unique}`,
    },
    AUTH_HEADERS
  );
  assertStatus(perPersonRate, 201, "Creating per-person contribution rate should succeed");

  const periodsList = await requestJson(
    "GET",
    `/api/contribution-periods?refYear=${txDate.getUTCFullYear()}&refMonth=1&page=1&pageSize=1`
  );
  assertStatus(periodsList, 200, "Listing contribution periods should succeed");
  assert.equal(periodsList.payload.data.items.length, 1, "Expected one current-year month period in seed data");
  const periodId = periodsList.payload.data.items[0].id;

  const periodsListMonth2 = await requestJson(
    "GET",
    `/api/contribution-periods?refYear=${txDate.getUTCFullYear()}&refMonth=2&page=1&pageSize=1`
  );
  assertStatus(periodsListMonth2, 200, "Listing month-2 contribution periods should succeed");
  assert.equal(
    periodsListMonth2.payload.data.items.length,
    1,
    "Expected one current-year month-2 period in seed data"
  );
  const periodIdMonth2 = periodsListMonth2.payload.data.items[0].id;

  const unauthorized = await requestJson("POST", "/api/contributions", {
    unitId,
    contributionHeadId,
    contributionPeriodIds: [periodId],
    transactionId: `txn-${unique}-unauth`,
    transactionDateTime: txDateIso,
    depositedBy,
  });
  assertStatus(unauthorized, 401, "POST /api/contributions should reject unauthenticated mutation");
  assert.equal(unauthorized.payload?.error?.code, "UNAUTHORIZED");

  const forbidden = await requestJson(
    "POST",
    "/api/contributions",
    {
      unitId,
      contributionHeadId,
      contributionPeriodIds: [periodId],
      transactionId: `txn-${unique}-forbidden`,
      transactionDateTime: txDateIso,
      depositedBy,
    },
    READ_ONLY_HEADERS
  );
  assertStatus(forbidden, 403, "POST /api/contributions should reject READ_ONLY mutation");
  assert.equal(forbidden.payload?.error?.code, "FORBIDDEN");

  const created = await requestJson(
    "POST",
    "/api/contributions",
    {
      unitId,
      contributionHeadId,
      contributionPeriodIds: [periodId],
      transactionId: `txn-${unique}-ok`,
      transactionDateTime: txDateIso,
      depositedBy,
    },
    AUTH_HEADERS
  );
  assertStatus(created, 201, "Creating contribution should succeed");
  assert.equal(created.payload.data.quantity, 1, "Lumpsum head should derive quantity as 1");
  assert.equal(created.payload.data.periodCount, 1, "periodCount should match number of selected periods");
  assert.equal(created.payload.data.details.length, 1, "One detail row expected");
  assert.equal(Number(created.payload.data.details[0].amt), 150, "Detail amount should lock derived rate");
  assert.equal(created.payload.data.details[0].contributionRateId, rate.payload.data.id);
  assert.equal(created.payload.data.details[0].appliedRateReference, `rate-${unique}`);
  const contributionId = created.payload.data.id;

  const createdPerPerson = await requestJson(
    "POST",
    "/api/contributions",
    {
      unitId,
      contributionHeadId: perPersonHeadId,
      contributionPeriodIds: [periodId],
      transactionId: `txn-${unique}-person-ok`,
      transactionDateTime: txDateIso,
      depositedBy,
      availingPersonCount: 4,
      comment: "Family members using gym and pool.",
    },
    AUTH_HEADERS
  );
  assertStatus(createdPerPerson, 201, "Creating per-person contribution should succeed");
  assert.equal(createdPerPerson.payload.data.quantity, 4, "Per-person head should use operator-entered person count");
  assert.equal(createdPerPerson.payload.data.inputComment, "Family members using gym and pool.");
  assert.equal(Number(createdPerPerson.payload.data.details[0].amt), 400, "Per-person detail amount should use entered quantity");
  assert.equal(createdPerPerson.payload.data.details[0].contributionRateId, perPersonRate.payload.data.id);
  assert.equal(createdPerPerson.payload.data.details[0].appliedRateReference, `rate-person-${unique}`);

  const perPersonMissingCount = await requestJson(
    "POST",
    "/api/contributions",
    {
      unitId,
      contributionHeadId: perPersonHeadId,
      contributionPeriodIds: [periodIdMonth2],
      transactionId: `txn-${unique}-person-missing-count`,
      transactionDateTime: txDateIso,
      depositedBy,
    },
    AUTH_HEADERS
  );
  assertStatus(perPersonMissingCount, 400, "Per-person contribution without availingPersonCount should fail validation");
  assert.equal(perPersonMissingCount.payload?.error?.code, "VALIDATION_ERROR");

  const monthLedger = await requestJson(
    "GET",
    `/api/contributions/month-ledger?unitId=${encodeURIComponent(unitId)}&headId=${contributionHeadId}&refYear=${txDate.getUTCFullYear()}`
  );
  assertStatus(monthLedger, 200, "Monthly ledger helper should succeed for monthly head");
  assert.equal(monthLedger.payload.data.latestPaidMonth, 1, "Latest paid month should be January for the created monthly payment");
  assert.equal(monthLedger.payload.data.rows.length, 12, "Monthly ledger should return 12 rows");
  assert.equal(monthLedger.payload.data.rows[0].status, "Paid", "January should be marked paid");
  assert.equal(Number(monthLedger.payload.data.rows[0].amount), 150, "January paid amount should match posted detail amount");
  assert.equal(monthLedger.payload.data.rows[1].status, "Unpaid", "February should be marked unpaid");

  const duplicate = await requestJson(
    "POST",
    "/api/contributions",
    {
      unitId,
      contributionHeadId,
      contributionPeriodIds: [periodId],
      transactionId: `txn-${unique}-dup`,
      transactionDateTime: txDateIso,
      depositedBy,
    },
    AUTH_HEADERS
  );
  assertStatus(duplicate, 409, "Duplicate contribution period should return conflict");
  assert.equal(duplicate.payload?.error?.code, "CONFLICT");

  const immutablePatch = await requestJson(
    "PATCH",
    `/api/contributions/${contributionId}`,
    {
      transactionId: `txn-${unique}-mutated`,
    },
    AUTH_HEADERS
  );
  assertStatus(immutablePatch, 412, "PATCH on posted contribution must fail precondition");
  assert.equal(immutablePatch.payload?.error?.code, "PRECONDITION_FAILED");

  const immutableDelete = await requestJson("DELETE", `/api/contributions/${contributionId}`, undefined, AUTH_HEADERS);
  assertStatus(immutableDelete, 412, "DELETE on posted contribution must fail precondition");
  assert.equal(immutableDelete.payload?.error?.code, "PRECONDITION_FAILED");

  const correction = await requestJson(
    "POST",
    "/api/contributions/corrections",
    {
      originalContributionId: contributionId,
      transactionId: `txn-${unique}-corr`,
      transactionDateTime: txDateIso,
      reasonCode: "WRONG_HEAD",
      reasonText: "Captured against the wrong contribution head.",
      depositedBy,
    },
    AUTH_HEADERS
  );
  assertStatus(correction, 201, "Creating correction contribution should succeed");
  assert.equal(correction.payload.data.correctionOfContributionId, contributionId);
  assert.equal(correction.payload.data.correctionReasonCode, "WRONG_HEAD");
  assert.equal(correction.payload.data.details.length, 1);
  assert.equal(Number(correction.payload.data.details[0].amt), -150, "Correction should reverse detail amount");
  assert.equal(correction.payload.data.details[0].contributionRateId, rate.payload.data.id);
  assert.equal(correction.payload.data.details[0].appliedRateReference, `rate-${unique}`);

  const correctionOfCorrection = await requestJson(
    "POST",
    "/api/contributions/corrections",
    {
      originalContributionId: correction.payload.data.id,
      transactionId: `txn-${unique}-corr2`,
      transactionDateTime: txDateIso,
      reasonCode: "NESTED_NOT_ALLOWED",
      reasonText: "Correction of correction should not be allowed.",
      depositedBy,
    },
    AUTH_HEADERS
  );
  assertStatus(
    correctionOfCorrection,
    412,
    "Correction of correction should fail as precondition"
  );
  assert.equal(correctionOfCorrection.payload?.error?.code, "PRECONDITION_FAILED");
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
    console.log("Contributions API integration checks passed.");
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
