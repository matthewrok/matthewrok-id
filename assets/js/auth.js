document.addEventListener("DOMContentLoaded", () => {
  const client = window.supabaseClient;
  const message = document.getElementById("authMessage");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  document.querySelectorAll("[data-current-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  function showMessage(text, type = "") {
    if (!message) return;
    message.textContent = text;
    message.className = "auth-message" + (type ? " " + type : "");
  }

  function setBusy(form, busy, label) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || label;
    }
  }

  if (!client) {
    showMessage("Koneksi autentikasi belum tersedia. Muat ulang halaman atau hubungi admin.", "error");
    return;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      showMessage("");
      setBusy(loginForm, true, "SEDANG LOGIN...");
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showMessage("Login berhasil. Mengalihkan ke beranda...", "success");
        window.location.assign("index.html");
      } catch (error) {
        showMessage(error.message || "Login gagal. Periksa email dan password.", "error");
        setBusy(loginForm, false, "MASUK KE KERAJAAN");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async event => {
      event.preventDefault();
      showMessage("");
      setBusy(registerForm, true, "MEMBUAT AKUN...");
      const fullName = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + "/index.html"
          }
        });
        if (error) throw error;
        if (data.session) {
          showMessage("Pendaftaran berhasil. Mengalihkan ke beranda...", "success");
          window.location.assign("index.html");
        } else {
          showMessage("Pendaftaran berhasil. Silakan cek email untuk konfirmasi sebelum login.", "success");
          registerForm.reset();
          setBusy(registerForm, false, "BUAT AKUN");
        }
      } catch (error) {
        showMessage(error.message || "Pendaftaran gagal. Coba lagi.", "error");
        setBusy(registerForm, false, "BUAT AKUN");
      }
    });
  }
});
