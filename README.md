# MATTHEW JOKI — Personal Website & Rise of Kingdoms Tools

Website resmi MATTHEW untuk profil personal, informasi layanan, alat bantu *Rise of Kingdoms*, pesanan, akun member, dan pengelolaan admin.

| Informasi | Detail |
|---|---|
| Website produksi | https://matthewrok.my.id/ |
| Repository | https://github.com/matthewrok/matthewrok-id |
| Hosting | GitHub Pages + custom domain |
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Supabase Auth, PostgreSQL, RLS, RPC, Edge Functions |
| Branch publikasi | `main` (pastikan konfigurasi Pages di GitHub sesuai) |

> Website ini adalah aplikasi statis. Fitur yang membutuhkan data akun/pesanan memakai Supabase. README ini menjelaskan struktur dan pemeliharaan; bukan bukti bahwa seluruh alur sudah lulus pengujian end-to-end.

## Fitur website

- **Beranda personal** — profil, navigasi, layanan, pengumuman, dan elemen visual responsif.
- **Akun** — registrasi, verifikasi email, login, akses visitor, dan pemulihan kata sandi.
- **Tools Rise of Kingdoms** — kalkulator resource dan daftar persyaratan City Hall.
- **Layanan joki** — katalog paket, formulir pesanan, nomor kingdom, jumlah karakter, kode voucher, dan ringkasan pesanan.
- **Pelacakan pesanan** — status/progres dan informasi pesanan member.
- **Member dashboard** — ringkasan akun dan pesanan/invoice.
- **Inbox** — pesan resmi sesuai peran dan izin akun.
- **Support** — informasi dukungan dan halaman donasi/QRIS.
- **Admin** — dashboard, pengelolaan progres, akun/role, pengumuman, voucher, dan aktivitas sesuai modul yang diimplementasikan.
- **Integrasi Telegram** — Edge Functions untuk notifikasi dan proses administratif terkait pesanan.

Ketersediaan aksi admin bergantung pada kode, konfigurasi Supabase, izin database, dan role. UI bukan pengganti validasi server.

## Struktur repository

```text
.
├── index.html                      # Beranda (entry point GitHub Pages)
├── login.html                      # Login
├── register.html                   # Registrasi
├── reset-password.html             # Reset kata sandi
├── email-confirmed.html             # Halaman setelah konfirmasi email
├── member-dashboard.html            # Dashboard member
├── inbox.html                       # Inbox
├── your-order.html                  # Daftar/detail pesanan
├── joki-matthew.html                # Informasi layanan joki
├── calculator-resource.html         # Kalkulator resource
├── requirements-city-hall.html      # Persyaratan City Hall
├── support-matthew.html             # Support
├── worker.html                      # Formulir worker
├── admin/
│   ├── dashboard.html               # Admin control center
│   └── joki-progress.html            # Pengelolaan progres pesanan
├── assets/
│   ├── images/
│   │   ├── brand/
│   │   │   └── logo-matthew.png     # Logo/identitas brand
│   │   └── qris-matthew.jpeg        # QRIS untuk halaman support
│   ├── css/                         # Stylesheet halaman dan komponen
│   └── js/                          # Modul JavaScript browser
├── supabase/
│   ├── functions/                   # Sumber Supabase Edge Functions
│   └── *.sql                        # Skrip setup, keamanan, indeks, dan RPC
├── docs/
│   ├── REPOSITORY-STRUCTURE.md      # Panduan struktur dan konvensi
│   └── AUDIT-CLEANUP.md             # Riwayat pembersihan dan batas audit
├── CNAME                            # Domain GitHub Pages
├── robots.txt                       # Aturan crawler
├── sitemap.xml                     # Sitemap publik
└── README.md
```

### Konvensi penempatan file

| Jenis | Lokasi | Aturan |
|---|---|---|
| Halaman publik | Root, file `.html` | Dipertahankan di root agar URL lama tetap stabil. |
| Halaman admin | `admin/` | Khusus halaman panel administrasi. |
| Logo dan gambar brand | `assets/images/brand/` | Logo, ikon identitas, dan aset brand. |
| Gambar fitur | `assets/images/` | QRIS dan gambar fitur lain. |
| CSS | `assets/css/` | Pisahkan per halaman/komponen; periksa cascade sebelum menggabungkan. |
| JavaScript browser | `assets/js/` | Modul frontend; jangan menyimpan secret di sini. |
| SQL dan Edge Functions | `supabase/` | Skrip database dan sumber fungsi backend. |
| Dokumentasi | `docs/` | Panduan, keputusan struktur, audit, dan catatan pemeliharaan. |

Gunakan nama huruf kecil yang deskriptif dengan tanda hubung, misalnya `home-announcement.js`. Hindari membuat salinan file dengan nama seperti `final-v2-old` atau menyimpan cache build di repository. GitHub Pages menyajikan aset langsung; tidak ada folder build/cache yang perlu disimpan untuk website statis ini.

