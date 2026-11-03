/* =========================================================
   MATTHEW JOKI — VISITOR ACCESS
   Visitor entry is separate from Supabase Auth sessions.
   ========================================================= */
(() => {
  "use strict";
  const app = window.HomeApp;
  if (!app?.db) return;

  const form = document.getElementById("homeVisitorForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("homeVisitorName");
    const button = document.getElementById("homeVisitorButton");
    const visitorName = (input?.value || "").trim().replace(/\s+/g, " ");

    if (visitorName.length < 2) {
      app.showMessage("Nama wajib diisi minimal 2 karakter.", "error");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "MENYIAPKAN AKSES...";
    }

    try {
      const { error } = await app.db.from("visitor_logs").insert({ visitor_name: visitorName });
      if (error) throw error;
      sessionStorage.setItem("matthewVisitorName", visitorName);
      localStorage.setItem("matthewLastActivity", String(Date.now()));
      app.showMessage("Akses visitor berhasil disiapkan.", "success");
      await app.showUser(null);
    } catch (error) {
      console.error("[Home] Visitor access error:", error);
      app.showMessage("Akses visitor belum dapat dicatat. Coba lagi beberapa saat.", "error");
      if (button) {
        button.disabled = false;
        button.textContent = "MASUK SEBAGAI TAMU";
      }
    }
  });
})();
