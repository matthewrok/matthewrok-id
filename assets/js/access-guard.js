(() => {
  "use strict";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const roles = ["warga biasa", "warga tidak biasa", "warga sultan", "admin"];
  const rules = [
    { test: /^\/admin(?:\/|$)/i, roles: ["admin"] },
    { test: /^\/(?:member-dashboard|worker|inbox|your-order)[.]html$/i, roles }
  ];
  const rule = rules.find(item => item.test.test(path));
  if (!rule) return;

  document.documentElement.classList.add("access-pending");
  const conceal = document.createElement("style");
  conceal.textContent = "html.access-pending body{visibility:hidden!important}";
  (document.head || document.documentElement).appendChild(conceal);

  let attemptId = 0;
  let terminal = false;
  let retryPanel = null;
  const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const isTransient = error => {
    const message = String(error?.message || error || "").toLowerCase();
    const status = Number(error?.status || error?.statusCode || 0);
    return !status || status >= 500 || status === 408 || status === 429 ||
      /network|fetch|timeout|timed out|connection|temporar|load failed|failed to fetch/.test(message);
  };
  const redirectToLogin = () => {
    if (terminal) return;
    terminal = true;
    const next = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace("/login/?next=" + encodeURIComponent(next));
  };
  const showRetry = message => {
    document.documentElement.classList.add("access-pending");
    if (!retryPanel) {
      retryPanel = document.createElement("section");
      retryPanel.setAttribute("role", "alert");
      retryPanel.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;background:#071326;color:#eaf3ff;text-align:center;font:500 14px/1.6 system-ui,sans-serif";
      const title = document.createElement("strong");
      title.textContent = "Koneksi akun belum stabil";
      title.style.cssText = "font-size:20px;color:#fff";
      const detail = document.createElement("p");
      detail.dataset.accessError = "true";
      detail.style.cssText = "max-width:420px;margin:0;color:#b8cce5";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "COBA LAGI";
      button.style.cssText = "border:1px solid #6ba9ff;border-radius:10px;padding:12px 22px;background:#174b87;color:white;font-weight:700";
      button.addEventListener("click", () => {
        retryPanel?.remove();
        retryPanel = null;
        verifyAccess();
      });
      retryPanel.append(title, detail, button);
      document.documentElement.appendChild(retryPanel);
    }
    const detail = retryPanel.querySelector("[data-access-error]");
    if (detail) detail.textContent = message || "Periksa koneksi internet, lalu coba lagi. Kamu tidak perlu login ulang.";
  };

  async function requestWithRetry(request, label, currentAttempt) {
    let lastError;
    for (let retry = 0; retry < 3; retry += 1) {
      if (currentAttempt !== attemptId || terminal) return null;
      try {
        const result = await request();
        if (!result?.error) return result;
        lastError = result.error;
        if (!isTransient(lastError)) return result;
      } catch (error) {
        lastError = error;
        if (!isTransient(error)) throw error;
      }
      if (retry < 2) await delay(450 * (retry + 1));
    }
    throw new Error(label + ": " + String(lastError?.message || "koneksi tidak stabil"));
  }

  async function verifyAccess() {
    const currentAttempt = ++attemptId;
    const timeout = window.setTimeout(() => {
      if (currentAttempt === attemptId && !terminal && document.documentElement.classList.contains("access-pending")) {
        showRetry("Server membutuhkan waktu lebih lama dari biasanya. Sesi kamu tetap disimpan; tekan Coba Lagi.");
      }
    }, 20000);
    try {
      const client = window.supabaseClient;
      if (!client?.auth) throw new Error("Library autentikasi belum siap. Muat ulang halaman setelah koneksi pulih.");

      const sessionResult = await requestWithRetry(() => client.auth.getSession(), "Pemeriksaan sesi", currentAttempt);
      if (currentAttempt !== attemptId || terminal) return;
      const session = sessionResult?.data?.session;
      if (!session) return redirectToLogin();
      window.__matthewVerifiedSession = session;

      const userResult = await requestWithRetry(() => client.auth.getUser(), "Verifikasi identitas", currentAttempt);
      if (currentAttempt !== attemptId || terminal) return;
      if (userResult?.error) return redirectToLogin();
      const user = userResult?.data?.user || session.user;
      if (!user || !user.email_confirmed_at) return redirectToLogin();
      window.__matthewVerifiedUser = user;

      const profileResult = await requestWithRetry(() => client
        .from("profiles")
        .select("role,account_status")
        .eq("id", user.id)
        .maybeSingle(), "Pemeriksaan profil", currentAttempt);
      if (currentAttempt !== attemptId || terminal) return;
      if (profileResult?.error) throw new Error("Profil belum dapat diverifikasi: " + profileResult.error.message);
      const profile = profileResult?.data;
      if (!profile) return redirectToLogin();

      if (String(profile.account_status || "").trim().toLowerCase() !== "active") {
        await client.auth.signOut({ scope: "local" }).catch(() => {});
        return redirectToLogin();
      }

      const role = String(profile.role || "").trim().toLowerCase();
      if (!rule.roles.includes(role)) {
        terminal = true;
        window.location.replace("/?access=denied");
        return;
      }

      window.__matthewVerifiedProfile = profile;
      retryPanel?.remove();
      retryPanel = null;
      document.documentElement.classList.remove("access-pending");
    } catch (error) {
      if (currentAttempt !== attemptId || terminal) return;
      console.warn("[MATTHEW access guard]", error);
      showRetry("Pemeriksaan akun tertunda karena koneksi atau server belum merespons. Coba lagi tanpa perlu login ulang.");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // A slow response never turns into a false logout.
  window.__matthewAccessReady = verifyAccess();
})();