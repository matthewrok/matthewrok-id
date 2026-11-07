const { test, expect } = require("@playwright/test");

async function mockSupabase(page, mode) {
  await page.addInitScript((value) => { window.__mockSupabaseMode = value; }, mode);
  await page.route("https://browser.sentry-cdn.com/**", route => route.fulfill({ status: 200, contentType: "application/javascript", body: "window.Sentry = { init: function () {} };" }));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", route =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        window.supabase = {
          createClient: function () {
            const mode = window.__mockSupabaseMode;
            return {
              auth: {
                signInWithPassword: async function () {
                  return mode === "login-failure"
                    ? { error: { message: "Invalid login credentials" } }
                    : { error: null };
                },
                getSession: async function () {
                  return { data: { session: mode === "unauthenticated" ? null : { access_token: "test-token", user: { id: "e2e-user", email: "member@example.test" } } }, error: null };
                },
                getUser: async function () {
                  return { data: { user: { id: "e2e-user", email: "member@example.test", email_confirmed_at: "2026-01-01T00:00:00Z" } }, error: null };
                },
                signOut: async function () { return { error: null }; },
                onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
              },
              from: function () {
                return {
                  select: function () {
                    return {
                      eq: function () {
                        return {
                          maybeSingle: async function () {
                            return { data: { role: mode === "non-admin" ? "member" : "admin", account_status: "active" }, error: null };
                          },
                          single: async function () {
                            return { data: { role: "member", full_name: "E2E Member", account_status: "active" }, error: null };
                          }
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      `
    })
  );
}

test("login sukses mengarahkan pengguna ke beranda", async ({ page }) => {
  await mockSupabase(page, "login-success");
  await page.goto("/login.html");
  await page.locator("#loginEmail").fill("member@example.test");
  await page.locator("#loginPassword").fill("correct-password");
  await page.locator("#loginForm button[type=submit]").click();

  await expect(page).toHaveURL(/(?:index\.html|\/)$/);
});

test("login menampilkan pesan ramah saat kredensial ditolak", async ({ page }) => {
  await mockSupabase(page, "login-failure");
  await page.goto("/login.html");
  await page.locator("#loginEmail").fill("member@example.test");
  await page.locator("#loginPassword").fill("wrong-password");
  await page.locator("#loginForm button[type=submit]").click();

  await expect(page.locator("#authMessage")).toContainText("Email atau password salah");
  await expect(page.locator("#loginForm button[type=submit]")).toBeEnabled();
});

test("akses admin tanpa sesi diarahkan ke halaman login", async ({ page }) => {
  await mockSupabase(page, "unauthenticated");
  await page.goto("/admin/dashboard.html");
  await expect(page).toHaveURL(/login(?:\.html|\/)\?next=/);
});

test("akun member biasa ditolak dari rute admin", async ({ page }) => {
  await mockSupabase(page, "non-admin");
  await page.goto("/admin/dashboard.html");
  await expect(page).toHaveURL(/(?:index\.html|\/)\?access=denied/);
});
