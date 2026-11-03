document.addEventListener("DOMContentLoaded", () => {
  const client = window.supabaseClient;
  if (!client) return;
  const timeout = 30 * 60 * 1000;
  const activityKey = "matthewLastActivity";
  let timer;
  const loginPage = /(?:^|\/)login\.html$/.test(location.pathname);

  async function expireSession() {
    clearTimeout(timer);
    const guest = sessionStorage.getItem("matthewVisitorName");
    if (guest) sessionStorage.removeItem("matthewVisitorName");
    else await client.auth.signOut();
    localStorage.removeItem(activityKey);
    if (!loginPage) location.replace("login.html?reason=timeout");
  }

  async function initialize() {
    const { data } = await client.auth.getSession();
    if (!data.session && !sessionStorage.getItem("matthewVisitorName")) return;
    const last = Number(localStorage.getItem(activityKey) || Date.now());
    const remaining = timeout - (Date.now() - last);
    if (remaining <= 0) return expireSession();
    localStorage.setItem(activityKey, String(last));
    timer = setTimeout(expireSession, remaining);
  }

  function activity() {
    if (document.visibilityState !== "visible") return;
    localStorage.setItem(activityKey, String(Date.now()));
    clearTimeout(timer);
    timer = setTimeout(expireSession, timeout);
  }

  ["click", "keydown", "scroll", "touchstart", "mousemove"].forEach(type =>
    window.addEventListener(type, activity, { passive: true })
  );
  window.addEventListener("storage", event => {
    if (event.key !== activityKey) return;
    clearTimeout(timer);
    const remaining = timeout - (Date.now() - Number(event.newValue || 0));
    timer = remaining <= 0 ? setTimeout(expireSession, 0) : setTimeout(expireSession, remaining);
  });
  client.auth.onAuthStateChange((_event, session) => {
    if (session) activity();
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