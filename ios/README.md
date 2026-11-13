# MATTHEW JOKI — iOS / iPadOS

Native iOS shell built with SwiftUI and WebKit (WKWebView). It loads https://matthewrok.my.id/ and uses the same Supabase-backed account and order flows as the website.

## Requirements

- macOS with Xcode 15 or newer.
- iOS 15.0 or newer; supports iPhone and iPad.
- Apple Developer account for TestFlight, App Store, and signed device distribution.

## Open and run

1. Open ios/MATTHEWJOKI.xcodeproj in Xcode.
2. Select the MATTHEWJOKI scheme and an iPhone or iPad simulator.
3. Press Run. The app loads the live website; no backend credentials are bundled.

## WebView behavior

- Uses WKWebView with persistent website data and cookies.
- Website authentication, orders, and payment evidence upload use the existing web flows. HTML file inputs are handled by the iOS WebKit document picker.
- Official HTTPS pages on matthewrok.my.id stay in the app.
- External destinations such as WhatsApp, payment providers, and other external links are handed to iOS.
- WebKit provides back/forward navigation gestures.
- No custom SSL bypass or HTTP transport exception is configured.

## Build validation

The iOS App GitHub Actions workflow runs on macOS and builds an iOS Simulator target and an unsigned device archive. CI does not produce an installable signed IPA.

## Create a signed IPA

An IPA for a physical iPhone/iPad must be signed with an Apple Distribution certificate and a matching provisioning profile. Keep the certificate private and configure signing only through Xcode or protected GitHub Actions secrets; never commit .p12 files, private keys, provisioning profiles, or passwords.

In Xcode:

1. Open the project and select the MATTHEWJOKI target.
2. Set the Team to the Apple Developer team and keep bundle identifier id.my.matthewrok.
3. Enable Automatically manage signing for the Release configuration.
4. Select Any iOS Device (arm64), then choose Product → Archive.
5. In Organizer, choose Distribute App and select App Store Connect (TestFlight/App Store) or Ad Hoc distribution.
6. Follow Apple's signing and export steps to create the IPA.

TestFlight/App Store distribution requires an active Apple Developer Program membership. Ad Hoc distribution also requires registered device UDIDs. An unsigned archive from CI is not an IPA and cannot be installed on a physical device.

## App Store review note

This first version is a WebView companion to the live service. Apple's App Review may reject apps that only repackage a website without sufficient app-specific value. Before submitting, verify the current App Review Guidelines and consider adding meaningful app-specific native capabilities and polished native navigation rather than assuming approval.
