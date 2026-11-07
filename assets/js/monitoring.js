(() => {
  "use strict";
  const dsn = String(window.MATTHEW_SENTRY_DSN || "").trim();
  if (!dsn || !window.Sentry || typeof window.Sentry.init !== "function") return;

  const scrubText = value => String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[redacted-token]")
    .replace(/([?&](?:access_token|refresh_token|token|code|email|password)=)[^&#\s]*/gi, "$1[redacted]");

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
        if (event.message) event.message = scrubText(event.message);
        if (Array.isArray(event.exception?.values)) {
          event.exception.values = event.exception.values.map(exception => ({
            ...exception,
            value: scrubText(exception.value)
          }));
        }
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
