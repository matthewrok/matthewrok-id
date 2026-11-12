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

## Release signing and private APK distribution

The debug APK is only for device testing. The signed production APK is built manually with the **Android Release APK** workflow.

Create a private keystore on a trusted computer (keep a secure offline backup):

```sh
keytool -genkeypair -v -keystore matthew-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias matthew
```

Add these four repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64`: Base64 encoding of the complete `matthew-release.jks` file.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: `matthew` (or the alias chosen during key generation).
- `ANDROID_KEY_PASSWORD`: key password.

On macOS/Linux, generate the Base64 value with `base64 -w 0 matthew-release.jks` (on macOS, use `base64 matthew-release.jks | tr -d '\\n'`). Never send the keystore or its passwords in chat, commit them to Git, or put them in the APK.

After the secrets are configured, run **Actions → Android Release APK → Run workflow**. The workflow builds a signed release APK, verifies its signature with `apksigner`, and uploads `matthew-joki-release-apk`. Keep the keystore permanently: future app updates must use the same signing identity or Android will reject them as updates.

A valid signature proves package integrity and publisher-key continuity; it does **not** guarantee that Google Play Protect will stop showing an “unknown app” warning. Users can still scan the APK with Play Protect. Do not disable Play Protect or attempt to bypass its checks.

## Test checklist

Before public distribution, test on physical Android devices:
- Sign in, sign out, registration, email confirmation, and password reset.
- Session persistence after closing and reopening the app.
- Member dashboard, rewards, membership history, wishlist, Inbox, and orders.
- Uploading payment evidence and other supported documents.
- WhatsApp, payment-provider links, downloads, and Android back navigation.
- Network loss/recovery and expired login sessions.


## Target perangkat

APK ditujukan untuk ponsel dan tablet Android fisik. Emulator Android yang dipakai workflow CI hanya untuk smoke test otomatis internal; BlueStacks, LDPlayer, dan MEmu bukan target dukungan atau distribusi aplikasi.
