#!/usr/bin/env node

import assert from "node:assert/strict";

import handler from "../api/subscribe.js";

const originalEnv = {
  BEEHIIV_PUB_ID: process.env.BEEHIIV_PUB_ID,
  BEEHIIV_API_KEY: process.env.BEEHIIV_API_KEY,
};
const originalFetch = globalThis.fetch;

try {
  await smokeMethodGuard();
  await smokeValidationFailure();
  await smokeBotGuard();
  await smokeMissingBackend();
  await smokeMockedBeehiivCreate();
  await smokeMockedBeehiivFailure();
  console.log("ok - newsletter subscribe smoke");
} finally {
  restoreEnv();
  globalThis.fetch = originalFetch;
}

async function smokeMethodGuard() {
  const res = await invoke({ method: "GET" });
  assert.equal(res.statusCode, 405);
}

async function smokeValidationFailure() {
  const res = await invoke({
    method: "POST",
    body: validSubscription({ email: "not-an-email" }),
  });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "valid email required" });
}

async function smokeBotGuard() {
  process.env.BEEHIIV_PUB_ID = "pub_local_smoke";
  process.env.BEEHIIV_API_KEY = "beehiiv_local_smoke";

  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return jsonResponse(200, { ok: true });
  };

  const honeypotRes = await invoke({
    method: "POST",
    body: validSubscription({ company: "bot filled this" }),
  });
  assert.equal(honeypotRes.statusCode, 200);
  assert.deepEqual(honeypotRes.body, { ok: true });

  const fastRes = await invoke({
    method: "POST",
    body: validSubscription({ formStartedAt: Date.now() }),
  });
  assert.equal(fastRes.statusCode, 200);
  assert.deepEqual(fastRes.body, { ok: true });
  assert.equal(called, false);
}

async function smokeMissingBackend() {
  delete process.env.BEEHIIV_PUB_ID;
  delete process.env.BEEHIIV_API_KEY;

  const res = await invoke({ method: "POST", body: validSubscription() });
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "newsletter unavailable" });
}

async function smokeMockedBeehiivCreate() {
  process.env.BEEHIIV_PUB_ID = "pub_local_smoke";
  process.env.BEEHIIV_API_KEY = "beehiiv_local_smoke";

  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init, body: JSON.parse(init.body) };
    return jsonResponse(201, { id: "subscription-local-smoke" });
  };

  const res = await invoke({ method: "POST", body: validSubscription() });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(
    request.url,
    "https://api.beehiiv.com/v2/publications/pub_local_smoke/subscriptions",
  );
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer beehiiv_local_smoke");
  assert.deepEqual(request.body, {
    email: "local@example.com",
    reactivate_existing: false,
  });
}

async function smokeMockedBeehiivFailure() {
  process.env.BEEHIIV_PUB_ID = "pub_local_smoke";
  process.env.BEEHIIV_API_KEY = "beehiiv_local_smoke";

  const originalConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => {
    return jsonResponse(429, { message: "rate limited upstream" });
  };

  let res;
  try {
    res = await invoke({ method: "POST", body: validSubscription() });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.body, { error: "newsletter unavailable" });
}

function validSubscription(overrides = {}) {
  return {
    email: "local@example.com",
    company: "",
    formStartedAt: Date.now() - 5000,
    ...overrides,
  };
}

async function invoke({ method, body, headers = {} }) {
  const req = {
    method,
    body,
    headers,
  };
  const res = createResponse();
  await handler(req, res);
  return res;
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.ended = true;
      return this;
    },
    end(body = "") {
      this.body = body;
      this.ended = true;
      return this;
    },
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function restoreEnv() {
  restoreEnvValue("BEEHIIV_PUB_ID", originalEnv.BEEHIIV_PUB_ID);
  restoreEnvValue("BEEHIIV_API_KEY", originalEnv.BEEHIIV_API_KEY);
}

function restoreEnvValue(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
