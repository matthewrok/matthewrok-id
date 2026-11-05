(() => {
  "use strict";
  const db = window.supabaseClient;
  if (!db) return;
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const $ = id => document.getElementById(id);
  const moduleForPath = () => {
    if (path === "/" || path === "/index.html") return "orders";
    if (path === "/worker.html") return "worker";
    if (path === "/inbox.html") return "inbox";
    return "";
  };
  const addBanner = message => {
    if (document.getElementById("maintenanceStatusBanner")) return;
    const banner = document.createElement("aside");
    banner.id = "maintenanceStatusBanner";
    banner.setAttribute("role", "status");
    banner.style.cssText = "position:relative;z-index:10000;margin:12px auto;padding:14px 18px;width:min(1100px,calc(100% - 24px));border:1px solid rgba(120,201,255,.45);border-radius:14px;background:linear-gradient(135deg,#102d50,#08182d);color:#e8f5ff;box-shadow:0 12px 32px rgba(0,0,0,.24);font:600 13px/1.6 system-ui,sans-serif";
    banner.textContent = "⚙️ MAINTENANCE · " + message;
    (document.body || document.documentElement).prepend(banner);
  };
  const formatEta = value => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(date);
  };
  async function run() {
    const { data, error } = await db.rpc("get_public_maintenance_status");
    if (error) {
      console.warn("[maintenance] status unavailable; sensitive mutations remain backend-gated.", error.message);
      return;
    }
    const status = Array.isArray(data) ? data[0] : data;
    if (!status?.enabled) return;
    const eta = formatEta(status.estimated_end_at);
    const message = String(status.message || "Layanan sedang dalam pemeliharaan.");
    const text = message + (eta ? " Estimasi selesai: " + eta + "." : "");
    const isMaintenancePage = path === "/maintenance.html";
    const isLoginPage = path === "/login.html";
    const isResetPage = path === "/reset-password.html";
    let isAdmin = false;
    if (status.mode === "full" || isLoginPage || isResetPage) {
      const { data: userData } = await db.auth.getUser();
      if (userData?.user) {
        const { data: adminResult, error: adminError } = await db.rpc("is_admin");
        isAdmin = !adminError && adminResult === true;
      }
    }
    if (status.mode === "full" && !isAdmin && !isMaintenancePage) {
      if (isLoginPage && !isAdmin && !(await db.auth.getUser()).data?.user) return;
      if (isResetPage && !isAdmin) return;
      location.replace("/maintenance.html");
      return;
    }
    if (isMaintenancePage) {
      const messageEl = $("maintenanceMessage");
      const etaEl = $("maintenanceEta");
      const modeEl = $("maintenanceModeLabel");
      if (messageEl) messageEl.textContent = message;
      if (etaEl) etaEl.textContent = eta ? "Perkiraan selesai: " + eta : "Waktu selesai belum ditentukan.";
      if (modeEl) modeEl.textContent = status.mode === "full" ? "FULL MAINTENANCE" : status.mode === "orders" ? "ORDER MAINTENANCE" : "SYSTEM MAINTENANCE";
      return;
    }
    if (isAdmin) {
      addBanner("Mode aktif, tetapi akses admin tetap diizinkan. " + text);
      return;
    }
    const currentModule = moduleForPath();
    const modules = Array.isArray(status.affected_modules) ? status.affected_modules : [];
    const blocked = status.mode === "orders" && currentModule === "orders" ||
      status.mode === "system" && currentModule && modules.includes(currentModule);
    if (!blocked && !(status.mode === "system" && currentModule === "worker" && modules.includes("macul"))) return;
    addBanner(text);
    if (currentModule === "orders") {
      const submit = $("jokiOrderSubmit");
      const voucher = $("jokiApplyVoucher");
      if (submit) { submit.disabled = true; submit.textContent = "PEMESANAN SEMENTARA DITUTUP"; }
      if (voucher) voucher.disabled = true;
      document.querySelectorAll("[data-order-action],.joki-order-button").forEach(el => { el.setAttribute("aria-disabled","true"); if ("disabled" in el) el.disabled = true; });
    }
    if (currentModule === "worker") {
      const form = $("workerApplicationForm");
      const workerState = $("workerState");
      if (modules.includes("worker")) {
        if (form) { form.hidden = true; form.querySelectorAll("input,select,button,textarea").forEach(el => el.disabled = true); }
        if (workerState) { workerState.hidden = false; workerState.textContent = message; }
      } else if (modules.includes("macul")) {
        const macul = form?.querySelector('option[value="macul"]');
        if (macul) { macul.disabled = true; macul.textContent = "Worker MACUL — sementara ditutup"; }
      }
    }
    if (currentModule === "inbox") {
      const list = $("inboxList");
      const composer = $("inboxComposer");
      if (list) list.replaceChildren();
      if (composer) composer.hidden = true;
      const state = $("inboxState");
      if (state) state.textContent = message;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => run().catch(e => console.warn("[maintenance]",e)));
  else run().catch(e => console.warn("[maintenance]",e));
})();