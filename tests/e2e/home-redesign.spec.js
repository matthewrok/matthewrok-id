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
  await expect(page.locator("#floatingPaymentProof")).toBeVisible();
  await expect(page.locator("#about .about-card")).toBeVisible();
  await expect(page.locator("#produk-joki [data-order-product]")).toHaveCount(3);
});


test("homepage tidak memuat Global Menu lama dan shortcut layanan tetap tersedia", async ({ page }) => {
  await openStaticHome(page, { width: 390, height: 844 });

  await expect(page.locator("#menuToggle, #siteMenu")).toHaveCount(0);
  await expect(page.locator("#headerLoginBtn")).toHaveAttribute("href", "/login/");
  const paymentProofLink = page.locator("#headerInboxBtn");
  await expect(paymentProofLink).toHaveAttribute("href", "/inbox.html");
  await expect(paymentProofLink).toHaveAttribute("aria-label", "Buka Inbox");
  await expect(paymentProofLink).toHaveAttribute("title", "Inbox");
  await expect(paymentProofLink.locator("svg")).toHaveCount(1);
  const centerProof = page.locator("#floatingPaymentProof");
  await expect(centerProof).toHaveAttribute("href", "/testimonials.html");
  await expect(centerProof).toHaveAttribute("aria-label", "Buka Bukti Pembayaran dan Testimoni");
  await expect(centerProof.locator("svg")).toHaveCount(1);
  await expect(page.locator("#adminNavLink")).toHaveCount(0);
  await expect(page.locator("#toolsMenu > summary")).toHaveCSS("align-items", "center");
  await expect(page.locator("footer a[href='/worker.html']")).toHaveText("Daftar Worker");
  await expect(page.locator(".bottom-nav #statusDot")).toHaveCount(1);
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1365, height: 900 }
]) {
  test("bottom navigation dan tombol Bukti Pembayaran tetap berada di dalam viewport (" + viewport.name + ")", async ({ page }) => {
    await openStaticHome(page, viewport);

    const nav = await page.locator(".bottom-nav").boundingBox();
    const cs = await page.locator("#floatingPaymentProof").boundingBox();
    expect(nav).not.toBeNull();
    expect(cs).not.toBeNull();

    expect(nav.x).toBeGreaterThanOrEqual(0);
    expect(nav.x + nav.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(nav.y).toBeGreaterThanOrEqual(0);
    expect(nav.y + nav.height).toBeLessThanOrEqual(viewport.height + 1);

    // The payment-proof shortcut is intentionally nested inside the bottom dock.
    expect(cs.x).toBeGreaterThanOrEqual(nav.x);
    expect(cs.x + cs.width).toBeLessThanOrEqual(nav.x + nav.width);
    expect(cs.y).toBeGreaterThanOrEqual(nav.y);
    expect(cs.y + cs.height).toBeLessThanOrEqual(nav.y + nav.height);
  });
}

test("global popup menu dihapus dan tautan layanan tetap tersedia", async ({ page, request }) => {
  await openStaticHome(page, { width: 390, height: 844 });

  await expect(page.locator("#siteMenu, #menuToggle")).toHaveCount(0);
  await expect(page.locator("footer a[href='/worker.html']")).toHaveText("Daftar Worker");
  await expect(page.locator("footer a[href='/support-matthew.html']")).toHaveCount(0);

  const dashboardResponse = await request.get("/member-dashboard.html");
  expect(dashboardResponse.ok()).toBeTruthy();
  const dashboardHtml = await dashboardResponse.text();
  expect(dashboardHtml).not.toMatch(/id=["'](?:siteMenu|menuToggle)["']/i);
  expect(dashboardHtml).not.toMatch(/global-menu\.(?:js|css)/i);
  expect(dashboardHtml).not.toContain("support-matthew.html");
  expect(dashboardHtml).not.toContain('href="/worker.html"');
  expect(dashboardHtml).toContain('id="logoutBtn"');
  expect(dashboardHtml).toContain('id="adminDashboardBtn" href="/admin/dashboard.html" hidden');
  expect(dashboardHtml).toContain("if (adminDashboardBtn) adminDashboardBtn.hidden = normalizedRole !== 'admin'");
});

test("tidak ada halaman HTML yang masih memuat Global Menu", async ({ request }) => {
  const pages = [
    "/404.html", "/admin/dashboard.html", "/admin/joki-progress.html",
    "/calculator-resource.html", "/email-confirmed.html", "/email-confirmed/",
    "/inbox.html", "/", "/joki-matthew.html", "/login.html", "/login/",
    "/maintenance.html", "/member-dashboard.html", "/register.html", "/register/",
    "/requirements-city-hall.html", "/reset-password.html", "/reset-password/",
    "/worker.html", "/your-order.html"
  ];

  for (const path of pages) {
    const response = await request.get(path);
    expect(response.ok(), path + " harus dapat diakses").toBeTruthy();
    const html = await response.text();
    expect(html, path + " tidak boleh memuat elemen Global Menu").not.toMatch(/id=["'](?:siteMenu|menuToggle)["']/i);
    expect(html, path + " tidak boleh memuat asset Global Menu").not.toMatch(/global-menu\.(?:js|css)/i);
  }
});
