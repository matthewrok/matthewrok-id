(() => {
  "use strict";
  const STORAGE_PREFIX = "matthew_joki_member_onboarding_v1:";
  const init = async () => {
    const overlay = document.getElementById("memberOnboarding");
    const button = document.getElementById("memberOnboardingDone");
    if (!overlay || !button) return;
    const client = window.supabaseClient;
    if (!client?.auth?.getUser) return;

    let userId = "";
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user?.id) return;
      userId = data.user.id;
    } catch (error) {
      console.warn("[Member onboarding] Identity check unavailable:", error);
      return;
    }

    const storageKey = STORAGE_PREFIX + userId;
    try {
      if (window.localStorage.getItem(storageKey) === "done") return;
    } catch (error) {
      // Storage may be blocked. Keep this non-critical feature from blocking the dashboard.
      console.warn("[Member onboarding] Local storage unavailable:", error);
      return;
    }

    const previousFocus = document.activeElement;
    overlay.hidden = false;
    button.focus();

    const finish = () => {
      try {
        window.localStorage.setItem(storageKey, "done");
      } catch (error) {
        console.warn("[Member onboarding] Could not persist completion:", error);
      }
      overlay.hidden = true;
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    };
    button.addEventListener("click", finish, { once: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
