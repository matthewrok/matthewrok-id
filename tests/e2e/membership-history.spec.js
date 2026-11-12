const { test, expect } = require("@playwright/test");

test("Membership History page is available and explains the Warga tiers", async ({ request }) => {
  const response = await request.get("/member-membership-history.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("Membership History");
  expect(html).toContain("Jejak Perjalanan Membership");
  expect(html).toContain("WARGA BIASA");
  expect(html).toContain("WARGA TIDAK BIASA");
  expect(html).toContain("WARGA SULTAN");
  expect(html).toContain("membership-history.js");
  const scriptResponse = await request.get("/assets/js/membership-history.js");
  expect(scriptResponse.ok()).toBeTruthy();
  expect(await scriptResponse.text()).toContain("get_my_warga_membership_history");
});

test("Membership History migration logs baseline and future role transitions without exposing raw table access", async ({ request }) => {
  const response = await request.get("/supabase/matthew-membership-history.sql");
  expect(response.ok()).toBeTruthy();
  const sql = await response.text();
  expect(sql).toContain("public.warga_membership_history");
  expect(sql).toContain("event_type in ('baseline','promotion','demotion')");
  expect(sql).toContain("private.capture_warga_membership_history()");
  expect(sql).toContain("public.get_my_warga_membership_history()");
  expect(sql).toContain("revoke all on public.warga_membership_history from public, anon, authenticated");
  expect(sql).toContain("grant execute on function public.get_my_warga_membership_history() to authenticated");
  expect(sql).toContain("19 - v_completed");
  expect(sql).toContain("select id, previous_role, new_role, completed_orders, event_type, changed_at");
});

test("Member Center links to the membership timeline", async ({ request }) => {
  const response = await request.get("/member-dashboard.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('href="/member-membership-history.html"');
  expect(html).toContain("MEMBERSHIP HISTORY");
});
