(() => {
  "use strict";

  const path = window.location.pathname.replace(/\\/+$/, "") || "/";
  const rules = [
    { test: /^\\/admin(?:\\/|$)/i, roles: ["admin"] },
    { test: /^\\/worker\\.html$/i, roles: ["member", "sultan", "matthew", "pelanggan", "worker", "admin"] },
    { test: /^\\/(?:inbox|your-order|member-dashboard)\\.html$/i, roles: ["member", "sultan", "matthew", "pelanggan", "worker", "admin"] }
  ];
  const rule = rules.find(item => item.test.test(path));
  if (!rule) return;

  // Keep protected page markup out of view until the session and role are verified.
  document.documentElement.classList.add("access-pending");
  const conceal = document.createElement("style");
  conceal.textContent = "html.access-pending body{visibility:hidden!important}";
  (document.head || document.documentElement).appendChild(conceal);

  const loginUrl = () => {
    const next = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace("/login.html?next=" + encodeURIComponent(next));
  };

  async function verifyAccess() {
    const client = window.supabaseClient;
    if (!client?.auth) return loginUrl();

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData?.session) return loginUrl();

    const { data: userData, error: userError } = await client.auth.getUser();
    const user = userData?.user;
    if (userError || !user || !user.email_confirmed_at) return loginUrl();

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role,account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.account_status === "suspended") {
      await client.auth.signOut({ scope: "local" });
      return loginUrl();
    }

    const role = String(profile.role || "").trim().toLowerCase();
    if (!rule.roles.includes(role)) {
      window.location.replace("/index.html?access=denied");
      return;
    }

    document.documentElement.classList.remove("access-pending");
  }

  // Fail closed if the auth client hangs or cannot initialize.
  const timeout = window.setTimeout(loginUrl, 10000);
  verifyAccess().catch(error => {
    console.error("[MATTHEW access guard]", error);
    loginUrl();
  }).finally(() => window.clearTimeout(timeout));
})();