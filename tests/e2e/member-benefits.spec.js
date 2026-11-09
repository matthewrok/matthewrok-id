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
});

test("Member Center menyediakan pintasan ke Member Benefits", async ({ request }) => {
  const response = await request.get("/member-dashboard.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('href="/member-benefits.html"');
  expect(html).toContain("MEMBER BENEFITS");
});
