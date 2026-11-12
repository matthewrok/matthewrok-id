# MATTHEW JOKI

Website resmi MATTHEW JOKI untuk informasi layanan joki *Rise of Kingdoms*, tools, akun member, pesanan, dan pengelolaan website.

## Informasi
- **Website:** https://matthewrok.my.id/
- **Repository:** https://github.com/matthewrok/matthewrok-id
- **Hosting:** GitHub Pages
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Supabase (Auth, PostgreSQL, RLS, RPC, Edge Functions)

## Fitur utama
- Profil dan informasi layanan MATTHEW JOKI.
- Login, registrasi, dan pengelolaan akun.
- Kalkulator resource dan persyaratan City Hall.
- Katalog paket, voucher, pemesanan, dan pelacakan progres.
- Dashboard member, Inbox, dan pendaftaran worker.
- Panel admin serta notifikasi/integrasi Telegram.

Ketersediaan fitur bergantung pada konfigurasi dan implementasi frontend serta backend.

## Struktur singkat
```text
.
├── index.html          # Beranda
├── *.html              # Halaman publik, akun, member, dan layanan
├── admin/              # Halaman administrasi
├── assets/
│   ├── css/            # Stylesheet
│   ├── js/             # Modul JavaScript
│   └── images/         # Gambar dan aset brand
├── supabase/
│   ├── functions/      # Edge Functions
│   └── *.sql           # SQL dan migrasi database
├── docs/               # Dokumentasi proyek
├── CNAME               # Domain kustom
└── README.md
```

## Pengembangan dan publikasi
1. Buat branch baru untuk setiap perubahan.
2. Periksa seluruh referensi file sebelum memindahkan atau menghapus aset.
3. Uji halaman terkait di desktop dan mobile.
4. Periksa autentikasi, izin akses, dan alur pesanan jika perubahan menyentuh fitur tersebut.
5. Ajukan Pull Request ke `main` setelah pemeriksaan selesai.

Website dipublikasikan melalui GitHub Pages. Fitur dinamis menggunakan Supabase; pastikan konfigurasi proyek dan migrasi database sesuai sebelum merilis perubahan.

## Keamanan
- Jangan menyimpan password, token Telegram, Supabase service-role key, atau secret lainnya di repository maupun frontend.
- Simpan secret di pengaturan secrets backend.
- Lindungi data dan operasi sensitif dengan Supabase RLS serta validasi otorisasi di backend.
- Pemeriksaan frontend saja tidak cukup untuk menjamin keamanan.

---
**MATTHEW JOKI** · https://matthewrok.my.id/


## Aplikasi Android dan iOS

Target aplikasi MATTHEW JOKI adalah Android (APK) serta iPhone/iPad (aplikasi iOS/IPA setelah signing). Implementasi Android ada di folder android/, sedangkan project SwiftUI + WKWebView iOS ada di folder ios/. Panduan platform, pengujian, dan distribusi: [docs/APPLICATIONS-ANDROID-IOS.md](docs/APPLICATIONS-ANDROID-IOS.md). Build CI iOS membutuhkan macOS/Xcode; IPA perangkat fisik memerlukan signing Apple. Emulator PC bukan target distribusi atau dukungan.
