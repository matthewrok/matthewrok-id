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
    pathname: "/login/",
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
      assert.deepEqual(h.redirects, ["/"]);
      assert.equal(h.signOutCalls.length, 0);
    });
  }
});

test("active account status is normalized before login is accepted", async () => {
  const h = makeLoginHarness({ accountStatus: " ACTIVE " });
  await h.submit();
  assert.deepEqual(h.redirects, ["/"]);
  assert.equal(h.signOutCalls.length, 0);
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
      assert.deepEqual(result.redirects, ["/?access=denied"]);
    });
  }
});

test("access guard redirects unauthenticated and inactive accounts to login", async () => {
  const visitor = await runAccessGuard({ pathname: "/worker.html", role: "member", session: false });
  assert.equal(visitor.redirects.length, 1);
  assert.match(visitor.redirects[0], /^\/login\/\?next=/);

  const suspended = await runAccessGuard({ pathname: "/worker.html", role: "worker", accountStatus: "suspended" });
  assert.equal(suspended.redirects.length, 1);
  assert.match(suspended.redirects[0], /^\/login\/\?next=/);
});


test("member onboarding dialog is mounted once in the dashboard, outside invoice markup", () => {
  const html = fs.readFileSync(path.join(ROOT, "member-dashboard.html"), "utf8");
  const dialog = html.indexOf('<div id="memberOnboarding"');
  assert.notEqual(dialog, -1, "dashboard should contain the onboarding dialog");
  assert.equal((html.match(/id="memberOnboarding"/g) || []).length, 1, "dialog must appear only once");
  const lastOpenScript = html.lastIndexOf("<script", dialog);
  const lastClosedScript = html.lastIndexOf("</script>", dialog);
  assert.ok(lastClosedScript > lastOpenScript, "dialog markup must be outside JavaScript and invoice template strings");
  assert.equal((html.match(/member-onboarding\.js/g) || []).length, 1, "onboarding script must be loaded exactly once");
  assert.ok(html.indexOf('member-onboarding.js') > dialog, "onboarding behavior should load after its dialog markup");

  const script = fs.readFileSync(path.join(ROOT, "assets/js/member-onboarding.js"), "utf8");
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /event\.key === "Escape"/);
  assert.match(script, /event\.key === "Tab"/);
});

