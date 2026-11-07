# Pretty URL & Asset Migration

## Canonical routes

The site now serves these pages from GitHub Pages directory indexes:

| Canonical URL | Source file | Legacy URL |
| --- | --- | --- |
| `/login/` | `login/index.html` | `/login.html` |
| `/register/` | `register/index.html` | `/register.html` |
| `/reset-password/` | `reset-password/index.html` | `/reset-password.html` |
| `/email-confirmed/` | `email-confirmed/index.html` | `/email-confirmed.html` |

Legacy HTML files remain as lightweight redirects and preserve query strings and URL fragments. Existing bookmarks and incoming links therefore continue to work.

## Asset path convention

Pages in subdirectories must use root-relative paths such as `/assets/css/...`, `/assets/js/...`, and `/assets/images/...`. Do not use `assets/...` from a nested page: the browser would resolve it below that page's directory.

When changing a cached CSS or JavaScript file, update its query-string version in the HTML reference (for example `?v=20261107-pr2`). Keep dimensions on images to avoid layout shifts. The primary logo is intentionally eager-loaded and prioritized; do not lazy-load the first visible brand mark. Lazy-load only images that are genuinely below the fold.

## Required Supabase dashboard update

Before deploying these routes, open **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs** and add:

- `https://matthewrok.my.id/email-confirmed/`
- `https://www.matthewrok.my.id/email-confirmed/` (only if the www host is configured and used)
- `https://matthewrok.my.id/reset-password/`
- `https://www.matthewrok.my.id/reset-password/` (only if the www host is configured and used)

Keep the legacy `.html` callback URLs temporarily during the transition. The application now requests the new slash-ending callback URLs for registration and password recovery.

Set the production **Site URL** to `https://matthewrok.my.id/` if that is the chosen canonical host. Do not remove existing redirect entries until registration verification and password recovery have been tested end-to-end.

## Deployment validation checklist

1. Wait for GitHub Pages deployment to finish.
2. Open each canonical route above directly in a private browser session.
3. Confirm CSS, logo, and scripts load without 404 responses.
4. Open each legacy `.html` URL with a test query string and confirm it redirects while retaining the query.
5. Test signup email verification and password recovery using a dedicated test account after adding the Supabase redirect allow-list entries.
6. Check browser console and Network panel for missing assets.

## Image format and lazy-loading note

This change does not rewrite or recompress source image binaries. WebP conversion should be performed from the original assets and visually checked before replacing them; no image files are replaced as part of this route migration.
