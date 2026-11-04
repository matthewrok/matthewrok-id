(() => {
  const init = () => {
    if (document.querySelector(".global-menu")) return;
    const root = document.createElement("div");
    root.className = "global-menu";
    root.innerHTML = `
      <a class="global-inbox-trigger" href="/inbox.html" aria-label="Buka Inbox Matthew" title="Inbox Matthew"><svg class="global-inbox-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2.2"></rect><path d="m4.2 7 7.8 6 7.8-6"></path></svg><span class="global-inbox-label">Inbox Matthew</span><span class="global-inbox-badge" aria-hidden="true" hidden></span></a>
      <button class="global-menu-trigger" type="button" aria-label="Buka menu navigasi" aria-expanded="false" aria-controls="globalMenuPanel">⋮</button>
      <nav class="global-menu-panel" id="globalMenuPanel" aria-label="Navigasi website" inert>
        <div class="global-menu-heading"><strong>MATTHEW JOKI</strong><span>DRAGON KINGDOM · NAVIGASI</span></div>
        <a href="/index.html"><span class="global-menu-icon">⌂</span>Beranda · Kenali Matthew</a>
        <a href="/calculator-resource.html"><span class="global-menu-icon">⚖</span>Calculator Resource</a>
        <a href="/requirements-city-hall.html"><span class="global-menu-icon">♜</span>Requirements City Hall</a>
        <a href="/joki-matthew.html"><span class="global-menu-icon">♛</span>Lacak Progress</a>
        <a href="/support-matthew.html"><span class="global-menu-icon">♡</span>Support Matthew</a>
        <a href="/worker.html"><span class="global-menu-icon">♟</span>Daftar Worker</a>
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

    // Hide both floating controls while the order dialog is visible.
    // Use JS as well as CSS so this remains reliable across cached stylesheets.
    const orderModal = document.getElementById("jokiOrderModal");
    const syncOrderModalVisibility = () => {
      const orderOpen = Boolean(orderModal && !orderModal.classList.contains("hidden"));
      const authGateVisible = (authScreen && !authScreen.classList.contains("hidden")) || Boolean(loginForm);
      const shouldHide = orderOpen || authGateVisible;
      root.style.setProperty("display", shouldHide ? "none" : "");
      root.setAttribute("aria-hidden", shouldHide ? "true" : "false");
      if (shouldHide) {
        const menuButton = root.querySelector(".global-menu-trigger");
        const menuPanel = root.querySelector(".global-menu-panel");
        menuButton?.setAttribute("aria-expanded", "false");
        menuPanel?.classList.remove("is-open");
        menuPanel?.setAttribute("inert", "");
      }
    };
    syncOrderModalVisibility();
    const visibilityObserver = new MutationObserver(syncOrderModalVisibility);
    if (authScreen) {
      visibilityObserver.observe(authScreen, {
        attributes: true,
        attributeFilter: ["class", "hidden", "style"]
      });
    }
    if (orderModal) {
      visibilityObserver.observe(orderModal, {
        attributes: true,
        attributeFilter: ["class", "hidden", "style"]
      });
    }
    visibilityObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });
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
        // Show a red dot while this account has at least one unread Inbox message.
        const inboxLink = root.querySelector(".global-inbox-trigger");
        const inboxBadge = root.querySelector(".global-inbox-badge");
        const syncUnreadInbox = async () => {
          try {
            const { count, error } = await client.from("inbox_recipients")
              .select("message_id", { count: "exact", head: true })
              .eq("user_id", user.id).is("read_at", null);
            if (error) throw error;
            inboxBadge.hidden = !(count > 0);
            inboxLink.setAttribute("aria-label", count > 0 ? "Buka Inbox Matthew — ada pesan belum dibaca" : "Buka Inbox Matthew");
            inboxLink.title = count > 0 ? "Inbox Matthew — ada pesan belum dibaca" : "Inbox Matthew";
          } catch (error) {
            // Keep the icon usable if unread counts are temporarily unavailable.
            console.warn("Status pesan Inbox tidak dapat dimuat.", error);
          }
        };
        await syncUnreadInbox();
        // Poll as a fallback for pages/browsers where realtime delivery is unavailable.
        const unreadPoll = window.setInterval(syncUnreadInbox, 30000);
        window.addEventListener("pagehide", () => window.clearInterval(unreadPoll), { once: true });
        try {
          const channel = client.channel("global-inbox-unread-" + user.id)
            .on("postgres_changes", { event: "*", schema: "public", table: "inbox_recipients", filter: "user_id=eq." + user.id }, syncUnreadInbox)
            .subscribe();
          window.addEventListener("pagehide", () => client.removeChannel(channel), { once: true });
        } catch (error) { console.warn("Pembaruan Inbox realtime tidak tersedia.", error); }
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