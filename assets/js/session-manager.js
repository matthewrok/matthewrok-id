document.addEventListener("DOMContentLoaded", () => {
  const client = window.supabaseClient;
  if (!client) return;
  const timeout = 30 * 60 * 1000;
  const activityKey = "matthewLastActivity";
  let timer;
  let activeSession = false;
  const loginPage = /(?:^|\/)login\.html$/.test(location.pathname);

  async function expireSession() {
    clearTimeout(timer);
    if (!activeSession) return;
    activeSession = false;
    if (sessionStorage.getItem("matthewVisitorName")) sessionStorage.removeItem("matthewVisitorName");
    else await client.auth.signOut();
    localStorage.removeItem(activityKey);
    if (!loginPage) location.replace("login.html?reason=timeout");
  }

  async function initialize() {
    const { data } = await client.auth.getSession();
    activeSession = Boolean(data.session || sessionStorage.getItem("matthewVisitorName"));
    if (!activeSession) return;
    const last = Number(localStorage.getItem(activityKey) || Date.now());
    const remaining = timeout - (Date.now() - last);
    if (remaining <= 0) return expireSession();
    localStorage.setItem(activityKey, String(last));
    timer = setTimeout(expireSession, remaining);
  }

  function activity() {
    if (!activeSession || document.visibilityState !== "visible") return;
    localStorage.setItem(activityKey, String(Date.now()));
    clearTimeout(timer);
    timer = setTimeout(expireSession, timeout);
  }

  ["click", "keydown", "scroll", "touchstart", "mousemove"].forEach(type =>
    window.addEventListener(type, activity, { passive: true })
  );
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