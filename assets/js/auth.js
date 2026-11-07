document.addEventListener("DOMContentLoaded", () => {
  const client = window.supabaseClient;
  const message = document.getElementById("authMessage");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const visitorForm = document.getElementById("visitorForm");
  const forgotForm = document.getElementById("forgotPasswordForm");
  const resetForm = document.getElementById("resetPasswordForm");

  document.querySelectorAll("[data-current-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
  function showMessage(text, type = "") {
    if (!message) return;
    message.textContent = text;
    message.className = "auth-message" + (type ? " " + type : "");
  }
  function friendlyAuthError(error) {
    const raw = String(error?.message || "").toLowerCase();
    if (raw.includes("email not confirmed") || raw.includes("email_not_confirmed")) return "Email kamu belum diverifikasi. Buka Gmail dan klik link verifikasi, atau kirim ulang link di bawah.";
    if (raw.includes("invalid login credentials")) return "Email atau password salah. Periksa kembali data login kamu.";
    if (raw.includes("user already registered")) return "Email ini sudah terdaftar. Coba login atau gunakan fitur lupa kata sandi.";
    if (raw.includes("password should be") || raw.includes("password must")) return "Password belum memenuhi ketentuan. Gunakan minimal 6 karakter.";
    if (raw.includes("rate limit") || raw.includes("too many requests")) return "Terlalu banyak permintaan. Tunggu beberapa menit sebelum mencoba lagi.";
    if (raw.includes("network") || raw.includes("fetch")) return "Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.";
    return error?.message || "Terjadi kesalahan. Silakan coba lagi.";
  }

  let resendButton;
  function showResendButton(email) {
    if (!message || !email) return;
    if (!resendButton) {
      resendButton = document.createElement("button");
      resendButton.type = "button";
      resendButton.className = "auth-resend-button";
      resendButton.textContent = "KIRIM ULANG EMAIL VERIFIKASI";
      resendButton.addEventListener("click", async () => {
        resendButton.disabled = true;
        resendButton.textContent = "MENGIRIM...";
        try {
          const { error } = await client.auth.resend({
            type: "signup",
            email: resendButton.dataset.email,
            options: { emailRedirectTo: window.location.origin + "/email-confirmed/" }
          });
          if (error) throw error;
          showMessage("Jika akun tersebut menunggu verifikasi, link baru telah dikirim. Periksa Gmail, termasuk folder Spam.", "success");
        } catch (error) {
          showMessage(friendlyAuthError(error), "error");
        } finally {
          resendButton.disabled = false;
          resendButton.textContent = "KIRIM ULANG EMAIL VERIFIKASI";
        }
      });
      message.insertAdjacentElement("afterend", resendButton);
    }
    resendButton.dataset.email = email;
    resendButton.hidden = false;
  }
  function hideResendButton() {
    if (resendButton) resendButton.hidden = true;
  }

  function getStorage(storageName) {
    try {
      if (window && window[storageName]) return window[storageName];
      if (typeof globalThis !== "undefined" && globalThis[storageName]) return globalThis[storageName];
    } catch (error) {
      console.warn("[MATTHEW auth] Storage access unavailable:", error);
    }
    return null;
  }
  function safeStorageGet(storageName, key) {
    try {
      const storage = getStorage(storageName);
      return storage ? storage.getItem(key) : null;
    } catch (error) {
      console.warn("[MATTHEW auth] Storage read unavailable:", error);
      return null;
    }
  }
  function safeStorageSet(storageName, key, value) {
    try {
      const storage = getStorage(storageName);
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn("[MATTHEW auth] Storage write unavailable:", error);
      return false;
    }
  }
  function safeStorageRemove(storageName, key) {
    try {
      const storage = getStorage(storageName);
      if (storage) storage.removeItem(key);
    } catch (error) {
      console.warn("[MATTHEW auth] Storage cleanup unavailable:", error);
    }
  }

  function setBusy(form, busy, label) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (busy) { button.dataset.originalText = button.textContent; button.disabled = true; button.textContent = label; }
    else { button.disabled = false; button.textContent = button.dataset.originalText || label; }
  }

  document.querySelectorAll("[data-toggle-password]").forEach(button => {
    button.addEventListener("click", () => {
      const field = document.getElementById(button.dataset.togglePassword);
      if (!field) return;
      const visible = field.type === "password";
      field.type = visible ? "text" : "password";
      button.innerHTML = visible
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.9A10.8 10.8 0 0 1 12 5.8c6.4 0 9.8 6.2 9.8 6.2a16 16 0 0 1-3.1 3.7M6.2 6.2C3.6 8 2.2 12 2.2 12s3.4 6.2 9.8 6.2c1.1 0 2.1-.2 3-.5"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12s3.4-6.2 9.8-6.2 9.8 6.2 9.8 6.2-3.4 6.2-9.8 6.2S2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>';
      button.setAttribute("aria-label", visible ? "Sembunyikan password" : "Tampilkan password");
      button.setAttribute("aria-pressed", visible ? "true" : "false");
    });
  });

  if (!client) {
    showMessage("Koneksi autentikasi belum tersedia. Periksa koneksi internet lalu muat ulang halaman.", "error");
    return;
  }

  if (loginForm) {
    const savedEmail = safeStorageGet("localStorage", "matthewRememberedEmail");
    const emailField = document.getElementById("email") || document.getElementById("loginEmail");
    const rememberField = document.getElementById("rememberMe");
    if (savedEmail && emailField) { emailField.value = savedEmail; if (rememberField) rememberField.checked = true; }
    // Keep the login page visible even when a member session already exists.
    loginForm.addEventListener("submit", async event => {
      event.preventDefault(); showMessage(""); hideResendButton(); setBusy(loginForm, true, "MEMERIKSA AKUN...");
      const email = emailField.value.trim();
      const passwordField = document.getElementById("password") || document.getElementById("loginPassword");
      const password = passwordField.value;
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: currentUser, error: userError } = await client.auth.getUser();
        if (userError || !currentUser?.user?.id) {
          await client.auth.signOut({ scope: "local" });
          throw userError || new Error("Sesi login tidak dapat diverifikasi. Silakan coba lagi.");
        }

        const { data: memberProfile, error: statusError } = await client
          .from("profiles")
          .select("account_status")
          .eq("id", currentUser.user.id)
          .maybeSingle();
        if (statusError) {
          await client.auth.signOut({ scope: "local" });
          throw statusError;
        }

        // Hanya akun dengan profil yang eksplisit berstatus active yang boleh melanjutkan.
        const accountStatus = String(memberProfile?.account_status || "").trim().toLowerCase();
        if (accountStatus !== "active") {
          await client.auth.signOut({ scope: "local" });
          throw new Error(
            accountStatus === "suspended"
              ? "Akun kamu sedang ditangguhkan oleh admin. Hubungi Matthew untuk bantuan."
              : "Akun belum aktif atau profilnya belum tersedia. Hubungi Matthew untuk bantuan."
          );
        }
        safeStorageRemove("sessionStorage", "matthewVisitorName");
        if (rememberField?.checked) safeStorageSet("localStorage", "matthewRememberedEmail", email);
        else safeStorageRemove("localStorage", "matthewRememberedEmail");
        showMessage("Login berhasil. Membuka kerajaan...", "success");
        // Setelah login, semua role diarahkan ke halaman utama MATTHEW JOKI.
        // Parameter ?next sengaja diabaikan agar login tidak membuka halaman worker/admin.
        window.location.replace("/");
      } catch (error) {
        showMessage(friendlyAuthError(error) || "Login gagal. Periksa kembali email dan password.", "error");
        if (/email not confirmed|email_not_confirmed/i.test(String(error?.message || ""))) showResendButton(email);
        setBusy(loginForm, false, "LOGIN");
      }
    });
  }


  if (forgotForm) {
    forgotForm.addEventListener("submit", async event => {
      event.preventDefault(); showMessage(""); setBusy(forgotForm, true, "MENGIRIM LINK...");
      const email = document.getElementById("resetEmail").value.trim();
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password/"
        });
        if (error) throw error;
        showMessage("Jika email terdaftar, link pemulihan telah dikirim. Periksa inbox dan folder spam.", "success");
        forgotForm.reset();
      } catch (error) {
        showMessage(friendlyAuthError(error), "error");
      }
      setBusy(forgotForm, false, "KIRIM LINK PEMULIHAN");
    });
  }

  if (resetForm) {
    let recoveryReady = false;
    const revealResetForm = () => {
      recoveryReady = true;
      showMessage("Link valid. Silakan buat password baru.", "success");
      resetForm.hidden = false;
    };
    client.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") revealResetForm();
    });
    // Recovery URL may establish a session before this listener is attached.
    client.auth.getSession().then(({ data }) => {
      if (data.session && (window.location.hash.includes("type=recovery") ||
          new URLSearchParams(window.location.search).get("type") === "recovery")) revealResetForm();
    });
    resetForm.addEventListener("submit", async event => {
      event.preventDefault(); showMessage("");
      if (!recoveryReady) {
        showMessage("Sesi pemulihan belum terdeteksi. Buka link terbaru dari email pemulihan.", "error");
        return;
      }
      const password = document.getElementById("newPassword").value;
      const confirm = document.getElementById("confirmPassword").value;
      if (password.length < 6) { showMessage("Password baru minimal 6 karakter.", "error"); return; }
      if (password !== confirm) { showMessage("Konfirmasi password tidak sama.", "error"); return; }
      setBusy(resetForm, true, "MENYIMPAN PASSWORD...");
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        showMessage("Password berhasil diperbarui. Silakan login kembali dengan password baru.", "success");
        await client.auth.signOut();
        resetForm.reset();
        resetForm.hidden = true;
        recoveryReady = false;
      } catch (error) {
        showMessage(friendlyAuthError(error) || "Password gagal diperbarui. Coba buka link terbaru dari email.", "error");
      }
      setBusy(resetForm, false, "SIMPAN PASSWORD BARU");
    });
    window.setTimeout(() => {
      if (!recoveryReady) showMessage("Buka halaman ini melalui link pemulihan yang dikirim ke email kamu.", "error");
    }, 1200);
  }

  if (visitorForm) {
    visitorForm.addEventListener("submit", async event => {
      event.preventDefault(); showMessage("");
      const input = document.getElementById("visitorName");
      const visitorName = input.value.trim().replace(/\s+/g, " ");
      if (visitorName.length < 2) { showMessage("Nama wajib diisi minimal 2 karakter.", "error"); return; }
      setBusy(visitorForm, true, "MENYIAPKAN AKSES TAMU...");
      try {
        const { error } = await client.from("visitor_logs").insert({ visitor_name: visitorName });
        if (error) throw error;
        safeStorageSet("sessionStorage", "matthewVisitorName", visitorName);
        showMessage("Berhasil masuk sebagai tamu. Mengalihkan...", "success");
        window.location.assign("/");
      } catch (error) {
        console.error("Visitor logging failed:", error);
        if (error && (error.code === "42P01" || error.code === "42501" || /visitor_logs|permission|policy|relation/i.test(error.message || ""))) {
          showMessage("Akses tamu belum siap dicatat oleh database. Admin perlu menjalankan supabase/visitor-logs-setup.sql di Supabase SQL Editor.", "error");
        } else {
          showMessage("Tidak dapat mencatat kunjungan. Periksa koneksi internet lalu coba lagi.", "error");
        }
        setBusy(visitorForm, false, "MASUK SEBAGAI TAMU");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async event => {
      event.preventDefault(); showMessage(""); setBusy(registerForm, true, "MEMBUAT AKUN...");
      const fullName = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;
      const confirmPassword = document.getElementById("registerConfirmPassword").value;
      if (password.length < 6) { showMessage("Password minimal 6 karakter.", "error"); setBusy(registerForm, false, "BUAT AKUN"); return; }
      if (password !== confirmPassword) { showMessage("Konfirmasi password tidak sama. Periksa kembali penulisannya.", "error"); setBusy(registerForm, false, "BUAT AKUN"); return; }
      try {
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/email-confirmed/" } });
        if (error) throw error;
        if (data.session) await client.auth.signOut({ scope: "local" });
        showMessage("Pendaftaran berhasil. Buka Gmail dan klik tombol verifikasi. Setelah email terverifikasi, kembali ke halaman login dan masuk secara manual. Jika email belum masuk, kamu bisa meminta link verifikasi baru di bawah.", "success");
        showResendButton(email);
        registerForm.reset();
        setBusy(registerForm, false, "BUAT AKUN");
      } catch (error) { showMessage(friendlyAuthError(error), "error"); setBusy(registerForm, false, "BUAT AKUN"); }
    });
  }
  if (location.search.includes("reason=timeout")) showMessage("Sesi berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.", "error");
});