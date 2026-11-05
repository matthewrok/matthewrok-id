const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const ROLES = ["member", "sultan", "matthew", "pelanggan", "worker", "macul", "admin"];
const PRIVATE_PATHS = [
  "/worker.html",
  "/inbox.html",
  "/your-order.html",
  "/member-dashboard.html"
];

function makeStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function makeLoginHarness({ role = "member", accountStatus = "active", profileError = null, userError = null } = {}) {
  let ready;
  let submit;
  const redirects = [];
  const signOutCalls = [];
  const message = { textContent: "", className: "" };
  const button = { textContent: "LOGIN", disabled: false, dataset: {} };
  const loginForm = {
    addEventListener: (name, fn) => { if (name === "submit") submit = fn; },
    querySelector: () => button
  };
  const emailField = { value: "test@example.com" };
  const passwordField = { value: "correct-password" };
  const rememberField = { checked: false };
  const location = {
    pathname: "/login.html",
    search: "?next=%2Fworker.html",
    origin: "https://matthewrok.my.id",
    replace: target => redirects.push(target),
    assign: target => redirects.push(target)
  };
  const client = {
    auth: {
      signInWithPassword: async () => ({ error: null }),
      getUser: async () => ({ data: { user: { id: "user-123" } }, error: userError }),
      signOut: async options => { signOutCalls.push(options); return { error: null }; }
    },
    from: table => {
      assert.equal(table, "profiles");
      return {
        select: columns => {
          assert.equal(columns, "account_status");
          return {
            eq: (column, value) => {
              assert.equal(column, "id");
              assert.equal(value, "user-123");
              return {
                maybeSingle: async () => ({
                  data: profileError ? null : { account_status: accountStatus, role },
                  error: profileError
                })
              };
            }
          };
        }
      };
    }
  };
  const document = {
    addEventListener: (name, fn) => { if (name === "DOMContentLoaded") ready = fn; },
    querySelectorAll: () => [],
    getElementById: id => ({
      authMessage: message,
      loginForm,
      loginEmail: emailField,
      loginPassword: passwordField,
      rememberMe: rememberField
    })[id] || null
  };
  const window = {
    supabaseClient: client,
    location,
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  const context = {
    window, document, location,
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    URLSearchParams, Date, console
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/js/auth.js"), "utf8"), context);
  ready();
  return {
    redirects, signOutCalls, message, button,
    submit: async () => {
      assert.equal(typeof submit, "function", "login submit handler should be registered");
      await submit({ preventDefault() {} });
    }
  };
}

test("successful login for every supported role always redirects to homepage, ignoring ?next=", async t => {
  for (const role of ROLES) {
    await t.test(role, async () => {
      const h = makeLoginHarness({ role });
      await h.submit();
      assert.deepEqual(h.redirects, ["/index.html"]);
      assert.equal(h.signOutCalls.length, 0);
    });
  }
});

test("login signs out locally when the profile is missing or inactive", async t => {
  for (const accountStatus of ["suspended", null, "pending", ""]) {
    const h = makeLoginHarness({ accountStatus });
    await h.submit();
    assert.deepEqual(h.redirects, []);
    assert.equal(h.signOutCalls.length, 1);
    assert.equal(h.signOutCalls[0].scope, "local");
    assert.match(h.message.textContent, /Akun|ditangguhkan|profil/i);
  }
});

test("login signs out locally when profile lookup or Auth user verification fails", async t => {
  const profileFailure = makeLoginHarness({ profileError: { message: "RLS denied" } });
  await profileFailure.submit();
  assert.equal(profileFailure.signOutCalls.length, 1);
  assert.equal(profileFailure.signOutCalls[0].scope, "local");
  assert.deepEqual(profileFailure.redirects, []);

  const userFailure = makeLoginHarness({ userError: { message: "Auth verification failed" } });
  await userFailure.submit();
  assert.equal(userFailure.signOutCalls.length, 1);
  assert.equal(userFailure.signOutCalls[0].scope, "local");
  assert.deepEqual(userFailure.redirects, []);
});

function runAccessGuard({ pathname, role, accountStatus = "active", session = true }) {
  const redirects = [];
  const classes = new Set();
  const location = {
    pathname, search: "", hash: "",
    replace: target => redirects.push(target)
  };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: session ? { access_token: "test" } : null }, error: null }),
      getUser: async () => ({ data: { user: { id: "user-123", email_confirmed_at: "2026-01-01T00:00:00Z" } }, error: null }),
      signOut: async () => ({ error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { role, account_status: accountStatus },
            error: null
          })
        })
      })
    })
  };
  const document = {
    documentElement: {
      classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name)
      }
    },
    head: { appendChild() {} },
    createElement: () => ({ textContent: "" })
  };
  const window = {
    location,
    supabaseClient: client,
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/js/access-guard.js"), "utf8"), {
    window, document, location, console
  });
  return new Promise(resolve => setImmediate(() => resolve({ redirects, classes })));
}

