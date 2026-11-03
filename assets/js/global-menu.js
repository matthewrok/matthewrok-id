(() => {
  const init = () => {
    if (document.querySelector(".global-menu")) return;
    const root = document.createElement("div");
    root.className = "global-menu";
    root.innerHTML = `
      <button class="global-menu-trigger" type="button" aria-label="Buka menu navigasi" aria-expanded="false" aria-controls="globalMenuPanel">⋮</button>
      <nav class="global-menu-panel" id="globalMenuPanel" aria-label="Navigasi website" inert>
        <div class="global-menu-heading"><strong>MATTHEW JOKI</strong><span>DRAGON KINGDOM · NAVIGASI</span></div>
        <a href="/index.html"><span class="global-menu-icon">⌂</span>Beranda · Kenali Matthew</a>
        <a href="/calculator-resource.html"><span class="global-menu-icon">⚖</span>Calculator Resource</a>
        <a href="/requirements-city-hall.html"><span class="global-menu-icon">♜</span>Requirements City Hall</a>
        <a href="/joki-matthew.html"><span class="global-menu-icon">♛</span>Lacak Progress</a>
        <a href="/support-matthew.html"><span class="global-menu-icon">♡</span>Support Matthew</a>
        <a href="/worker.html"><span class="global-menu-icon">♟</span>Daftar Worker</a>
        <a href="/inbox.html"><span class="global-menu-icon">✉</span>Inbox Matthew</a>
        <div class="global-menu-divider"></div>
        <a href="/login.html"><span class="global-menu-icon">↪</span>Login Member / Visitor</a>
        <a href="/register.html"><span class="global-menu-icon">＋</span>Daftar Akun</a>
        <a href="/reset-password.html"><span class="global-menu-icon">⌑</span>Lupa Kata Sandi</a>
        <a href="/admin/dashboard.html" data-admin-link hidden><span class="global-menu-icon">♜</span>Admin Dashboard</a>
        <a href="/admin/joki-progress.html" data-admin-link hidden><span class="global-menu-icon">✓</span>Kelola Progres Client</a>
        <div class="global-menu-divider"></div>
        <a class="global-menu-account" href="/login.html" data-account-link>Masuk untuk mengakses akun</a>
      </nav>`;
    document.body.appendChild(root);

    // Do not show the global three-dot menu while the homepage login/visitor gate is visible.
    const authScreen = document.getElementById("authScreen");
    const loginForm = document.getElementById("loginForm");
    const syncAuthMenuVisibility = () => {
      const authGateVisible = (authScreen && !authScreen.classList.contains("hidden")) || Boolean(loginForm);
      root.style.setProperty("display", authGateVisible ? "none" : "");
      root.setAttribute("aria-hidden", authGateVisible ? "true" : "false");
    };
    syncAuthMenuVisibility();
    if (authScreen) {
      new MutationObserver(syncAuthMenuVisibility).observe(authScreen, {
        attributes: true,
        attributeFilter: ["class", "hidden", "style"]
      });
    }
    const button = root.querySelector(".global-menu-trigger");
    const panel = root.querySelector(".global-menu-panel");
    const close = () => {
      button.setAttribute("aria-expanded", "false");
      panel.classList.remove("is-open");
      panel.setAttribute("inert", "");
    };
    const open = () => {
      button.setAttribute("aria-expanded", "true");
      panel.classList.add("is-open");
      panel.removeAttribute("inert");
    };
    button.addEventListener("click", () => button.getAttribute("aria-expanded") === "true" ? close() : open());
    document.addEventListener("click", event => { if (!root.contains(event.target)) close(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") { close(); button.focus(); } });
    panel.querySelectorAll("a").forEach(link => link.addEventListener("click", close));

    const client = window.supabaseClient;
    if (client && client.auth) {
      client.auth.getSession().then(async ({data}) => {
        const user = data?.session?.user;
        if (!user) return;
        panel.querySelector('[data-account-link]').textContent = user.email || "Akun aktif";
        panel.querySelector('[data-account-link]').href = "#";
        panel.querySelector('[data-account-link]').addEventListener("click", async event => {
          event.preventDefault();
          if (confirm("Keluar dari akun ini?")) {
            await client.auth.signOut();
            location.href = "/login.html";
          }
        });
        try {
          const {data: profile} = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
          if (profile?.role === "admin") panel.querySelectorAll("[data-admin-link]").forEach(link => link.hidden = false);
        } catch (error) { console.warn("Peran akun tidak dapat dimuat untuk menu.", error); }
      }).catch(error => console.warn("Sesi akun tidak dapat dimuat untuk menu.", error));
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();