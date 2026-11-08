document.addEventListener("DOMContentLoaded", () => {
  const client = window.supabaseClient;
  if (!client) return;
  const timeout = 30 * 60 * 1000;
  const activityKey = "matthewLastActivity";
  const storageWriteInterval = 15000;
  let timer;
  let activeSession = false;
  let lastStorageWrite = 0;
  const loginPage = /(?:^|\\/)login(?:\\.html|\\/)?$/.test(location.pathname);

  function writeActivity(force = false) {
    const now = Date.now();
    if (!force && now - lastStorageWrite < storageWriteInterval) return;
    try {
      localStorage.setItem(activityKey, String(now));
      lastStorageWrite = now;
    } catch (error) {
      console.warn("[MATTHEW session] Activity storage unavailable:", error);
    }
  }

  async function expireSession() {
    clearTimeout(timer);
    if (!activeSession) return;
    activeSession = false;
    if (sessionStorage.getItem("matthewVisitorName")) sessionStorage.removeItem("matthewVisitorName");
    else await client.auth.signOut({ scope: "local" });
    localStorage.removeItem(activityKey);
    if (!loginPage) location.replace("/login/?reason=timeout");
  }

  async function initialize() {
    let session = null;
    if (window.__matthewAccessReady) {
      try {
        await window.__matthewAccessReady;
        session = window.__matthewVerifiedSession || null;
      } catch (_) {
        return;
      }
    } else {
      const { data, error } = await client.auth.getSession();
      if (error) { console.warn("[MATTHEW session]", error); return; }
      session = data.session || null;
    }
    activeSession = Boolean(session || sessionStorage.getItem("matthewVisitorName"));
    if (!activeSession) return;
    let last = 0;
    try { last = Number(localStorage.getItem(activityKey) || 0); } catch (_) {}
    if (!last) last = Date.now();
    const remaining = timeout - (Date.now() - last);
    if (remaining <= 0) return expireSession();
    writeActivity(true);
    timer = setTimeout(expireSession, remaining);
  }

  function activity() {
    if (!activeSession || document.visibilityState !== "visible") return;
    writeActivity();
    clearTimeout(timer);
    timer = setTimeout(expireSession, timeout);
  }

  ["click", "keydown", "scroll", "touchstart"].forEach(type =>
    window.addEventListener(type, activity, { passive: true })
  );
  if (window.matchMedia?.("(pointer: fine)").matches) {
    let lastPointerActivity = 0;
    window.addEventListener("mousemove", () => {
      const now = Date.now();
      if (now - lastPointerActivity < 1200) return;
      lastPointerActivity = now;
      activity();
    }, { passive: true });
  }
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") activity();
  });
  window.addEventListener("storage", event => {
    if (!activeSession || event.key !== activityKey) return;
    clearTimeout(timer);
    const remaining = timeout - (Date.now() - Number(event.newValue || 0));
    timer = setTimeout(expireSession, Math.max(0, remaining));
  });
  client.auth.onAuthStateChange((_event, session) => {
    if (session) {
      activeSession = true;
      activity();
    } else if (!sessionStorage.getItem("matthewVisitorName")) {
      activeSession = false;
      clearTimeout(timer);
    }
  });
  initialize();

  if (loginPage && new URLSearchParams(location.search).get("reason") === "timeout") {
    const message = document.getElementById("authMessage");
    if (message) {
      message.textContent = "Sesi berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.";
      message.className = "auth-message";
    }
  }
});