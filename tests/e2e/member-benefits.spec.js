const { test, expect } = require("@playwright/test");

test("halaman Member Benefits tersedia dan menampilkan tiga tingkatan warga", async ({ request }) => {
  const response = await request.get("/member-benefits.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("WARGA MEMBERSHIP PROGRAM");
  expect(html).toContain("WARGA BIASA");
  expect(html).toContain("WARGA TIDAK BIASA");
  expect(html).toContain("WARGA SULTAN");
  expect(html).toContain("SEGERA");
  expect(html).toContain("list_my_joki_orders");
  expect(html).toContain("Voucher Mingguan MATTHEW");
  expect(html).toContain("diskon 3%");
  expect(html).toContain("diskon 5%");
  expect(html).toContain("claim_weekly_voucher");
});

test("Member Center menyediakan pintasan ke Member Benefits", async ({ request }) => {
  const response = await request.get("/member-dashboard.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('href="/member-benefits.html"');
  expect(html).toContain("MEMBER BENEFITS");
});

test("weekly voucher automation is role-scoped, claim-based, and expires after seven days", async ({ request }) => {
  const response = await request.get("/supabase/weekly-member-vouchers.sql");
  expect(response.ok()).toBeTruthy();
  const sql = await response.text();
  expect(sql).toContain("MATTHEW-WNI-");
  expect(sql).toContain("MATTHEW-SLT-");
  expect(sql).toContain("v_discount := case when v_role = 'warga tidak biasa' then 3 else 5 end");
  expect(sql).toContain("now() + interval '7 days'");
  expect(sql).toContain("public.claim_weekly_voucher");
  expect(sql).toContain("redeem_weekly_voucher_claim_after_order");
  expect(sql).toContain("'0 17 * * 0'");
});