## Peta aset frontend

### CSS utama
- `style.css` — gaya dasar/beranda.
- `modern-theme.css`, `blue-theme.css`, `home-blue-redesign.css` — tema dan desain beranda.
- `global-menu.css` — menu global.
- `auth.css`, `auth-visitor.css` — autentikasi dasar dan akses visitor.
- `login-layout.css` — tata letak login responsif, benefit member, akses tamu, dan animasi meteor biru.
- `calculator.css`, `requirements.css` — halaman tools.
- `joki-matthew.css`, `your-order.css`, `worker-inbox.css`, `support.css` — layanan dan halaman terkait.
- `admin-dashboard.css`, `tokens.css`, `floating-cs.css` — admin, token desain, dan tombol CS.

### JavaScript utama
- `supabase.js`, `session-manager.js` — inisialisasi Supabase dan pengelolaan sesi.
- `auth.js`, `home-auth.js`, `home-visitor.js` — alur akun.
- `home.js`, `home-navigation.js`, `home-effects.js`, `home-announcement.js` — interaksi beranda.
- `home-orders.js`, `your-order.js`, `public-reviews.js` — pesanan dan ulasan.
- `calculator.js`, `requirements.js` — tools.
- `admin.js`, `admin-features.js`, `admin-joki-progress.js` — fitur admin.
- `inbox.js`, `worker-application.js`, `joki-matthew.js`, `floating-cs.js`, `global-menu.js` — modul fitur terkait.

Jangan menghapus modul hanya karena tidak langsung terlihat di beranda. Telusuri seluruh HTML/CSS/JS, pemanggilan dinamis, dan halaman khusus sebelum menyimpulkan file tidak dipakai.

## Supabase dan backend

Sumber SQL terdokumentasi disimpan di `supabase/*.sql`. Kode Edge Function ada di `supabase/functions/<nama-fungsi>/index.ts`, antara lain:

- `inbox-send`
- `telegram-order-notify`
- `worker-application-submit`

Nama file SQL di repository tidak selalu berarti skrip tersebut sudah diterapkan pada proyek produksi atau aman dijalankan berulang kali. Baca isi skrip, prasyarat, urutan migrasi, dan dampaknya sebelum menjalankannya.

### Keamanan wajib

1. Jangan pernah meng-commit Supabase `service_role` key, password database, token bot Telegram, access token, atau secret lain.
2. Secret Edge Function harus disimpan di pengelolaan secrets Supabase.
3. Publishable/anon key yang dipakai di browser bukan pengganti Row Level Security (RLS).
4. Semua tabel yang berisi profil, pesanan, progres, ulasan, voucher, pesan, notifikasi, atau data admin perlu policy RLS yang sesuai.
5. Validasi hak akses di backend/database; menyembunyikan tombol di frontend bukan perlindungan.
6. Perubahan role, status pesanan, voucher, dan tindakan administratif harus divalidasi di backend.
7. Saat mengubah Edge Function, periksa signature/otorisasi request, validasi input, secret, dan konfigurasi webhook.
8. Jangan menjalankan SQL produksi tanpa meninjau constraint, policy, fungsi, trigger, dan dampak pada data yang sudah ada.

### Autentikasi

Saat mengubah login/registrasi/verifikasi/reset password, periksa bersama-sama:
- `login.html`, `register.html`, `reset-password.html`, `email-confirmed.html`
- `assets/js/auth.js`, `assets/js/supabase.js`, `assets/js/session-manager.js`
- Site URL dan Redirect URLs pada konfigurasi Supabase.

Konfirmasi email tidak seharusnya otomatis dianggap sebagai login; ikuti alur aplikasi yang meminta pengguna login secara terpisah. Setelah login akun berhasil, seluruh role diarahkan ke `/index.html`; parameter `?next=` sengaja diabaikan. Handler login juga hanya melanjutkan jika profil pengguna tersedia dan `account_status` bernilai `active`.

## Cache dan versi aset

Parameter seperti `?v=20261104-2` pada `src`/ `href` adalah **cache-busting query string**, bukan file cache tambahan. Pertahankan atau perbarui versi tersebut saat konten aset berubah agar browser meminta versi baru. Jangan menghapus parameter versi secara massal tanpa alasan.

Tidak perlu menambahkan folder cache/build untuk situs GitHub Pages statis ini. Bersihkan hanya file sumber yang terbukti tidak lagi dipakai. Browser cache pengguna tidak dapat dihapus dari repository; perubahan URL versi aset membantu browser mengambil file terbaru.

## Cara aman mengubah struktur

