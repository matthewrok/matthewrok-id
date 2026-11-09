const { test, expect } = require("@playwright/test");

test("Member Wishlist page loads and documents supported packages", async ({ request }) => {
  const response = await request.get("/member-wishlist.html");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("Wishlist Paket");
  expect(html).toContain("wishlistCount");
  expect(html).toContain("member-wishlist.js");
  const script = await request.get("/assets/js/member-wishlist.js");
  expect(script.ok()).toBeTruthy();
  const js = await script.text();
  expect(js).toContain("get_my_package_wishlist");
  expect(js).toContain("remove_my_package_from_wishlist");
});

test("Wishlist SQL restricts records to authenticated Warga owners", async ({ request }) => {
  const response = await request.get("/supabase/matthew-package-wishlist.sql");
  expect(response.ok()).toBeTruthy();
  const sql = await response.text();
  expect(sql).toContain("references public.profiles(id) on delete cascade");
  expect(sql).toContain("unique (user_id, product_code)");
  expect(sql).toContain("alter table public.member_package_wishlist enable row level security");
  expect(sql).toContain("revoke all on public.member_package_wishlist from public, anon, authenticated");
  expect(sql).toContain("auth.uid()");
  expect(sql).toContain("warga_sultan");
  expect(sql).toContain("grant execute on function public.get_my_package_wishlist() to authenticated");
});

test("Homepage package cards expose wishlist controls and Member Center links to wishlist", async ({ request }) => {
  const home = await (await request.get("/")).text();
  expect(home).toContain("data-wishlist-product");
  expect(home).toContain("wishlist.js");
  const member = await (await request.get("/member-dashboard.html")).text();
  expect(member).toContain('href="/member-wishlist.html"');
  expect(member).toContain("WISHLIST PAKET");
  expect(member).toContain('href="/member-wishlist.html"');
  expect(member).toContain("WISHLIST PAKET");
});
