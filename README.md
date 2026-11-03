# Matthew Joki — Dragon Kingdom

Website resmi **Matthew Joki** untuk layanan, informasi, dan tools pendukung *Rise of Kingdoms*.

- **Website:** https://matthewrok.my.id/
- **Repository:** https://github.com/matthewrok/matthewrok-id
- **Hosting:** GitHub Pages dengan custom domain
- **Backend:** Supabase (Authentication, PostgreSQL, Row Level Security, dan Edge Functions)

> Repository ini merupakan situs statis berbasis HTML, CSS, dan JavaScript. Fitur yang membutuhkan data dinamis berkomunikasi dengan Supabase dari browser atau melalui Supabase Edge Functions.

## Daftar fitur

| Bagian | Fitur |
| --- | --- |
| Beranda | Profil Matthew, navigasi, daftar layanan, efek visual, dan ticker pengumuman publik |
| Autentikasi | Registrasi, verifikasi email, login, akses visitor, dan pemulihan kata sandi |
| Tools | Calculator Resource dan Requirements City Hall |
| Layanan | Informasi layanan joki, pembuatan/pelacakan pesanan, dan progres pengerjaan |
| Komunitas | Ulasan pelanggan dan halaman Support Matthew |
| Admin website | Dashboard, pengelolaan pesanan/progres, role akun, notifikasi, voucher, dan moderasi ulasan sesuai modul yang tersedia |
| Admin Telegram | Panel bot untuk melihat ringkasan dan mengelola sejumlah data operasional melalui Supabase Edge Function |

Ketersediaan tiap tindakan admin bergantung pada implementasi Edge Function, skema database, izin database, serta role akun yang sah. Tampilan admin bukan pengganti otorisasi di backend.

## Struktur repository

```text
.
├── index.html
├── login.html
├── register.html
├── reset-password.html
├── email-confirmed.html
├── calculator-resource.html
├── requirements-city-hall.html
├── joki-matthew.html
├── support-matthew.html
├── admin/
│   ├── dashboard.html
│   └── joki-progress.html
├── assets/
│   ├── css/             # Stylesheet per halaman dan komponen bersama
│   ├── js/              # Modul JavaScript browser
│   └── images/          # Aset gambar yang digunakan/didokumentasikan
├── supabase/            # SQL setup/migrasi dan konfigurasi backend terdokumentasi
├── docs/                # Audit, struktur, dan catatan pemeliharaan
├── CNAME                # Custom domain GitHub Pages
├── robots.txt           # Aturan crawling mesin pencari
├── sitemap.xml          # URL publik untuk mesin pencari
└── README.md
```

Halaman HTML publik dipertahankan di root agar URL GitHub Pages dan tautan yang sudah digunakan tidak berubah. Halaman administrasi berada di `admin/`. Jangan memindahkan atau mengganti nama halaman tanpa meninjau seluruh referensi, canonical URL, sitemap, jalur aset, serta redirect/callback autentikasi.

### Konvensi penempatan file

- HTML halaman: root untuk halaman publik; `admin/` untuk halaman administrasi.
- CSS: `assets/css/`.
- JavaScript browser: `assets/js/`.
- SQL dan skrip backend terdokumentasi: `supabase/`.
- Dokumentasi teknis dan laporan audit: `docs/`.
- Gambar: `assets/images/` atau lokasi lama yang masih direferensikan secara aktif.
- Gunakan nama file huruf kecil, deskriptif, dan tanda hubung, misalnya `home-announcement.js`.

## Teknologi dan arsitektur

- **Frontend:** HTML5, CSS3, JavaScript.
- **Backend:** Supabase Authentication dan PostgreSQL.
- **Keamanan data:** Row Level Security (RLS), kebijakan database, dan fungsi backend untuk operasi yang memerlukan hak khusus.
- **Hosting:** GitHub Pages.
- **Integrasi administrasi:** Telegram Bot melalui Supabase Edge Function `telegram-order-notify`.

GitHub Pages hanya menyajikan file statis. Jangan menaruh rahasia server, bot token, service-role key, atau kredensial privat di HTML, CSS, JavaScript browser, maupun repository.

## Pengumuman berjalan

Ticker pada beranda mengambil notifikasi aktif yang ditujukan kepada seluruh pengunjung dari tabel Supabase `site_notifications`. Notifikasi yang tidak aktif atau telah melewati masa berlaku tidak semestinya ditampilkan. Pengelolaan dilakukan melalui modul notifikasi admin.

Jika ticker kosong atau gagal dimuat, periksa koneksi Supabase, nama/struktur kolom, data notifikasi, dan kebijakan RLS. Akses anonim harus dibatasi hanya pada informasi publik yang memang boleh dibaca; jangan membuka notifikasi khusus member atau data admin.

## Autentikasi dan akun

- Registrasi menggunakan email dan alur konfirmasi email Supabase.
- Konfirmasi email tidak seharusnya dianggap sebagai login otomatis; pengguna perlu melakukan login secara terpisah sesuai alur aplikasi.
- Halaman pemulihan kata sandi dan halaman konfirmasi email harus tetap cocok dengan URL redirect yang diizinkan di konfigurasi Supabase.
- Akses visitor/member/admin harus dibatasi berdasarkan kebutuhan fitur dan otorisasi backend.
- Perubahan role harus dilakukan melalui jalur backend yang memvalidasi aktor, target, dan role yang diizinkan serta mencatat audit bila fitur audit digunakan.

