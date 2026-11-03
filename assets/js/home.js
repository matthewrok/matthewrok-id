/* =========================================================
   MATTHEW JOKI — HOMEPAGE CORE
   Shared state, profile rendering, admin data, and auth session.
   ========================================================= */
(() => {
  "use strict";

  const db = window.supabaseClient;
  const authScreen = document.getElementById("authScreen");
  const site = document.getElementById("site");
  const authMessage = document.getElementById("authMessage");

  if (!db) {
    if (authMessage) authMessage.textContent = "Layanan autentikasi belum siap. Muat ulang halaman.";
    console.error("[Home] Supabase client tidak ditemukan.");
    return;
  }

  const app = window.HomeApp = window.HomeApp || {};

  app.db = db;
  app.showMessage = (message, type = "") => {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = type;
  };

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("show");
          currentObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12 })
    : null;

  function observeRevealElements() {
    document.querySelectorAll(".reveal").forEach((element) => {
      if (observer) observer.observe(element);
      else element.classList.add("show");
    });
  }

  async function loadMembers() {
    const rows = document.getElementById("memberRows");
    const message = document.getElementById("memberMessage");
    if (!rows || !message) return;

    rows.replaceChildren();
    message.textContent = "Memuat data member...";

    const { data, error } = await db
      .from("profiles")
      .select("full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      message.textContent = "Gagal memuat data: " + error.message;
      return;
    }

    message.textContent = "Total akun: " + (data?.length || 0);
    (data || []).forEach((member) => {
      const row = document.createElement("tr");
      const values = [
        member.full_name || "Tanpa nama",
        member.role || "-",
        member.created_at ? new Date(member.created_at).toLocaleDateString("id-ID") : "-"
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      rows.appendChild(row);
    });
  }

  async function showUser(user) {
    const adminNavLink = document.getElementById("adminNavLink");
    const adminPanel = document.getElementById("adminPanel");

    if (adminNavLink) {
      adminNavLink.style.display = "none";
      adminNavLink.setAttribute("aria-hidden", "true");
    }

    if (!user) {
      const visitorName = sessionStorage.getItem("matthewVisitorName");
      app.currentIdentity = visitorName ? { name: visitorName, email: "", isVisitor: true } : null;
      if (visitorName) {
        authScreen?.classList.add("hidden");
        site?.classList.remove("hidden");
        const navUser = document.getElementById("navUser");
        if (navUser) navUser.textContent = "Tamu: " + visitorName;
        adminPanel?.classList.add("hidden");
        observeRevealElements();
        return;
      }
      authScreen?.classList.remove("hidden");
      site?.classList.add("hidden");
      return;
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      app.showMessage("Profil belum tersedia. Coba login kembali.", "error");
      await db.auth.signOut();
      return;
    }

    app.currentIdentity = { name: profile.full_name || user.email || "Client", email: user.email || "", isVisitor: false };
    authScreen?.classList.add("hidden");
    site?.classList.remove("hidden");

    const navUser = document.getElementById("navUser");
    if (navUser) {
      navUser.replaceChildren();
      const identity = document.createElement("span");
      identity.className = "nav-user-email";
      identity.textContent = user.email || profile.full_name || "Akun";
      navUser.appendChild(identity);

      const labels = {
        admin: "ADMIN", member: "MEMBER", SULTAN: "SULTAN",
        MATTHEW: "MATTHEW", PELANGGAN: "PELANGGAN"
      };
      const role = document.createElement("span");
      role.className = "nav-user-role" + (profile.role === "admin" ? " is-admin" : "");
      role.textContent = labels[profile.role] || String(profile.role || "MEMBER").toUpperCase();
      role.setAttribute("aria-label", "Role akun: " + role.textContent);
      navUser.appendChild(role);
    }

    if (profile.role === "admin") {
      if (adminNavLink) {
        adminNavLink.style.display = "flex";
        adminNavLink.setAttribute("aria-hidden", "false");
      }
      adminPanel?.classList.remove("hidden");
      await loadMembers();
    } else {
      adminPanel?.classList.add("hidden");
    }
    observeRevealElements();
  }

  app.showUser = showUser;
  app.loadMembers = loadMembers;

  document.getElementById("logout")?.addEventListener("click", async () => {
    if (sessionStorage.getItem("matthewVisitorName")) {
      sessionStorage.removeItem("matthewVisitorName");
      localStorage.removeItem("matthewLastActivity");
      window.location.replace("login.html");
      return;
    }
    const { error } = await db.auth.signOut();
    if (error) app.showMessage("Gagal logout: " + error.message, "error");
  });

  db.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    window.setTimeout(() => showUser(session?.user || null), 0);
  });

  (async () => {
    const { data, error } = await db.auth.getSession();
    if (error) {
      app.showMessage("Gagal memeriksa sesi login.", "error");
      return;
    }
    await showUser(data?.session?.user || null);
  })();
})();