1. Ambil status branch `main` dan daftar file terkini.
2. Cari semua referensi file di HTML, CSS, JavaScript, Markdown, SQL, sitemap, dan konfigurasi.
3. Periksa URL yang dibentuk dinamis, `fetch()`, `import()`, `@import`, favicon, callback, serta jalur relatif dari folder `admin/`.
4. Pindahkan aset dengan memperbarui seluruh referensi pada commit yang sama atau rangkaian commit yang terkontrol.
5. Jangan mengubah nama halaman publik tanpa meninjau tautan, sitemap, redirect, dan callback.
6. Catat file yang dihapus dan alasan penghapusan di `docs/AUDIT-CLEANUP.md`.
7. Jalankan pemeriksaan sintaks JavaScript, pemeriksaan tautan/aset lokal, dan validasi HTML/CSS.
8. Uji browser desktop dan ponsel serta periksa console/network.
9. Uji autentikasi, visitor, tools, pesanan, member, Inbox, dan admin sesuai area yang berubah.
10. Pastikan status deployment GitHub Pages dan custom domain sebelum menyatakan perubahan tayang.

## GitHub Pages dan domain

- `index.html` adalah entry point.
- `CNAME` menyimpan domain kustom `matthewrok.my.id`; jangan menghapus atau mengganti isinya tanpa rencana migrasi domain.
- `robots.txt` dan `sitemap.xml` perlu tetap sinkron dengan halaman publik yang ingin diindeks.
- Aturan crawler bukan mekanisme keamanan; area admin tetap harus dilindungi autentikasi dan otorisasi backend.
- Jika situs tidak terbarui, periksa commit branch publikasi, status deployment Pages, jalur aset, query versi, DNS, dan HTTPS.

## Dokumentasi pemeliharaan

- [Panduan struktur repository](docs/REPOSITORY-STRUCTURE.md)
- [Riwayat audit dan cleanup](docs/AUDIT-CLEANUP.md)
- [Rancangan Maintenance Mode 2.0](docs/MAINTENANCE-MODE-2.0.md)
- [Checklist PR #13 — Member Center 2.0](docs/PR-13-MEMBER-CENTER-2.0.md)
- [Rencana migrasi token pelacakan](docs/TRACKING-TOKEN-MIGRATION.md)
- supabase/tracking-token-v2.sql — migrasi token pelacakan 256-bit (tahap expand sudah diterapkan di Supabase produksi).
- supabase/tracking-token-v2-cutover.sql — pencabutan RPC token lama; jalankan setelah frontend baru tayang dan token baru sudah dikirim ke pelanggan.

## Batas audit

Pencarian referensi dan pemeriksaan sintaks adalah pemeriksaan statis. Itu tidak membuktikan tampilan visual, aksesibilitas, autentikasi, kebijakan RLS, integrasi Telegram, atau proses pesanan bekerja end-to-end. Catat bagian yang belum diuji dan jangan menyatakan lulus pengujian jika belum dijalankan.
## Akses halaman privat dan autentikasi

File assets/js/access-guard.js dijalankan setelah inisialisasi Supabase pada halaman privat. Guard memvalidasi sesi, memverifikasi pengguna melalui Auth, membaca profiles.role dan profiles.account_status, lalu hanya menampilkan halaman jika akun berstatus active dan role diizinkan.

| Halaman | Role yang diizinkan |
|---|---|
| /admin/* | admin |
| /worker.html | member, sultan, matthew, pelanggan, worker, macul, admin |
| /inbox.html, /your-order.html, /member-dashboard.html | Role terdaftar yang sama |

Role worker memiliki dua jenis tugas: `macul` untuk petani/farmer dan `worker` untuk pembuat akun atau penjoki akun. Keduanya termasuk kelompok worker dan diizinkan membuka halaman worker, Inbox, pesanan, serta dashboard sesuai allowlist guard; keduanya tidak mendapat akses admin. Visitor menggunakan sessionStorage tersendiri dan tidak dianggap sebagai pengguna Supabase terautentikasi. Karena itu visitor tidak memenuhi pemeriksaan guard halaman privat. Setelah login berhasil, semua role selalu diarahkan ke `/index.html`; parameter `next` diabaikan sepenuhnya.

**Batas keamanan penting:** GitHub Pages menyajikan HTML dan aset sebagai file statis. Guard browser hanya mengendalikan alur tampilan; ia bukan batas keamanan server dan tidak membuat file HTML tidak dapat diunduh. Semua data dan operasi sensitif wajib tetap dilindungi oleh Supabase RLS, validasi kepemilikan, serta pemeriksaan role di RPC/Edge Functions. Jangan pernah menaruh service-role key atau secret di frontend.

Lihat docs/ACCESS-CONTROL.md untuk skenario uji manual. Pengujian browser dengan akun nyata perlu dilakukan sebelum menyatakan seluruh alur lulus end-to-end.