test("access guard permits every active registered role on member/worker pages", async t => {
  for (const role of ROLES) {
    for (const pathname of PRIVATE_PATHS) {
      await t.test(role + " " + pathname, async () => {
        const result = await runAccessGuard({ pathname, role });
        assert.deepEqual(result.redirects, []);
        assert.equal(result.classes.has("access-pending"), false);
      });
    }
  }
});

test("database role casing is normalized before access checks", async () => {
  const upperCaseMacul = await runAccessGuard({ pathname: "/worker.html", role: "MACUL" });
  assert.deepEqual(upperCaseMacul.redirects, []);
  assert.equal(upperCaseMacul.classes.has("access-pending"), false);
});

test("admin pages are restricted to admin role", async t => {
  const allowed = await runAccessGuard({ pathname: "/admin/dashboard.html", role: "admin" });
  assert.deepEqual(allowed.redirects, []);
  for (const role of ROLES.filter(item => item !== "admin")) {
    await t.test(role, async () => {
      const result = await runAccessGuard({ pathname: "/admin/dashboard.html", role });
      assert.deepEqual(result.redirects, ["/index.html?access=denied"]);
    });
  }
});

test("access guard redirects unauthenticated and inactive accounts to login", async () => {
  const visitor = await runAccessGuard({ pathname: "/worker.html", role: "member", session: false });
  assert.equal(visitor.redirects.length, 1);
  assert.match(visitor.redirects[0], /^\/login\.html\?next=/);

  const suspended = await runAccessGuard({ pathname: "/worker.html", role: "worker", accountStatus: "suspended" });
  assert.equal(suspended.redirects.length, 1);
  assert.match(suspended.redirects[0], /^\/login\.html\?next=/);
});


test("session manager cancels inactivity timer when Auth session is cleared", async () => {
  let ready;
  let authStateListener;
  const scheduled = new Map();
  const cleared = [];
  let nextTimerId = 1;
  const location = { pathname: "/login.html", replace() {} };
  const localStorage = makeStorage();
  const sessionStorage = makeStorage();
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "test" } } }),
      onAuthStateChange: callback => { authStateListener = callback; }
    }
  };
  const document = {
    addEventListener: (name, callback) => { if (name === "DOMContentLoaded") ready = callback; },
    visibilityState: "visible",
    getElementById: () => null
  };
  const window = {
    supabaseClient: client,
    location,
    addEventListener() {},
    setTimeout: (callback, delay) => {
      const id = nextTimerId++;
      scheduled.set(id, { callback, delay });
      return id;
    },
    clearTimeout: id => {
      cleared.push(id);
      scheduled.delete(id);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/js/session-manager.js"), "utf8"), {
    window, document, location, localStorage, sessionStorage, Date, URLSearchParams, console,
    setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window)
  });
  ready();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scheduled.size, 1, "active session should receive an inactivity timer");
  authStateListener("SIGNED_OUT", null);
  assert.equal(scheduled.size, 0, "signed-out session should not retain an inactivity timer");
  assert.equal(cleared.length, 1);
});
