const { test, expect } = require("@playwright/test");

test("registration Shadow Reign mempertahankan seluruh ID autentikasi dan navigasi login", async ({ page }) => {
  await page.route("**/*.js*", route => route.abort());
  await page.goto("/register/", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".form-card")).toBeVisible();
  await expect(page.locator(".logo-wrapper .form-logo")).toBeVisible();
  await expect(page.locator(".form-title")).toHaveText("BUAT AKUN.");
  await expect(page.locator("#registerForm")).toBeVisible();
  for (const id of ["nama", "email", "password", "confirm-password"]) {
    await expect(page.locator("#" + id)).toBeVisible();
  }
  await expect(page.locator("#error-message")).toHaveCount(1);
  await expect(page.locator(".form-footer a[href='/login/']")).toHaveText("Login di sini");
  await expect(page.locator(".back-link")).toHaveCount(0);
  await expect(page.locator("link[href*='family=Cinzel']")).toHaveCount(1);
  await expect(page.locator("link[href*='family=Inter']")).toHaveCount(1);
});

test("auth.js mendukung ID register Shadow Reign tanpa menghilangkan ID lama", async ({ request }) => {
  const response = await request.get("/assets/js/auth.js?v=20261108-register-shadow-reign");
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  expect(source).toContain('document.getElementById("nama") || document.getElementById("registerName")');
  expect(source).toContain('document.getElementById("email") || document.getElementById("registerEmail")');
  expect(source).toContain('document.getElementById("password") || document.getElementById("registerPassword")');
  expect(source).toContain('document.getElementById("confirm-password") || document.getElementById("registerConfirmPassword")');
  expect(source).toContain('registerForm.addEventListener("submit"');
});


test("pesan sukses dan error autentikasi tampil pada area status yang terlihat", async ({ page }) => {
  await page.route("**/*.js*", route => route.abort());
  await page.goto("/register/", { waitUntil: "domcontentloaded" });

  const source = page.locator("#authMessage");
  const visibleStatus = page.locator("#error-message");
  await source.evaluate(el => {
    el.textContent = "Pendaftaran berhasil. Periksa email kamu.";
    el.className = "auth-message success";
  });
  await expect(visibleStatus).toBeVisible();
  await expect(visibleStatus).toHaveText("Pendaftaran berhasil. Periksa email kamu.");
  await expect(visibleStatus).toHaveClass(/status-success/);

  await source.evaluate(el => {
    el.textContent = "Password tidak sesuai.";
    el.className = "auth-message error";
  });
  await expect(visibleStatus).toHaveText("Password tidak sesuai.");
  await expect(visibleStatus).toHaveClass(/status-error/);
});



test("registrasi menolak email terverifikasi tanpa menampilkan alur verifikasi ulang", async ({ request }) => {
  const response = await request.get("/assets/js/auth.js?v=20261109-verified-email-guard");
  expect(response.ok()).toBeTruthy();
  const source = await response.text();
  expect(source).toContain("Array.isArray(data?.user?.identities) && data.user.identities.length === 0");
  expect(source).toContain("Gmail Sudah Di Gunakan, Harap menggunakan gmail lain.");
  expect(source).toContain("hideResendButton();");
  expect(source).toContain("setBusy(registerForm, false, \"BUAT AKUN\");");
});
