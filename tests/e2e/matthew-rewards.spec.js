const { test, expect } = require("@playwright/test");

test("Matthew Rewards page exposes balance, redemption, and point history", async ({ request }) => {
  const response = await request.get("/member-rewards.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("SALDO POIN TERSEDIA");
  expect(html).toContain("redeem_matthew_points");
  expect(html).toContain("get_my_matthew_rewards");
  expect(html).toContain("Poin berlaku 12 bulan");
  expect(html).toContain("500 poin");
});

test("Member Benefits links to Matthew Rewards", async ({ request }) => {
  const response = await request.get("/member-benefits.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('href="/member-rewards.html"');
  expect(html).toContain("Matthew Rewards");
});

test("Rewards migration awards points only after completion and protects admin", async ({ request }) => {
  const response = await request.get("/supabase/matthew-rewards.sql");
  expect(response.ok()).toBeTruthy();
  const sql = await response.text();
  expect(sql).toContain("after insert or update of status on public.joki_progress");
  expect(sql).toContain("lower(trim(coalesce(new.status,''))) <> 'selesai'");
  expect(sql).toContain("now() + interval '12 months'");
  expect(sql).toContain("v_role = 'admin'");
  expect(sql).toContain("v_role = 'warga sultan' or v_completed >= 19 then 2 else 1");
  expect(sql).toContain("p_points % 500 <> 0");
  expect(sql).toContain("r.user_id=v_user_id");
  expect(sql).toContain("r.used_at is null and r.expires_at>now()");
});

test("Admin Rewards dashboard is protected by admin-only database RPC", async ({ request }) => {
  const response = await request.get("/admin/matthew-rewards.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("admin_get_matthew_rewards");
  expect(html).toContain("Aktivitas Poin Terbaru");
});

test("Admin dashboard contains shortcut to Rewards overview", async ({ request }) => {
  const response = await request.get("/admin/dashboard.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('href="/admin/matthew-rewards.html"');
  expect(html).toContain("Matthew Rewards");
});
