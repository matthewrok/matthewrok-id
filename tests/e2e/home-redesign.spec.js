const { test, expect } = require("@playwright/test");

async function openStaticHome(page, viewport) {
  await page.setViewportSize(viewport);
  // These checks target the delivered markup and CSS; auth/realtime behavior is
  // covered separately by the existing authentication regression workflow.
  await page.route("**/*.js*", route => route.abort());
  await page.route("https://**/*", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector("#site")?.classList.remove("hidden"));
  await page.waitForFunction(() => {
    const nav = document.querySelector(".app-bottom-nav");
    return nav && getComputedStyle(nav).position === "fixed";
  });
}

test("homepage App-like menampilkan hero, Bento Grid, produk, FAQ, dan modal order", async ({ page }) => {
  await openStaticHome(page, { width: 390, height: 844 });

  await expect(page.locator(".app-hero h1")).toContainText("JOKI ROK");
  await expect(page.locator(".app-bento-card")).toHaveCount(5);
  await expect(page.locator("#produk-joki .joki-product-card")).toHaveCount(3);
  await expect(page.locator(".app-faq details")).toHaveCount(4);
  await expect(page.locator("#jokiOrderModal")).toHaveCount(1);
  await expect(page.locator(".app-bottom-nav")).toBeVisible();
  await expect(page.locator(".app-auth-actions a")).toHaveCount(2);
  expect(await page.locator("#about").evaluate(el => el.compareDocumentPosition(document.querySelector("#client-reviews")) & Node.DOCUMENT_POSITION_PRECEDING)).toBeTruthy();

  await page.locator("#navUser").evaluate(el => { el.textContent = "Member E2E"; });
  await expect(page.locator(".app-auth-actions")).toBeHidden();

  const columns = await page.locator(".app-bento-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(2);
});

test("bottom navigation dan floating CS tidak saling menutupi di mobile", async ({ page }) => {
  await openStaticHome(page, { width: 390, height: 844 });
  const nav = await page.locator(".app-bottom-nav").boundingBox();
  const cs = await page.locator("#floatingCs").boundingBox();
  expect(nav).not.toBeNull();
  expect(cs).not.toBeNull();
  const overlap = nav.x < cs.x + cs.width && nav.x + nav.width > cs.x && nav.y < cs.y + cs.height && nav.y + nav.height > cs.y;
  expect(overlap).toBe(false);
});

test("desktop memakai Bento Grid empat kolom dan dock navigasi terpusat", async ({ page }) => {
  await openStaticHome(page, { width: 1365, height: 900 });
  const columns = await page.locator(".app-bento-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(4);

  const dock = await page.locator(".app-bottom-nav").boundingBox();
  expect(dock).not.toBeNull();
  expect(Math.abs((dock.x + dock.width / 2) - 682.5)).toBeLessThan(2);

  const cs = await page.locator("#floatingCs").boundingBox();
  expect(cs).not.toBeNull();
  const overlap = dock.x < cs.x + cs.width && dock.x + dock.width > cs.x && dock.y < cs.y + cs.height && dock.y + dock.height > cs.y;
  expect(overlap).toBe(false);
});
