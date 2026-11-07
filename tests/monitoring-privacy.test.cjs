const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets/js/monitoring.js"), "utf8");

function initializeMonitoring(dsn) {
  let options = null;
  const window = {
    MATTHEW_SENTRY_DSN: dsn,
    Sentry: { init: value => { options = value; } }
  };
  const location = {
    hostname: "matthewrok.my.id",
    origin: "https://matthewrok.my.id",
    pathname: "/member-dashboard.html"
  };
  vm.runInNewContext(source, { window, location, console });
  return { options, window };
}

test("Sentry remains disabled when no DSN is configured", () => {
  const result = initializeMonitoring("");
  assert.equal(result.options, null);
  assert.equal(result.window.__matthewSentryReady, undefined);
});

test("Sentry beforeSend removes identity and private request metadata", () => {
  const { options, window } = initializeMonitoring("https://public@example.ingest.sentry.io/123");
  assert.ok(options, "Sentry should initialize when a DSN is configured");
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.tracesSampleRate, 0);
  assert.equal(window.__matthewSentryReady, true);

  const token = "eyJabcdefghijk.eyJabcdefghijk.eyJabcdefghijk";
  const event = {
    user: { id: "private-user", email: "member@example.com" },
    request: {
      url: "https://matthewrok.my.id/login.html?access_token=secret",
      query_string: "access_token=secret",
      data: { password: "secret" },
      cookies: "session=secret",
      headers: { Authorization: "Bearer secret" }
    },
    extra: { private: "value" },
    tags: { email: "member@example.com" },
    contexts: { custom: { account: "private" } },
    message: "Login for member@example.com with " + token,
    transaction: "/reset?token=secret&email=member@example.com",
    culprit: "member@example.com",
    logentry: { message: "Failed for member@example.com" },
    exception: { values: [{ type: "Error", value: "Token " + token + " for member@example.com" }] },
    breadcrumbs: [
      { category: "auth", message: "login member@example.com", data: { password: "secret" } },
      { category: "console", message: "Unexpected email member@example.com", data: { token: "secret" } }
    ]
  };

  const safe = options.beforeSend(event);
  assert.equal(safe.user, undefined);
  assert.equal(safe.request.url, "https://matthewrok.my.id/member-dashboard.html");
  for (const key of ["query_string", "data", "cookies", "headers"]) assert.equal(safe.request[key], undefined);
  for (const key of ["extra", "tags", "contexts"]) assert.equal(safe[key], undefined);
  assert.doesNotMatch(safe.message, /member@example\.com|eyJabcdefghijk/);
  assert.doesNotMatch(safe.transaction, /secret|member@example\.com/);
  assert.doesNotMatch(safe.culprit, /member@example\.com/);
  assert.doesNotMatch(safe.logentry.message, /member@example\.com/);
  assert.doesNotMatch(safe.exception.values[0].value, /member@example\.com|eyJabcdefghijk/);
  assert.equal(safe.breadcrumbs.length, 1);
  assert.equal(safe.breadcrumbs[0].data, undefined);
  assert.doesNotMatch(safe.breadcrumbs[0].message, /member@example\.com/);
});
