(() => {
  "use strict";

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const registeredRoles = ["member", "sultan", "matthew", "pelanggan", "worker", "admin"];
  const rules = [
    { test: /^\/admin(?:\/|$)/i, roles: ["admin"] },
    { test: /^\/worker[.]html$/i, roles: registeredRoles },
    { test: /^\/(?:inbox|your-order|member-dashboard)[.]html$/i, roles: registeredRoles }
  ];
  const rule = rules.find(item => item.test.test(path));
  if (!rule) return;

  // Hide protected markup before deferred page scripts can render private data.
  document.documentElement.classList.add("access-pending");
  const conceal = document.createElement("style");
  conceal.textContent = "html.access-pending body{visibility:hidden!important}";
  (document.head || document.documentElement).appendChild(conceal);

  let finished = false;
  const loginUrl = () => {
    if (finished) return;
    finished = true;
    const next = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace("/login.html?next=" + encodeURIComponent(next));
  };

  async function verifyAccess() {
    const client = window.supabaseClient;
    if (!client?.auth) return loginUrl();

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData?.session) return loginUrl();

    // getUser() validates the access token with Supabase Auth; getSession() alone is not authorization.
    const { data: userData, error: userError } = await client.auth.getUser();
    const user = userData?.user;
    if (userError || !user || !user.email_confirmed_at) return loginUrl();

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role,account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      return loginUrl();
    }

    const status = String(profile.account_status || "").trim().toLowerCase();
    if (status !== "active") {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      return loginUrl();
    }

    const role = String(profile.role || "").trim().toLowerCase();
    if (!rule.roles.includes(role)) {
      if (!finished) {
        finished = true;
        window.location.replace("/index.html?access=denied");
      }
      return;
    }

    if (!finished) document.documentElement.classList.remove("access-pending");
  }

  // Fail closed when the auth client is unavailable or a request hangs.
  const timeout = window.setTimeout(loginUrl, 10000);
  verifyAccess().catch(error => {
    console.error("[MATTHEW access guard]", error);
    loginUrl();
  }).finally(() => window.clearTimeout(timeout));
})();
