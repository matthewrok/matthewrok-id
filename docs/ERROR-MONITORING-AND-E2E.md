# Error Monitoring & Browser Test Setup

## Sentry setup

The browser SDK is pinned to `8.55.0` and loaded on the homepage, login, registration, and admin dashboard. The integration is deliberately inactive until a Browser DSN is configured.

1. Create a Sentry project for a browser JavaScript application.
2. Copy its **Browser DSN** (not an auth token).
3. Set `window.MATTHEW_SENTRY_DSN` in `assets/js/sentry-config.js`.
4. Deploy and trigger a controlled test exception on a non-production preview before enabling it on the live site.
5. Confirm events appear in Sentry and that event payloads contain no user identity, request headers, cookies, request body, query string, or auth-related breadcrumbs.

Privacy defaults:
- `sendDefaultPii: false`
- No tracing or session replay is enabled.
- User data, request data, headers, cookies, query strings, and auth-related breadcrumbs are removed in `beforeSend`.
- The DSN is public browser configuration, not a secret. Never place a Sentry auth token, Supabase service-role key, or other secret in this file.

If no DSN is set, monitoring does nothing and the website continues to work normally.

## Playwright tests

Run locally:

```sh
npm install --no-package-lock --no-audit --no-fund
npx playwright install chromium
npm test
```

The GitHub Actions workflow `.github/workflows/browser-tests.yml` runs the Chromium tests on pull requests targeting `main`, pushes to `main`, and manual dispatch.

The tests stub the Supabase CDN client in the browser and use synthetic accounts. They do not connect to the production Supabase project, create real users, or require production credentials.

Coverage:
- Successful login follows the current redirect to the homepage.
- Invalid login credentials show a friendly error and restore the submit button.
- Unauthenticated visitors are redirected away from the admin route.
- A signed-in non-admin role is denied access to the admin route.

## Security boundary

The admin-route Playwright tests verify the client-side access guard only. They do **not** prove database security. Supabase Row Level Security and server-side authorization remain the security boundary for sensitive data and mutations. Do not weaken RLS based on a passing browser test.

## Current limitations

- A Sentry DSN must be configured by the project owner before events are sent.
- Tests use a mocked Supabase client; a separate staging integration suite with dedicated test accounts would be needed to verify real email verification, password recovery, and database RLS.
- This repository does not currently include an npm lockfile; the Playwright direct dependency is pinned exactly in `package.json`, while transitive dependency versions are resolved during installation.