Saat mengubah autentikasi, periksa `assets/js/supabase.js`, modul autentikasi/session terkait, halaman `login.html`, `register.html`, `reset-password.html`, `email-confirmed.html`, serta daftar Site URL dan Redirect URLs di Supabase.

## Supabase dan keamanan

1. File browser hanya boleh menggunakan publishable/anon key yang memang dirancang untuk penggunaan publik. Key tersebut tetap wajib dilindungi dengan RLS yang benar.
2. Jangan pernah memasukkan `service_role key`, password database, token bot Telegram, access token privat, atau secret lain ke repository maupun kode browser.
3. Aktifkan dan audit RLS untuk tabel yang berisi profil, pesanan, progres, ulasan, voucher, notifikasi, log pengunjung, dan data administrasi.
4. Jangan mengandalkan penyembunyian tombol atau pemeriksaan role di frontend sebagai kontrol keamanan.
5. Operasi sensitif harus divalidasi di backend. Untuk Edge Function yang menerima webhook publik, validasi identitas pemanggil dan input sebelum menjalankan operasi database.
6. Skrip SQL di `supabase/` harus ditinjau terhadap skema produksi sebelum dijalankan. Perhatikan apakah skrip bersifat idempotent, apakah mengubah policy/constraint, dan apakah dapat memengaruhi data yang sudah ada.
7. Simpan secret Edge Function melalui pengelolaan secrets Supabase, bukan di file sumber yang dikomit.

### Bot Telegram

Bot administrasi menggunakan Edge Function `telegram-order-notify` untuk menerima update Telegram dan berkomunikasi dengan database. Jangan mengubah atau mengganti nama function tanpa memperbarui webhook dan konfigurasi terkait. Jika token bot pernah terekspos, cabut token lama melalui BotFather dan simpan token baru hanya sebagai secret Supabase.

## Panduan perubahan dan pemeliharaan

### Sebelum mengubah atau menghapus file

1. Periksa seluruh referensi nama file di HTML, CSS, JavaScript, SQL, dokumentasi, konfigurasi, dan workflow.
2. Periksa referensi yang dibentuk secara dinamis oleh JavaScript, termasuk `fetch()`, `import()`, `src`, dan URL gambar.
3. Pastikan file bukan target redirect/callback, URL publik lama, atau dependensi eksternal.
4. Untuk CSS, pastikan stylesheet tidak dimuat melalui `@import`, `<link>`, atau mekanisme build/runtime lain.
5. Hapus hanya jika tidak ada penggunaan aktif yang relevan; catat alasan dan hasil pemeriksaannya di `docs/AUDIT-CLEANUP.md`.

### Setelah perubahan

- Periksa jalur file lokal dan tautan internal.
- Jalankan pemeriksaan sintaks seluruh JavaScript.
- Validasi HTML/CSS dan periksa console/network browser.
- Uji tampilan desktop dan ponsel.
- Uji alur login, registrasi, verifikasi email, visitor, reset password, kalkulator, Requirements City Hall, pesanan, ulasan, dan halaman support.
- Untuk perubahan admin, uji otorisasi menggunakan akun dengan role berbeda dan pastikan RLS tetap berlaku.
- Periksa status deployment GitHub Pages sebelum menyatakan perubahan sudah tayang.

Pemeriksaan statis tidak membuktikan aplikasi berjalan benar. Jangan menyebut fitur lulus uji end-to-end jika belum benar-benar diuji melalui browser dan backend.

## Publikasi GitHub Pages

Perubahan yang masuk ke branch sumber publikasi GitHub Pages akan diproses oleh GitHub Pages. Pastikan konfigurasi Pages, custom domain, dan HTTPS tidak berubah tanpa sengaja.

- File `CNAME` menyimpan domain `matthewrok.my.id`.
- `robots.txt` mengatur crawling dan menunjuk ke sitemap.
- `sitemap.xml` memuat halaman publik yang ingin diindeks.
- Halaman login, registrasi, reset password, dan area admin dibatasi dari crawling melalui `robots.txt`; aturan crawler bukan mekanisme keamanan.

Jika situs tidak dapat diakses, periksa status deployment GitHub Pages, custom domain/DNS, HTTPS, file entry point `index.html`, dan konfigurasi repository. Jangan menyimpulkan situs down hanya dari satu pemeriksaan jaringan otomatis.

## Dokumentasi terkait

- [`docs/REPOSITORY-STRUCTURE.md`](docs/REPOSITORY-STRUCTURE.md) — aturan struktur dan pemindahan file.
- [`docs/AUDIT-CLEANUP.md`](docs/AUDIT-CLEANUP.md) — riwayat pembersihan dan batas pemeriksaan.

## Status audit

Laporan pembersihan yang sudah dilakukan dan batas pengujiannya dicatat di `docs/AUDIT-CLEANUP.md`. Audit dilakukan bertahap agar perubahan struktur tidak merusak URL publik, autentikasi, integrasi Supabase, atau tampilan situs.
