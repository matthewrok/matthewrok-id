/* =========================================================
   MATTHEW JOKI — HOMEPAGE AUTHENTICATION
   Login, registration, and verification-email resend.
   ========================================================= */
(() => {
  "use strict";
  const app = window.HomeApp;
  if (!app?.db) return;

  const { db, showMessage } = app;
  const form = document.getElementById("authForm");
  const nameField = document.getElementById("nameField");
  const fullName = document.getElementById("fullName");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const confirmPasswordField = document.getElementById("confirmPasswordField");
  const submitButton = document.getElementById("submitButton");
  const switchMode = document.getElementById("switchMode");
  const switchText = document.getElementById("switchText");
  const message = document.getElementById("authMessage");
  if (!form || !submitButton || !email || !password) return;

  let mode = "login";
  let resendButton = null;

  function setMode(nextMode) {
    mode = nextMode;
    nameField?.classList.toggle("hidden", mode !== "register");
    if (fullName) {
      fullName.required = mode === "register";
      fullName.autocomplete = "name";
    }
    password.autocomplete = mode === "login" ? "current-password" : "new-password";
    if (confirmPasswordField) confirmPasswordField.classList.toggle("hidden", mode !== "register");
    if (confirmPassword) { confirmPassword.required = mode === "register"; confirmPassword.autocomplete = "new-password"; }
    submitButton.textContent = mode === "login" ? "LOGIN" : "CREATE ACCOUNT";
    if (switchText) switchText.textContent = mode === "login" ? "Belum punya akun?" : "Sudah punya akun?";
    if (switchMode) switchMode.textContent = mode === "login" ? "Daftar sekarang" : "Login";
    showMessage("");
    if (resendButton) resendButton.hidden = true;
  }

  function showResendVerification(address) {
    if (!message || !address) return;
    if (!resendButton) {
      resendButton = document.createElement("button");
      resendButton.type = "button";
      resendButton.className = "auth-resend-button";
      resendButton.textContent = "KIRIM ULANG EMAIL VERIFIKASI";
      message.insertAdjacentElement("afterend", resendButton);
      resendButton.addEventListener("click", async () => {
        resendButton.disabled = true;
        resendButton.textContent = "MENGIRIM...";
        try {
          const { error } = await db.auth.resend({
            type: "signup",
            email: resendButton.dataset.email,
            options: { emailRedirectTo: "https://matthewrok.my.id/email-confirmed.html" }
          });
          if (error) throw error;
          showMessage("Jika akun menunggu verifikasi, link baru telah dikirim. Periksa Gmail dan folder Spam.", "success");
        } catch (error) {
          showMessage(error.message || "Link verifikasi gagal dikirim. Coba lagi beberapa menit.", "error");
        } finally {
          resendButton.disabled = false;
          resendButton.textContent = "KIRIM ULANG EMAIL VERIFIKASI";
        }
      });
    }
    resendButton.dataset.email = address;
    resendButton.hidden = false;
  }

  switchMode?.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = "PLEASE WAIT...";
    showMessage("");
    if (resendButton) resendButton.hidden = true;

    try {
      if (mode === "register") {
        if (password.value.length < 6) throw new Error("Password minimal 6 karakter.");
        if (password.value !== confirmPassword?.value) throw new Error("Konfirmasi password tidak sama. Periksa kembali penulisannya.");
        const { data, error } = await db.auth.signUp({
          email: email.value.trim(),
          password: password.value,
          options: {
            data: { full_name: fullName?.value.trim() || "" },
            emailRedirectTo: "https://matthewrok.my.id/email-confirmed.html"
          }
        });
        if (error) throw error;
        if (data.session) await db.auth.signOut({ scope: "local" });
        showMessage("Pendaftaran berhasil. Buka Gmail dan klik link verifikasi. Setelah terverifikasi, kembali ke halaman login dan masuk secara manual.", "success");
        showResendVerification(email.value.trim());
      } else {
        const { error } = await db.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });
        if (error) throw error;
        sessionStorage.removeItem("matthewVisitorName");
      }
    } catch (error) {
      showMessage(error.message || "Terjadi kesalahan.", "error");
      if (mode === "login" && String(error.message || "").toLowerCase().includes("email not confirmed")) {
        showResendVerification(email.value.trim());
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === "login" ? "LOGIN" : "CREATE ACCOUNT";
    }
  });
})();
