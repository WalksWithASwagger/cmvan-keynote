#!/usr/bin/env node

import assert from "node:assert/strict";

import handler from "../api/submissions.js";

const originalEnv = {
  NOTION_TOKEN: process.env.NOTION_TOKEN,
  NOTION_DB_ID: process.env.NOTION_DB_ID,
};
const originalFetch = globalThis.fetch;

try {
  await smokeCorsPreflight();
  await smokeMissingBackend();
  await smokeValidationFailures();
  await smokeBotGuard();
  await smokeMockedNotionCreate();
  await smokeMockedNotionCreateFailure();
  await smokeMockedNotionGalleryQuery();
  console.log("ok - Release Day submissions smoke");
} finally {
  restoreEnv();
  globalThis.fetch = originalFetch;
}

async function smokeCorsPreflight() {
  delete process.env.NOTION_TOKEN;
  delete process.env.NOTION_DB_ID;

  const res = await invoke({ method: "OPTIONS" });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "https://punkrockai.com");
  assert.equal(res.headers["Access-Control-Allow-Methods"], "GET, POST, OPTIONS");
  assert.equal(res.headers["Access-Control-Allow-Headers"], "Content-Type");
}

async function smokeMissingBackend() {
  delete process.env.NOTION_TOKEN;
  delete process.env.NOTION_DB_ID;

  const getRes = await invoke({ method: "GET" });
  assert.equal(getRes.statusCode, 200);
  assert.deepEqual(getRes.body, { submissions: [] });

  const postRes = await invoke({ method: "POST", body: validSubmission() });
  assert.equal(postRes.statusCode, 202);
  assert.deepEqual(postRes.body, { status: "queued-no-backend" });
}

async function smokeValidationFailures() {
  delete process.env.NOTION_TOKEN;
  delete process.env.NOTION_DB_ID;

  const cases = [
    [{ ...validSubmission(), name: "" }, "name required"],
    [{ ...validSubmission(), url: "" }, "url required"],
    [{ ...validSubmission(), url: "ftp://example.com/file" }, "valid http/https url required"],
    [{ ...validSubmission(), what: "" }, "what required"],
  ];

  for (const [body, error] of cases) {
    const res = await invoke({ method: "POST", body });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error });
  }
}

async function smokeBotGuard() {
  process.env.NOTION_TOKEN = "secret_local_smoke";
  process.env.NOTION_DB_ID = "8b72685121ce499fbd0b4cceee9a0d52";

  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return jsonResponse(200, { id: "should-not-write" });
  };

  const honeypotRes = await invoke({
    method: "POST",
    body: { ...validSubmission(), company: "bot filled this" },
  });
  assert.equal(honeypotRes.statusCode, 200);
  assert.deepEqual(honeypotRes.body, { id: null, status: "pending" });

  const fastRes = await invoke({
    method: "POST",
    body: { ...validSubmission(), formStartedAt: Date.now() },
  });
  assert.equal(fastRes.statusCode, 200);
  assert.deepEqual(fastRes.body, { id: null, status: "pending" });
  assert.equal(called, false);
}

async function smokeMockedNotionCreate() {
  process.env.NOTION_TOKEN = "secret_local_smoke";
  process.env.NOTION_DB_ID = "8b72685121ce499fbd0b4cceee9a0d52";

  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init, body: JSON.parse(init.body) };
    return jsonResponse(200, { id: "notion-page-local-smoke" });
  };

  const res = await invoke({
    method: "POST",
    body: validSubmission(),
    headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { id: "notion-page-local-smoke", status: "pending" });
  assert.equal(request.url, "https://api.notion.com/v1/pages");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer secret_local_smoke");
  assert.equal(request.body.parent.database_id, "8b72685121ce499fbd0b4cceee9a0d52");
  assert.equal(request.body.properties.Name.title[0].text.content, "Local Smoke Tester");
  assert.equal(request.body.properties.URL.url, "https://example.com/release-day-smoke");
  assert.equal(request.body.properties.Published.checkbox, false);
  assert.equal(request.body.properties.Status.select.name, "pending");
  assert.equal(request.body.properties.IP.rich_text[0].text.content, "203.0.113.9");
}

async function smokeMockedNotionGalleryQuery() {
  process.env.NOTION_TOKEN = "secret_local_smoke";
  process.env.NOTION_DB_ID = "8b72685121ce499fbd0b4cceee9a0d52";

  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init, body: JSON.parse(init.body) };
    return jsonResponse(200, {
      results: [
        {
          id: "published-page",
          properties: {
            Name: { title: [{ plain_text: "Published Person" }] },
            Handle: { rich_text: [{ plain_text: "@published" }] },
            URL: { url: "https://example.com/published" },
            What: { rich_text: [{ plain_text: "a zine" }] },
            Why: { rich_text: [{ plain_text: "Because punk never was perfect." }] },
            Submitted: { date: { start: "2026-05-08T12:00:00.000Z" } },
          },
        },
      ],
    });
  };

  const res = await invoke({ method: "GET" });

  assert.equal(res.statusCode, 200);
  assert.equal(request.url, "https://api.notion.com/v1/databases/8b72685121ce499fbd0b4cceee9a0d52/query");
  assert.deepEqual(request.body.filter, { property: "Published", checkbox: { equals: true } });
  assert.deepEqual(res.body, {
    submissions: [
      {
        id: "published-page",
        name: "Published Person",
        handle: "@published",
        url: "https://example.com/published",
        what: "a zine",
        why: "Because punk never was perfect.",
        submitted: "2026-05-08T12:00:00.000Z",
      },
    ],
  });
}

async function smokeMockedNotionCreateFailure() {
  process.env.NOTION_TOKEN = "secret_local_smoke";
  process.env.NOTION_DB_ID = "8b72685121ce499fbd0b4cceee9a0d52";

  const originalConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => {
    return jsonResponse(404, {
      code: "object_not_found",
      message: "Could not find database with ID: test-db",
    });
  };

  let res;
  try {
    res = await invoke({
      method: "POST",
      body: validSubmission(),
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.body, { error: "submission backend unavailable" });
}

function validSubmission() {
  return {
    name: "Local Smoke Tester",
    handle: "@local",
    url: "https://example.com/release-day-smoke",
    what: "a repeatable local smoke test",
    why: "To prove validation and the moderation payload without writing production data.",
    company: "",
    formStartedAt: Date.now() - 5000,
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
  restoreEnvValue("NOTION_TOKEN", originalEnv.NOTION_TOKEN);
  restoreEnvValue("NOTION_DB_ID", originalEnv.NOTION_DB_ID);
}

function restoreEnvValue(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
