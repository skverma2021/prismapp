import assert from "node:assert/strict";
import { exec, execSync } from "node:child_process";
import process from "node:process";

const PORT = 3114;
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
  const txDate = new Date();
  const txDateIso = txDate.toISOString();
  const refYear = txDate.getUTCFullYear();

  const unauth = await requestJson("GET", `/api/reports/contributions/transactions?refYear=${refYear}`);
  assertStatus(unauth, 401, "Reports endpoint should require authentication");

  const block = await requestJson(
    "POST",
    "/api/blocks",
    { description: `RPT-B-${unique}` },
    AUTH_HEADERS
  );
  assertStatus(block, 201, "Creating block should succeed");
  const blockId = block.payload.data.id;

  const unit = await requestJson(
    "POST",
    "/api/units",
    { description: `RPT-U-${unique}`, blockId, sqFt: 950 },
    AUTH_HEADERS
  );
  assertStatus(unit, 201, "Creating unit should succeed");
  const unitId = unit.payload.data.id;

  const depositor = await requestJson(
    "POST",
    "/api/individuals",
    {
      fName: "Report",
      sName: `Payer${unique}`,
      eMail: `report.payer.${unique}@example.com`,
      mobile: `+9666${String(unique).slice(-8)}`,
      genderId: 1,
    },
    AUTH_HEADERS
  );
  assertStatus(depositor, 201, "Creating depositor should succeed");
  const depositedBy = depositor.payload.data.id;

  const owner = await requestJson(
    "POST",
    "/api/individuals",
    {
      fName: "Owner",
      sName: `Matrix${unique}`,
      eMail: `owner.matrix.${unique}@example.com`,
      mobile: `+9555${String(unique).slice(-8)}`,
      genderId: 1,
    },
    AUTH_HEADERS
  );
  assertStatus(owner, 201, "Creating owner should succeed");
  const ownerId = owner.payload.data.id;

  const ownership = await requestJson(
    "POST",
    "/api/ownerships",
    {
      unitId,
      indId: ownerId,
      fromDt: `${refYear}-01-01`,
    },
    AUTH_HEADERS
  );
  assertStatus(ownership, 201, "Creating ownership should succeed");

  const head = await requestJson(
    "POST",
    "/api/contribution-heads",
    {
      description: `RPT-HEAD-${unique}`,
      payUnit: 3,
      period: "MONTH",
    },
    AUTH_HEADERS
  );
  assertStatus(head, 201, "Creating contribution head should succeed");
  const headId = head.payload.data.id;

  const rate = await requestJson(
    "POST",
    "/api/contribution-rates",
    {
      contributionHeadId: headId,
      fromDt: new Date(txDate.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      toDt: null,
      amt: 200,
      reference: `rate-${unique}`,
    },
    AUTH_HEADERS
  );
  assertStatus(rate, 201, "Creating contribution rate should succeed");

  const periodsList = await requestJson(
    "GET",
    `/api/contribution-periods?refYear=${refYear}&refMonth=1&page=1&pageSize=1`
  );
  assertStatus(periodsList, 200, "Listing contribution periods should succeed");
  const periodId = periodsList.payload.data.items[0].id;

  const created = await requestJson(
    "POST",
    "/api/contributions",
    {
      unitId,
      contributionHeadId: headId,
      contributionPeriodIds: [periodId],
      transactionId: `txn-rpt-${unique}-1`,
      transactionDateTime: txDateIso,
      depositedBy,
    },
    AUTH_HEADERS
  );
  assertStatus(created, 201, "Creating contribution should succeed");
  const contributionId = created.payload.data.id;

  const correction = await requestJson(
    "POST",
    "/api/contributions/corrections",
    {
      originalContributionId: contributionId,
      transactionId: `txn-rpt-${unique}-corr`,
      transactionDateTime: txDateIso,
      reasonCode: "REVERSAL",
      reasonText: "Report total reversal check",
      depositedBy,
    },
    AUTH_HEADERS
  );
  assertStatus(correction, 201, "Creating correction should succeed");

  const transactions = await requestJson(
    "GET",
    `/api/reports/contributions/transactions?refYear=${refYear}&headId=${headId}`,
    undefined,
    READ_ONLY_HEADERS
  );
  assertStatus(transactions, 200, "Transactions report should allow READ_ONLY role");
  assert.equal(transactions.payload.data.totals.rowCount >= 2, true);
  assert.equal(Number(transactions.payload.data.totals.sumAmount), 0, "Sum amount should net to zero");
  assert.equal(
    transactions.payload.data.items.some((row) => row.contributionRateId === rate.payload.data.id),
    true,
    "Transactions report should expose persisted contributionRateId"
  );
  assert.equal(
    transactions.payload.data.items.some((row) => row.appliedRateReference === `rate-${unique}`),
    true,
    "Transactions report should expose applied rate reference snapshot"
  );

  const matrix = await requestJson(
    "GET",
    `/api/reports/contributions/paid-unpaid-matrix?refYear=${refYear}&headId=${headId}&blockId=${blockId}`,
    undefined,
    READ_ONLY_HEADERS
  );
  assertStatus(matrix, 200, "Paid/unpaid matrix should succeed");
  assert.equal(matrix.payload.data.totals.totalUnits, 1);
  assert.equal(matrix.payload.data.rows[0].unitId, unitId);

  const csvResponse = await fetch(
    `${BASE_URL}/api/reports/contributions/transactions.csv?refYear=${refYear}&headId=${headId}`,
    {
      method: "GET",
      headers: READ_ONLY_HEADERS,
    }
  );
  assert.equal(csvResponse.status, 200, "CSV report should succeed");
  const csv = await csvResponse.text();
  assert.equal(csv.includes("generatedBy,test-read-only-1"), true, "CSV should include generation actor");
  assert.equal(csv.includes("contributionId,transactionId"), true, "CSV should include header row");
  assert.equal(csv.includes("contributionRateId"), true, "CSV should include contributionRateId column");
  assert.equal(csv.includes("appliedRateReference"), true, "CSV should include appliedRateReference column");

  const matrixCsvResponse = await fetch(
    `${BASE_URL}/api/reports/contributions/paid-unpaid-matrix.csv?refYear=${refYear}&headId=${headId}&blockId=${blockId}`,
    {
      method: "GET",
      headers: READ_ONLY_HEADERS,
    }
  );
  assert.equal(matrixCsvResponse.status, 200, "Matrix CSV report should succeed");
  const matrixCsv = await matrixCsvResponse.text();
  assert.equal(
    matrixCsv.includes("unitId,unitDescription,blockId,blockDescription"),
    true,
    "Matrix CSV should include unit header columns"
  );
  assert.equal(matrixCsv.includes("generatedBy,test-read-only-1"), true, "Matrix CSV should include actor metadata");
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
    console.log("Reports API integration checks passed.");
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
