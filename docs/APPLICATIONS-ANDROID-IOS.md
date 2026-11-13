# Aplikasi MATTHEW JOKI — Android dan iOS

## Platform yang didukung

| Platform | Aplikasi | Target perangkat |
|---|---|---|
| Android | APK | Ponsel dan tablet Android fisik |
| iOS / iPadOS | Aplikasi iOS, ekspor IPA setelah signing | iPhone dan iPad |

Emulator PC seperti BlueStacks, LDPlayer, dan MEmu bukan target distribusi atau dukungan aplikasi. Emulator Android/iOS yang dipakai GitHub Actions hanya untuk pemeriksaan otomatis internal.

## Implementasi

- Android: project native WebView di folder android/.
- iOS/iPadOS: project Xcode SwiftUI + WKWebView di folder ios/.
- Kedua aplikasi membuka website resmi melalui HTTPS dan memakai backend Supabase website yang sama. Tidak ada service-role key, token bot, atau secret backend yang disimpan di aplikasi.
- Upload bukti pembayaran tetap menggunakan alur input file pada website; WebView menyediakan pemilih file native platform.
- Link eksternal seperti WhatsApp dan penyedia pembayaran diarahkan ke aplikasi/browser sistem.
- Perubahan konten website tayang tanpa rebuild aplikasi karena kedua aplikasi memuat website produksi.

## Validasi

GitHub Actions menjalankan build APK Android, smoke test internal Android, build iOS Simulator, dan pembuatan unsigned iOS device archive. Build CI bukan pengganti uji end-to-end di ponsel sungguhan.

Checklist manual di perangkat Android dan iPhone/iPad:
- Login, logout, registrasi, verifikasi email, reset password, dan persistensi sesi.
- Membuat/melihat pesanan serta membuka detail pesanan.
- Upload bukti pembayaran dan memilih file dari perangkat.
- Membuka WhatsApp, tautan pembayaran, dan tautan eksternal.
- Navigasi kembali, orientasi layar, jaringan putus/sambung, dan sesi kedaluwarsa.

## Distribusi

### Android
- Debug APK dari CI hanya untuk pengujian.
- APK rilis harus ditandatangani dengan keystore milik pemilik aplikasi. Rahasiakan keystore dan password; simpan backup aman.
- Panduan signing tersedia di android/README.md.

### iOS / iPadOS
- Build simulator dan unsigned archive dapat dibuat oleh CI macOS.
- IPA untuk perangkat fisik memerlukan Apple Distribution certificate dan provisioning profile.
- TestFlight/App Store memerlukan keanggotaan Apple Developer Program aktif.
- Proses Archive dan ekspor IPA dijelaskan di ios/README.md. Jangan commit certificate, private key, provisioning profile, atau password.

## Batasan App Store

Aplikasi iOS versi awal adalah companion WebView untuk layanan web. Apple dapat menolak aplikasi yang hanya membungkus website tanpa nilai atau fungsi native yang memadai. Lakukan peninjauan App Review Guidelines dan tambahkan kemampuan native yang relevan sebelum pengajuan; persetujuan App Store tidak dapat dijamin.
