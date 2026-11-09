const { test, expect } = require("@playwright/test");

test("Admin Dashboard 2.0 memuat tema biru setelah seluruh stylesheet bersama", async ({ page }) => {
  await page.route("**/*.js*", route => route.abort());
  await page.goto("/admin/dashboard.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator("body")).toHaveClass(/admin-dashboard-page/);
  await expect(page.locator(".top h1")).toHaveText("Pusat Kendali Admin");
  await expect(page.locator(".eyebrow")).toContainText("CONTROL CENTER 2.0");
  await expect(page.locator('link[href*="admin-dashboard-v2.css"]')).toHaveCount(1);

  const tokens = await page.locator("body").evaluate(el => {
    const style = getComputedStyle(el);
    return {
      void: style.getPropertyValue("--sr-color-void").trim(),
      accent: style.getPropertyValue("--sr-color-gold-bright").trim()
    };
  });
  expect(tokens.void).toBe("#071225");
  expect(tokens.accent).toBe("#a8d2ff");

  const activeTab = await page.locator("#adminTabRingkasan").evaluate(el => getComputedStyle(el).backgroundImage);
  expect(activeTab).toContain("linear-gradient");
});

test("navigasi tab dashboard tetap lengkap dan terhubung ke panel yang sesuai", async ({ page }) => {
  await page.route("**/*.js*", route => route.abort());
  await page.goto("/admin/dashboard.html", { waitUntil: "domcontentloaded" });

  for (const tab of ["ringkasan", "pesanan", "pengguna", "pesan", "maintenance", "log"]) {
    await expect(page.locator("#adminTab" + tab[0].toUpperCase() + tab.slice(1))).toHaveAttribute("aria-controls", "tab-" + tab);
    await expect(page.locator("#tab-" + tab)).toHaveAttribute("role", "tabpanel");
  }
});

test("dashboard menyediakan kontrol refresh yang jelas dan timestamp pembaruan", async ({ page }) => {
  await page.route("**/*.js*", route => route.abort());
  await page.goto("/admin/dashboard.html", { waitUntil: "domcontentloaded" });

  const refresh = page.getByRole("button", { name: "↻ Perbarui data" });
  await expect(refresh).toBeVisible();
  await expect(refresh).toHaveAttribute("aria-controls", "dashboardContent");
  await expect(page.locator("#lastUpdated")).toContainText("Belum dimuat");
});
