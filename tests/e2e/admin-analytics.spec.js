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

test("Admin Analytics memuat semua halaman hingga batas aman dan menghitung KPI dari seluruh baris yang dimuat", async ({ page }) => {
  await page.setContent(`
    <strong id="analyticsRevenue"></strong><strong id="analyticsAverage"></strong>
    <strong id="analyticsDiscount"></strong><strong id="analyticsQuantity"></strong>
    <div id="analyticsOrdersChart"></div><div id="analyticsVisitorsChart"></div>
    <p id="analyticsUpdated"></p>
  `);
  await page.addScriptTag({ path: "assets/js/admin-analytics.js" });
  const result = await page.evaluate(async () => {
    const now = new Date().toISOString();
    const orders = Array.from({ length: 1001 }, () => ({
      status: "Selesai", total_price: 1000, discount_amount: 100, quantity: 1, created_at: now
    }));
    const visitors = [{ visited_at: now }];
    const ranges = [];
    const client = {
      from(table) {
        const builder = {
          select() { return this; },
          order() { return this; },
          range(start, end) {
            ranges.push({ table, start, end });
            const source = table === "joki_progress" ? orders : visitors;
            return Promise.resolve({ data: source.slice(start, end + 1), error: null });
          }
        };
        return builder;
      }
    };
    await window.refreshAdminAnalytics(client);
    return {
      ranges,
      revenue: document.getElementById("analyticsRevenue").textContent,
      quantity: document.getElementById("analyticsQuantity").textContent,
      orderBars: [...document.querySelectorAll("#analyticsOrdersChart .analytics-bar-item strong")].map(node => node.textContent),
      status: document.getElementById("analyticsUpdated").textContent
    };
  });
  expect(result.ranges.filter(item => item.table === "joki_progress")).toEqual([
    { table: "joki_progress", start: 0, end: 999 },
    { table: "joki_progress", start: 1000, end: 1999 }
  ]);
  expect(result.revenue).toContain("1.001.000");
  expect(result.quantity).toBe("1.001");
  expect(result.orderBars.reduce((sum, value) => sum + Number(value.replace(/\./g, "")), 0)).toBe(1001);
  expect(result.status).toContain("Seluruh riwayat yang tersedia telah dimuat");
});

test("tema dashboard menerapkan seluruh design token biru tanpa escape newline yang rusak", async ({ page }) => {
  await page.goto("/admin/dashboard.html", { waitUntil: "domcontentloaded" });
  const cssResponse = await page.request.get("/assets/css/admin-dashboard-v2.css");
  expect(cssResponse.ok()).toBeTruthy();
  expect(await cssResponse.text()).not.toContain("\\n");
  const tokens = await page.locator("body").evaluate(node => {
    const style = getComputedStyle(node);
    return {
      border: style.getPropertyValue("--sr-color-border").trim(),
      text: style.getPropertyValue("--sr-color-text").trim(),
      accent: style.getPropertyValue("--sr-color-gold-bright").trim()
    };
  });
  expect(tokens.border).toBe("rgba(91,153,255,.2)");
  expect(tokens.text).toBe("#edf5ff");
  expect(tokens.accent).toBe("#a8d2ff");
});

