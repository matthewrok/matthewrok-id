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
            options: { emailRedirectTo: window.location.origin + "/email-confirmed.html" }
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
      button.textContent = visible ? "SEMBUNYIKAN" : "LIHAT";
      button.setAttribute("aria-label", visible ? "Sembunyikan password" : "Tampilkan password");
    });
  });

  if (!client) {
    showMessage("Koneksi autentikasi belum tersedia. Periksa koneksi internet lalu muat ulang halaman.", "error");
    return;
  }

  if (loginForm) {
    const savedEmail = localStorage.getItem("matthewRememberedEmail");
    const emailField = document.getElementById("loginEmail");
    const rememberField = document.getElementById("rememberMe");
    if (savedEmail && emailField) { emailField.value = savedEmail; if (rememberField) rememberField.checked = true; }
    // Keep the login page visible even when a member session already exists.
    loginForm.addEventListener("submit", async event => {
      event.preventDefault(); showMessage(""); hideResendButton(); setBusy(loginForm, true, "MEMERIKSA AKUN...");
      const email = emailField.value.trim();
      const password = document.getElementById("loginPassword").value;
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: currentUser } = await client.auth.getUser();
        const { data: memberProfile, error: statusError } = await client.from("profiles").select("account_status").eq("id", currentUser.user.id).maybeSingle();
        if (statusError) throw statusError;
        if (memberProfile?.account_status === "suspended") { await client.auth.signOut(); throw new Error("Akun kamu sedang ditangguhkan oleh admin. Hubungi Matthew untuk bantuan."); }
        sessionStorage.removeItem("matthewVisitorName");
        if (rememberField?.checked) localStorage.setItem("matthewRememberedEmail", email);
        else localStorage.removeItem("matthewRememberedEmail");
        showMessage("Login berhasil. Membuka kerajaan...", "success");
        window.location.assign("member-dashboard.html");
      } catch (error) {
        showMessage(error.message || "Login gagal. Periksa kembali email dan password.", "error");
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
          redirectTo: window.location.origin + "/reset-password.html"
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
        sessionStorage.setItem("matthewVisitorName", visitorName);
        showMessage("Berhasil masuk sebagai tamu. Mengalihkan...", "success");
        window.location.assign("index.html");
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
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/email-confirmed.html" } });
        if (error) throw error;
        if (data.session) await client.auth.signOut({ scope: "local" });
        showMessage("Pendaftaran berhasil. Buka Gmail dan klik tombol verifikasi. Setelah email terverifikasi, kembali ke halaman login dan masuk secara manual.", "success");
        registerForm.reset();
        setBusy(registerForm, false, "BUAT AKUN");
      } catch (error) { showMessage(friendlyAuthError(error), "error"); setBusy(registerForm, false, "BUAT AKUN"); }
    });
  }
  if (location.search.includes("reason=timeout")) showMessage("Sesi berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.", "error");
});