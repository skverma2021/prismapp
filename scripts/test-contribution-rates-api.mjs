import assert from "node:assert/strict";
import { exec, execSync } from "node:child_process";
import process from "node:process";

import { createSessionHeaders, waitForAuthServerReady } from "./lib/api-auth.mjs";

const PORT = 3112;
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

function assertStatus(result, expectedStatus, message) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `${message}. status=${result.response.status}, payload=${JSON.stringify(result.payload)}`
  );
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

async function run() {
  const unique = Date.now();
  const authHeaders = await createSessionHeaders(BASE_URL, "manager@prismapp.local");
  const readOnlyHeaders = await createSessionHeaders(BASE_URL, "readonly@prismapp.local");

  const createdHead = await requestJson(
    "POST",
    "/api/contribution-heads",
    {
      description: `IT-RATE-HEAD-${unique}`,
      payUnit: 3,
      period: "MONTH",
    },
    authHeaders
  );
  assertStatus(createdHead, 201, "Creating contribution head for rate tests should succeed");
  const contributionHeadId = createdHead.payload.data.id;

  const unauthorized = await requestJson("POST", "/api/contribution-rates", {
    contributionHeadId,
    fromDt: "2099-01-01",
    toDt: "2099-01-31",
    amt: 10.5,
  });
  assertStatus(unauthorized, 401, "POST /api/contribution-rates should reject unauthenticated mutation");
  assert.equal(unauthorized.payload?.error?.code, "UNAUTHORIZED");

  const forbidden = await requestJson(
    "POST",
    "/api/contribution-rates",
    {
      contributionHeadId,
      fromDt: "2099-02-01",
      toDt: "2099-02-28",
      amt: 10.5,
    },
    readOnlyHeaders
  );
  assertStatus(forbidden, 403, "POST /api/contribution-rates should reject READ_ONLY mutation");
  assert.equal(forbidden.payload?.error?.code, "FORBIDDEN");

  const baseDate = new Date(Date.UTC(2099, 0, 1 + (unique % 200)));
  const fromA = toIsoDate(baseDate);
  const toA = toIsoDate(new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000));
  const fromB = toIsoDate(new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000));
  const toB = toIsoDate(new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000));

  const createA = await requestJson(
    "POST",
    "/api/contribution-rates",
    {
      contributionHeadId,
      fromDt: fromA,
      toDt: toA,
      reference: `auto-${unique}-A`,
      amt: 12.25,
    },
    authHeaders
  );
  assertStatus(createA, 201, "Creating contribution rate should succeed");

  const overlap = await requestJson(
    "POST",
    "/api/contribution-rates",
    {
      contributionHeadId,
      fromDt: fromA,
      toDt: toA,
      reference: `auto-${unique}-overlap`,
      amt: 13,
    },
    authHeaders
  );
  assertStatus(overlap, 409, "Overlapping contribution rate period must return conflict");
  assert.equal(overlap.payload?.error?.code, "CONFLICT");

  const adjacent = await requestJson(
    "POST",
    "/api/contribution-rates",
    {
      contributionHeadId,
      fromDt: fromB,
      toDt: toB,
      reference: `auto-${unique}-B`,
      amt: 13,
    },
    authHeaders
  );
  assertStatus(adjacent, 201, "Adjacent contribution rate period should succeed");

  const list = await requestJson(
    "GET",
    `/api/contribution-rates?contributionHeadId=${contributionHeadId}&page=1&pageSize=5`,
    undefined,
    readOnlyHeaders
  );
  assertStatus(list, 200, "List contribution rates should succeed");
  assert.equal(Array.isArray(list.payload?.data?.items), true, "List response must include items array");
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
    console.log("Contribution-rates API integration checks passed.");
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
