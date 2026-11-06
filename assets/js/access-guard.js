(() => {
  "use strict";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const roles = ["member", "sultan", "matthew", "pelanggan", "worker", "macul", "admin"];
  const rules = [
    { test: /^\/admin(?:\/|$)/i, roles: ["admin"] },
    { test: /^\/worker[.]html$/i, roles },
    { test: /^\/(?:inbox|your-order|member-dashboard)[.]html$/i, roles }
  ];
  const rule = rules.find(item => item.test.test(path));
  if (!rule) return;

  document.documentElement.classList.add("access-pending");
  const conceal = document.createElement("style");
  conceal.textContent = "html.access-pending body{visibility:hidden!important}";
  (document.head || document.documentElement).appendChild(conceal);

  let finished = false;
  const redirectToLogin = () => {
    if (finished) return;
    finished = true;
    const next = location.pathname + location.search + location.hash;
    location.replace("/login.html?next=" + encodeURIComponent(next));
  };

  async function verifyAccess() {
    const client = window.supabaseClient;
    if (!client?.auth) return redirectToLogin();

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData?.session) return redirectToLogin();
    window.__matthewVerifiedSession = sessionData.session;

    const { data: userData, error: userError } = await client.auth.getUser();
    const user = userData?.user;
    if (userError || !user || !user.email_confirmed_at) return redirectToLogin();
    window.__matthewVerifiedUser = user;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role,account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      return redirectToLogin();
    }

    if (String(profile.account_status || "").trim().toLowerCase() !== "active") {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      return redirectToLogin();
    }

    const role = String(profile.role || "").trim().toLowerCase();
    if (!rule.roles.includes(role)) {
      if (!finished) {
        finished = true;
        location.replace("/index.html?access=denied");
      }
      return;
    }

    if (!finished) document.documentElement.classList.remove("access-pending");
  }

  const timeout = window.setTimeout(redirectToLogin, 10000);
  window.__matthewAccessReady = verifyAccess().catch(error => {
    console.error("[MATTHEW access guard]", error);
    redirectToLogin();
    throw error;
  }).finally(() => window.clearTimeout(timeout));
})();
