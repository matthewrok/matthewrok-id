# MATTHEW JOKI Android WebView

Android wrapper for the live website at https://matthewrok.my.id/.

## App identity

- Display name: MATTHEW JOKI
- Application ID: `id.my.matthewrok`
- Minimum Android version: Android 6.0 (API 23)
- Website/backend: existing GitHub Pages site and Supabase production project
- No Supabase credentials or backend secrets are bundled in this app.

## Build a debug APK

Requirements: JDK 17 and Android SDK Platform 35.

From this directory, run:

```sh
gradle assembleDebug
```

APK output:

```
app/build/outputs/apk/debug/app-debug.apk
```

The debug build uses the application ID suffix `.debug`, so it can be installed alongside a future signed production build.

## GitHub Actions

The workflow `.github/workflows/android-apk.yml` builds the debug APK on pull requests, pushes affecting the Android project, and manual workflow dispatch. Download the `matthew-joki-debug-apk` artifact from the successful Actions run.

## WebView behavior

- Loads the production website directly; content updates do not require rebuilding the APK.
- JavaScript, DOM storage, cookies, and the system document picker are enabled for the existing site flows.
- Only the official Matthew domain is kept inside the WebView.
- Other web destinations (for example WhatsApp, payment providers, and external links) open in the Android browser.
- HTTPS is enforced. Cleartext traffic and SSL certificate bypasses are disabled.
- Android back navigates the WebView history.

## Release signing

The CI artifact is a debug APK for device testing. A distributable production release should be built as a signed release APK using a private upload keystore stored in GitHub Actions secrets. Never commit the keystore or its passwords to this repository.

## Test checklist

Before public distribution, test on physical Android devices:
- Sign in, sign out, registration, email confirmation, and password reset.
- Session persistence after closing and reopening the app.
- Member dashboard, rewards, membership history, wishlist, Inbox, and orders.
- Uploading payment evidence and other supported documents.
- WhatsApp, payment-provider links, downloads, and Android back navigation.
- Network loss/recovery and expired login sessions.
