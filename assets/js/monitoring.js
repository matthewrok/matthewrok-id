(() => {
  "use strict";
  const dsn = String(window.MATTHEW_SENTRY_DSN || "").trim();
  if (!dsn || !window.Sentry || typeof window.Sentry.init !== "function") return;

  try {
    window.Sentry.init({
      dsn,
      environment: location.hostname === "localhost" ? "test" : "production",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        // Never send user identity, request payloads, cookies, or query parameters.
        if (event.user) delete event.user;
        if (event.request) {
          event.request.url = location.origin + location.pathname;
          delete event.request.query_string;
          delete event.request.data;
          delete event.request.cookies;
          delete event.request.headers;
        }
        if (event.extra) delete event.extra;
        if (Array.isArray(event.breadcrumbs)) {
          event.breadcrumbs = event.breadcrumbs.filter(item =>
            !/auth|login|password|token|session|supabase/i.test(String(item.category || "") + " " + String(item.message || ""))
          ).map(item => {
            const safe = { ...item };
            delete safe.data;
            return safe;
          });
        }
        return event;
      }
    });
    window.__matthewSentryReady = true;
  } catch (error) {
    console.warn("[MATTHEW monitoring] Sentry initialization failed.", error);
  }
})();
