const { test, expect } = require("@playwright/test");

async function openStaticHome(page, viewport) {
  await page.setViewportSize(viewport);
  // These checks validate the Shadow Reign markup and CSS without depending on
  // live Supabase/Auth state. Functional integrations are covered separately.
  await page.route("**/*.js*", route => route.abort());
  await page.route("https://**/*", route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#site").evaluate(el => el.classList.remove("hidden"));
}

test("homepage Shadow Reign menampilkan hero, produk, ulasan, FAQ, dan modal order", async ({ page }) => {
  await openStaticHome(page, { width: 390, height: 844 });

  await expect(page.locator("#hero-title")).toContainText("JOKI ROK");
  await expect(page.locator("#produk-joki .product-card")).toHaveCount(3);
  await expect(page.locator("#client-reviews .review-card")).toHaveCount(1);
  await expect(page.locator(".faq-item")).toHaveCount(2);
  await expect(page.locator("#jokiOrderModal")).toHaveCount(1);
  await expect(page.locator("#jokiOrderModal")).toBeHidden();
  await expect(page.locator(".bottom-nav .nav-item")).toHaveCount(4);
  await expect(page.locator("#floatingCs")).toBeVisible();
  await expect(page.locator("#about .about-card")).toBeVisible();
  await expect(page.locator("#produk-joki [data-order-product]")).toHaveCount(3);
});


test("homepage tidak memuat Global Menu lama dan shortcut layanan tetap tersedia", async ({ page }) => {
  await openStaticHome(page, { width: 390, height: 844 });

  await expect(page.locator("#menuToggle, #siteMenu")).toHaveCount(0);
  await expect(page.locator("#headerLoginBtn")).toHaveAttribute("href", "/login/");
  await expect(page.locator("#headerInboxBtn")).toHaveAttribute("href", "/inbox.html");
  await expect(page.locator("footer a[href='/support-matthew.html']")).toHaveText("Support Matthew");
  await expect(page.locator("footer a[href='/worker.html']")).toHaveText("Daftar Worker");
  await expect(page.locator(".bottom-nav #statusDot")).toHaveCount(1);
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1365, height: 900 }
]) {
  test("bottom navigation dan tombol CS tetap berada di dalam viewport (" + viewport.name + ")", async ({ page }) => {
    await openStaticHome(page, viewport);

    const nav = await page.locator(".bottom-nav").boundingBox();
    const cs = await page.locator("#floatingCs").boundingBox();
    expect(nav).not.toBeNull();
    expect(cs).not.toBeNull();

    expect(nav.x).toBeGreaterThanOrEqual(0);
    expect(nav.x + nav.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(nav.y).toBeGreaterThanOrEqual(0);
    expect(nav.y + nav.height).toBeLessThanOrEqual(viewport.height + 1);

    // The WhatsApp CS control is intentionally nested inside the bottom dock.
    expect(cs.x).toBeGreaterThanOrEqual(nav.x);
    expect(cs.x + cs.width).toBeLessThanOrEqual(nav.x + nav.width);
    expect(cs.y).toBeGreaterThanOrEqual(nav.y);
    expect(cs.y + cs.height).toBeLessThanOrEqual(nav.y + nav.height);
  });
}