test("session manager cancels inactivity timer when Auth session is cleared", async () => {
  let ready;
  let authStateListener;
  const scheduled = new Map();
  const cleared = [];
  let nextTimerId = 1;
  const location = { pathname: "/login/", replace() {} };
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


test("worker application Edge Function enforces active applicant roles server-side", () => {
  const source = fs.readFileSync(path.join(ROOT, "supabase/functions/worker-application-submit/index.ts"), "utf8");
  assert.match(source, /select=role,account_status/);
  assert.match(source, /const applicantRoles = \["member", "sultan", "matthew", "pelanggan"\]/);
  assert.match(source, /applicantRoles\.includes\(role\)/);
  assert.match(source, /accountStatus !== "active"/);
  assert.match(source, /return json\(\{ error: "Hanya akun member aktif yang dapat mengajukan pendaftaran worker\." \}, 403\)/);
  assert.doesNotMatch(source, /user_metadata[\s\S]{0,100}role/);
});


test("role management SQL preserves all operational worker roles", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/admin-role-management.sql"), "utf8");
  for (const role of ["member", "admin", "SULTAN", "MATTHEW", "PELANGGAN", "WORKER", "MACUL", "AKUN"]) {
    assert.match(sql, new RegExp("'" + role + "'::text"));
  }
});

test("worker application function preserves both configured site origins and server-side role checks", () => {
  const source = fs.readFileSync(path.join(ROOT, "supabase/functions/worker-application-submit/index.ts"), "utf8");
  assert.ok(source.includes("https://matthewrok.my.id"));
  assert.ok(source.includes("http://matthewrok.my.id"));
  assert.match(source, /corsHeadersFor\(req\.headers\.get\("Origin"\)\)/);
  assert.match(source, /select=role,account_status/);
  assert.match(source, /applicantRoles\.includes\(role\)/);
});


test("worker application form uses the server-validated Edge Function, not direct table INSERT", () => {
  const source = fs.readFileSync(path.join(ROOT, "assets/js/worker-application.js"), "utf8");
  assert.match(source, /functions\.invoke\(["']worker-application-submit["']/);
  assert.doesNotMatch(source, /from\(["']worker_applications["']\)\s*\.insert\(/);
  const endpoint = fs.readFileSync(path.join(ROOT, "supabase/functions/worker-application-submit/index.ts"), "utf8");
  assert.match(endpoint, /auth\/v1\/user/);
  assert.match(endpoint, /profiles\?id=eq\./);
  assert.match(endpoint, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(endpoint, /applicantRoles\.includes\(role\)/);
});


test("order flow uses private tracking-token RPC and shares token separately from order number", () => {
  const source = fs.readFileSync(path.join(ROOT, "assets/js/home-orders.js"), "utf8");
  assert.match(source, /rpc\(["']create_joki_order_secure["']/);
  assert.match(source, /order\.tracking_token/);
  assert.match(source, /No\. Order:/);
  assert.match(source, /Token Pelacakan Rahasia:/);
  assert.doesNotMatch(source, /rpc\(["']create_joki_order["']/);
});

test("public tracking and review UI call only secure tracking-token RPCs", () => {
  const source = fs.readFileSync(path.join(ROOT, "assets/js/joki-matthew.js"), "utf8");
  assert.match(source, /lookup_joki_progress_secure/);
  assert.match(source, /lookup_joki_review_secure/);
  assert.match(source, /submit_joki_review_secure/);
  assert.doesNotMatch(source, /rpc\(["']lookup_joki_progress["']/);
  assert.doesNotMatch(source, /rpc\(["']lookup_joki_review["']/);
  assert.doesNotMatch(source, /rpc\(["']submit_joki_review["']/);
});

test("admin progress panel manages and copies the private tracking token", () => {
  const source = fs.readFileSync(path.join(ROOT, "assets/js/admin-joki-progress.js"), "utf8");
  assert.match(source, /tracking_token/);
  assert.match(source, /payload\.tracking_token=payload\.token/);
});

test("tracking-token SQL uses 256-bit cryptographic randomness and explicit RPC grants", () => {
  const migration = fs.readFileSync(path.join(ROOT, "supabase/tracking-token-v2.sql"), "utf8");
  assert.match(migration, /extensions\.gen_random_bytes\(32\)/);
  assert.match(migration, /joki_progress_tracking_token_uidx/);
  assert.match(migration, /create_joki_order_secure/);
  assert.match(migration, /lookup_joki_progress_secure/);
  assert.match(migration, /lookup_joki_review_secure/);
  assert.match(migration, /submit_joki_review_secure/);
  assert.match(migration, /set search_path = ''/);
  const cutover = fs.readFileSync(path.join(ROOT, "supabase/tracking-token-v2-cutover.sql"), "utf8");
  assert.match(cutover, /revoke all on function public\.lookup_joki_progress/);
  assert.match(cutover, /revoke all on function public\.create_joki_order/);
});


test("tracking page requests a secret token and has valid input markup", () => {
  const html = fs.readFileSync(path.join(ROOT, "joki-matthew.html"), "utf8");
  assert.match(html, /TOKEN PELACAKAN/);
  assert.match(html, /maxlength="80" autocomplete="off"/);
  assert.match(html, /Nomor order tidak dapat digunakan/);
  assert.doesNotMatch(html, /kode order yang sudah kamu terima/i);
  assert.match(html, /name="theme-color" content="#071326"/);
});

test("tracking and admin progress scripts parse without syntax errors", () => {
  for (const file of [
    "assets/js/home-orders.js",
    "assets/js/joki-matthew.js",
    "assets/js/admin-joki-progress.js"
  ]) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.doesNotThrow(() => new Function(source), file + " should parse");
  }
});


test("admin progress page exposes the same blue theme as the public portal", () => {
  const html = fs.readFileSync(path.join(ROOT, "admin/joki-progress.html"), "utf8");
  assert.match(html, /name="theme-color" content="#071426"/);
});


test("remaining public/member review SECURITY DEFINER RPCs pin an empty search_path", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/harden_remaining_rpc_search_paths.sql"), "utf8");
  for (const name of ["get_public_joki_reviews", "get_my_reviewed_order_ids", "submit_member_joki_review"]) {
    assert.match(sql, new RegExp("alter function public\\." + name));
  }
  assert.equal((sql.match(/set search_path = ''/g) || []).length, 3);
});


test("tracking-token rollback is pre-release only and preserves legacy order tokens", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/tracking-token-v2-rollback.sql"), "utf8");
  assert.match(sql, /PRE-RELEASE ROLLBACK ONLY/);
  assert.match(sql, /Existing legacy token and order_number values are intentionally left untouched/);
  assert.match(sql, /drop column if exists tracking_token/);
  assert.doesNotMatch(sql, /delete from public\.joki_progress/i);
});


test("legacy order RPC enforces the same active member-role allowlist during compatibility", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/harden_legacy_order_rpc_role_access.sql"), "utf8");
  assert.match(sql, /v_role not in \('member','sultan','matthew','pelanggan'\)/);
  assert.match(sql, /v_account_status is distinct from 'active'/);
  assert.match(sql, /revoke all on function public\.create_joki_order/);
  assert.match(sql, /grant execute on function public\.create_joki_order[\s\S]*to authenticated/);
});


test("all website routes use the approved blue/navy browser theme colors", () => {
  const pages = [
    "admin/dashboard.html", "admin/joki-progress.html",
    "email-confirmed/index.html", "inbox.html", "index.html", "joki-matthew.html",
    "login/index.html", "member-dashboard.html", "register/index.html",
    "requirements-city-hall.html", "reset-password/index.html",
    "support-matthew.html", "worker.html", "your-order.html"
  ];
  const approved = new Set(["#071326", "#071426", "#071a3a"]);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    const theme = (html.match(/name="theme-color" content="([^"]+)"/) || [])[1];
    assert.ok(approved.has(theme), page + " has non-blue theme color: " + theme);
  }
});


test("Shadow Reign calculator preserves its approved dark palette and calculator UI contract", () => {
  const html = fs.readFileSync(path.join(ROOT, "calculator-resource.html"), "utf8");
  assert.match(html, /name="theme-color" content="#050505"/);
  assert.doesNotMatch(html, /blue-theme\\.css/);
  for (const id of [
    "level", "tax", "food", "wood", "stone", "gold", "activeResourceName",
    "sharedQuickButtons", "calculate", "clear", "result", "resourceDetails",
    "grossResult", "taxResult", "netResult", "grossLabel", "taxLabel",
    "netLabel", "grossBar", "taxBar", "netBar"
  ]) {
    assert.equal((html.match(new RegExp('id="' + id + '"', "g")) || []).length, 1, id + " must exist exactly once");
  }
  assert.match(html, /grid-template-columns: 1fr 1fr/);
  assert.match(html, /\\.resource-card\\.active/);
  assert.match(html, /\\.result-section\\.show/);
  assert.match(html, /result\\.classList\\.toggle\\("show"/);
  assert.match(html, /item\\.classList\\.toggle\\("active"/);
  assert.match(html, /calculator\\.js\\?v=20261104-1/);
  assert.doesNotMatch(html, /Cek Progres|Matthew-Raditya|joki-matthew\\.html/);
});

test("all pages load the current shared blue theme cache version", () => {
  const pages = [
    "admin/dashboard.html", "admin/joki-progress.html",
    "email-confirmed/index.html", "inbox.html", "index.html", "joki-matthew.html",
    "login/index.html", "member-dashboard.html", "register/index.html",
    "requirements-city-hall.html", "reset-password/index.html",
    "support-matthew.html", "worker.html", "your-order.html"
  ];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    assert.match(html, /blue-theme\.css\?v=20261106-blue-pr13-mm2/, page + " should load the current blue theme");
  }
});



test("canonical auth routes include brand favicon and root-relative assets", () => {
  const routes = [
    ["login/index.html", "/login/"],
    ["register/index.html", "/register/"],
    ["reset-password/index.html", "/reset-password/"],
    ["email-confirmed/index.html", "/email-confirmed/"]
  ];
  for (const [file, canonical] of routes) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(html, /rel="icon"[^>]+logo-matthew\.png/, file + " should load the brand favicon");
    assert.ok(html.includes('rel="canonical" href="https://matthewrok.my.id' + canonical + '"'), file + " should declare its canonical URL");
    const relativeAssets = html.match(/(?:src|href)=["'](?!\/|https?:|#|mailto:|data:)[^"']+["']/g) || [];
    assert.deepEqual(relativeAssets, [], file + " must not use fragile relative asset paths");
  }
});

test("legacy auth URLs preserve query strings and hashes when redirecting to pretty routes", () => {
  const legacyRoutes = [
    ["login.html", "/login/"],
    ["register.html", "/register/"],
    ["reset-password.html", "/reset-password/"],
    ["email-confirmed.html", "/email-confirmed/"]
  ];
  for (const [file, route] of legacyRoutes) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.match(html, new RegExp("location\\.replace\\(\\\"" + route.replaceAll("/", "\\/") + "\\\"\\+location\\.search\\+location\\.hash\\)"), file + " should preserve query and hash");
    assert.match(html, new RegExp("http-equiv=\\\"refresh\\\""), file + " should have a no-JS fallback");
  }
});

test("shared blue theme overrides legacy red/gold surfaces on secondary pages", () => {
  const css = fs.readFileSync(path.join(ROOT, "assets/css/blue-theme.css"), "utf8");
  for (const selector of [".resource-card", ".tax-info", ".stats div", ".search", ".notice", ".card"]) {
    assert.ok(css.includes(selector), "missing shared blue override for " + selector);
  }
  assert.match(css, /linear-gradient\(145deg,rgba\(15,42,73/);
});


test("RLS policy consolidation preserves role-specific visibility and admin operations", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/consolidate_permissive_rls_policies.sql"), "utf8");
  assert.match(sql, /Users admins and Matthew can view profiles/);
  assert.match(sql, /Public reads active all-audience notifications/);
  assert.match(sql, /Members and admins read notifications/);
  assert.match(sql, /Admins insert site notifications/);
  assert.match(sql, /Admins update site notifications/);
  assert.match(sql, /Admins delete site notifications/);
  assert.match(sql, /Public reads usable vouchers/);
  assert.match(sql, /Members and admins read vouchers/);
  assert.match(sql, /Applicants and operators read worker applications/);
  const cleanup = fs.readFileSync(path.join(ROOT, "supabase/remove_unused_anon_voucher_policy.sql"), "utf8");
  assert.match(cleanup, /drop policy if exists "Public reads usable vouchers"/);
});


test("Maintenance Mode 2.0 has a server-enforced config, admin audit, and backend gates", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/maintenance-mode-v2.sql"), "utf8");
  for (const item of [
    "site_maintenance_config", "site_maintenance_audit",
    "get_public_maintenance_status", "admin_set_maintenance",
    "admin_get_maintenance_audit", "site_maintenance_config m"
  ]) assert.ok(sql.includes(item), "maintenance SQL missing " + item);
  assert.match(sql, /m\.mode = 'full'/);
  assert.match(sql, /m\.mode = 'orders'/);
  assert.match(sql, /'orders' = any\(m\.affected_modules\)/);
  assert.match(sql, /Hanya admin aktif yang dapat mengubah maintenance mode/);
  const worker = fs.readFileSync(path.join(ROOT, "supabase/functions/worker-application-submit/index.ts"), "utf8");
  assert.match(worker, /site_maintenance_config/);
  assert.match(worker, /maintenance\.mode === "full"/);
  assert.match(worker, /affectedModules\.includes\("macul"\)/);
});

test("maintenance page, global gate, and admin control are wired across every route", () => {
  const status = fs.readFileSync(path.join(ROOT, "assets/js/maintenance-status.js"), "utf8");
  const admin = fs.readFileSync(path.join(ROOT, "assets/js/maintenance-admin.js"), "utf8");
  const dashboard = fs.readFileSync(path.join(ROOT, "admin/dashboard.html"), "utf8");
  const maintenancePage = fs.readFileSync(path.join(ROOT, "maintenance.html"), "utf8");
  assert.match(status, /get_public_maintenance_status/);
  assert.match(status, /location\.replace\("\/maintenance\.html"\)/);
  assert.match(status, /db\.rpc\("is_admin"\)/);
  assert.match(admin, /admin_set_maintenance/);
  assert.match(admin, /admin_get_maintenance_audit/);
  assert.match(dashboard, /maintenanceForm/);
  assert.match(dashboard, /maintenanceDisableNow/);
  assert.match(maintenancePage, /maintenanceMessage/);
  for (const file of [
    "index.html","login/index.html","register/index.html","reset-password/index.html","email-confirmed/index.html",
    "member-dashboard.html","your-order.html","inbox.html","worker.html","joki-matthew.html",
    "calculator-resource.html","requirements-city-hall.html","support-matthew.html",
    "admin/dashboard.html","admin/joki-progress.html"
  ]) {
    const html=fs.readFileSync(path.join(ROOT,file),"utf8");
    assert.match(html,/maintenance-status\.js/,"missing maintenance gate in "+file);
  }
  assert.doesNotThrow(()=>new Function(status));
  assert.doesNotThrow(()=>new Function(admin));
});


test("checkout fails closed when order maintenance is active or status cannot be verified", () => {
  const source = fs.readFileSync(path.join(ROOT, "assets/js/home-orders.js"), "utf8");
  assert.match(source, /get_public_maintenance_status/);
  assert.match(source, /state\.mode==="full"/);
  assert.match(source, /state\.mode==="orders"/);
  assert.match(source, /modules\.includes\("orders"\)/);
  assert.match(source, /Status layanan tidak dapat diverifikasi/);
});

test("Telegram admin panel exposes maintenance controls through the service-only RPC", () => {
  const source = fs.readFileSync(path.join(ROOT, "supabase/functions/telegram-order-notify/index.ts"), "utf8");
  assert.match(source, /callback_data: "maintenance"/);
  assert.match(source, /data === "maintenance"/);
  assert.match(source, /data\.startsWith\("maint\|"/);
  assert.match(source, /service_set_maintenance/);
  assert.match(source, /command:"maintenance"/);
  assert.match(source, /chatId !== adminChatId \|\| senderId !== adminChatId/);
});

test("maintenance Telegram RPC is restricted to service_role and validates an active admin actor", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/maintenance-mode-telegram-rpc.sql"), "utf8");
  assert.match(sql, /v_role is distinct from 'admin'/);
  assert.match(sql, /v_status is distinct from 'active'/);
  assert.match(sql, /revoke all on function public\.service_set_maintenance/);
  assert.match(sql, /to service_role/);
  assert.doesNotMatch(sql, /grant execute[^;]*to authenticated/i);
});


test("Inbox send Edge Function fails closed during maintenance and requires an active admin", () => {
  const source = fs.readFileSync(path.join(ROOT, "supabase/functions/inbox-send/index.ts"), "utf8");
  assert.match(source, /site_maintenance_config/);
  assert.match(source, /maintenanceResponse\.ok/);
  assert.match(source, /maintenance\.mode === "full"/);
  assert.match(source, /affectedModules\.includes\("inbox"\)/);
  assert.match(source, /select=role,account_status/);
  assert.match(source, /role !== "admin" \|\| accountStatus !== "active"/);
  assert.match(source, /service_send_inbox_message/);
});

test("login and homepage initialize Supabase only once per page", () => {
  for (const page of ["login/index.html", "index.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    assert.equal((html.match(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/g) || []).length, 1, page + " should load Supabase JS once");
    assert.equal((html.match(/(?:src=["'])\/?assets\/js\/supabase\.js/g) || []).length, 1, page + " should initialize one Supabase client");
  }
});


test("maintenance foreign-key index follow-up covers both reported advisor findings", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/add_maintenance_foreign_key_indexes.sql"), "utf8");
  assert.match(sql, /site_maintenance_audit_actor_id_idx/);
  assert.match(sql, /site_maintenance_config_updated_by_idx/);
  assert.match(sql, /create index if not exists/);
});


test("maintenance Inbox RLS blocks member reads and receipts while preserving admin recovery access", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/maintenance-mode-inbox-rls.sql"), "utf8");
  assert.match(sql, /is_maintenance_module_blocked/);
  assert.match(sql, /m\.mode='full'/);
  assert.match(sql, /is_maintenance_module_blocked\('inbox'\)/);
  assert.match(sql, /Members read addressed inbox messages outside maintenance/);
  assert.match(sql, /Members read own inbox receipt outside maintenance/);
  assert.match(sql, /Members update own inbox receipt outside maintenance/);
  assert.match(sql, /or \(select public\.is_admin\(\)\)/);
  assert.match(sql, /grant execute on function public\.is_maintenance_module_blocked\(text\) to authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.is_maintenance_module_blocked\(text\) to anon/);
});

test("Telegram maintenance RPC is service-role-only and validates an active admin actor", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/maintenance-mode-telegram-rpc.sql"), "utf8");
  assert.match(sql, /v_role is distinct from 'admin'/);
  assert.match(sql, /v_status is distinct from 'active'/);
  assert.match(sql, /p_mode not in \('full','orders','system'\)/);
  assert.match(sql, /grant execute on function public\.service_set_maintenance[\s\S]*to service_role/);
  assert.match(sql, /revoke all on function public\.service_set_maintenance[\s\S]*from public, anon, authenticated/);
  const telegram = fs.readFileSync(path.join(ROOT, "supabase/functions/telegram-order-notify/index.ts"), "utf8");
  assert.match(telegram, /x-telegram-bot-api-secret-token/);
  assert.match(telegram, /chatId !== adminChatId \|\| senderId !== adminChatId/);
  assert.match(telegram, /service_set_maintenance/);
});


test("maintenance configuration is readable only by trusted server functions", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/maintenance-mode-service-role-read.sql"), "utf8");
  assert.match(sql, /grant select on table public\.site_maintenance_config to service_role/);
  assert.doesNotMatch(sql, /grant select[^;]*to anon/i);
  assert.doesNotMatch(sql, /grant select[^;]*to authenticated/i);
});


test("admin helper hardening requires an active profile and preserves a locked search_path", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/harden_admin_helpers_active_status.sql"), "utf8");
  for (const name of ["is_admin", "is_current_user_admin"]) {
    assert.ok(sql.includes("create or replace function public." + name + "()"));
  }
  assert.equal(sql.split("lower(trim(p.account_status)) = 'active'").length - 1, 2);
  assert.equal(sql.split("set search_path = ''").length - 1, 2);
});


test("every public/private route loads Supabase before the maintenance gate", () => {
  const pages = [
    "admin/dashboard.html", "admin/joki-progress.html",
    "email-confirmed/index.html", "inbox.html", "index.html", "joki-matthew.html",
    "login/index.html", "member-dashboard.html", "register/index.html",
    "requirements-city-hall.html", "reset-password/index.html", "support-matthew.html",
    "worker.html", "your-order.html", "maintenance.html"
  ];
  for (const page of pages) {
    const html=fs.readFileSync(path.join(ROOT,page),"utf8");
    assert.match(html,/@supabase\/supabase-js@2/,page+" must load Supabase SDK");
    assert.match(html,/assets\/js\/supabase\.js/,page+" must initialize Supabase");
    assert.match(html,/maintenance-status\.js/,page+" must load the maintenance gate");
  }
});
