const { test, expect } = require("@playwright/test");

test("Admin Analytics menampilkan KPI finansial dan grafik tujuh hari", async ({ page }) => {
  await page.route("**/*.js*", route => route.abort());
  await page.goto("/admin/dashboard.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#adminAnalytics")).toBeAttached();
  await expect(page.locator("#adminAnalytics h2")).toHaveText("08 · Matthew Admin Analytics");
  for (const id of ["analyticsRevenue", "analyticsAverage", "analyticsDiscount", "analyticsQuantity", "analyticsOrdersChart", "analyticsVisitorsChart"]) {
    await expect(page.locator("#" + id)).toHaveCount(1);
  }
  await expect(page.locator("#analyticsOrdersChart")).toHaveAttribute("aria-label", /pesanan tujuh hari/);
  await expect(page.locator("#analyticsVisitorsChart")).toHaveAttribute("aria-label", /kunjungan tujuh hari/);
});
