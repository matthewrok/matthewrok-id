# MATTHEW JOKI — Dragon Kingdom

Website resmi Matthew Joki untuk layanan dan komunitas **Rise of Kingdoms**.

🌐 **Website:** https://matthewrok.my.id/  
📦 **Repository:** https://github.com/matthewrok/matthewrok-id  
🚀 **Hosting:** GitHub Pages dengan custom domain.

## Fitur website

- **Beranda** — profil Matthew, informasi layanan, dan ulasan client.
- **Login & registrasi** — autentikasi menggunakan Supabase; registrasi memerlukan verifikasi email.
- **Reset kata sandi** — alur pemulihan akun.
- **Calculator Resource** — alat bantu perhitungan resource.
- **Requirements City Hall** — informasi kebutuhan upgrade City Hall di Rise of Kingdoms.
- **Lacak Progress** — client memasukkan kode random/token unik untuk melihat status dan progres pesanan.
- **Ulasan client** — menampilkan rating dan ulasan yang diizinkan untuk publik.
- **Support Matthew** — informasi dukungan.
- **Admin Dashboard** — pengelolaan role member, pesanan/progres client, dan moderasi ulasan. Halaman admin memerlukan role admin.

## Struktur repository

```text
.
├── index.html                    # Beranda
├── login.html                    # Login
├── register.html                 # Registrasi
├── reset-password.html           # Reset kata sandi
├── email-confirmed.html          # Konfirmasi/verifikasi email
├── calculator-resource.html      # Calculator Resource
├── requirements-city-hall.html   # Requirements City Hall
├── joki-matthew.html             # Lacak Progress dengan kode random
├── support-matthew.html          # Support Matthew
├── admin/
│   ├── dashboard.html            # Dashboard admin dan manajemen role
│   └── joki-progress.html        # Kelola token, progres, dan moderasi ulasan
├── assets/
│   ├── css/                      # Stylesheet halaman dan tema
│   ├── js/                       # JavaScript halaman, auth, Supabase, admin
│   └── images/                   # Artwork, gambar, dan QRIS
├── supabase/
│   ├── admin-role-management.sql  # Setup pengelolaan role admin
│   ├── joki-progress-setup.sql   # Setup database dan RPC progres joki
│   ├── joki-reviews-setup.sql    # Setup rating dan ulasan client
│   └── visitor-logs-setup.sql    # Setup log kunjungan visitor
├── robots.txt                    # Aturan crawler
├── sitemap.xml                  # Sitemap
├── CNAME                         # Custom domain GitHub Pages
└── README.md                     # Dokumentasi repository
```

## Teknologi

- HTML5, CSS3, dan JavaScript
- [Supabase](https://supabase.com/) untuk autentikasi dan database
- [GitHub Pages](https://pages.github.com/) untuk publikasi website

## Pengembangan dan pemeliharaan

1. Perubahan website dipublikasikan dari branch `main` melalui GitHub Pages.
2. Halaman HTML utama tetap berada di root agar URL dan jalur relatif yang sudah digunakan tetap berfungsi.
3. File CSS, JavaScript, dan gambar disimpan di `assets/css/`, `assets/js/`, dan `assets/images/`.
4. SQL setup Supabase disimpan di `supabase/`; jalankan hanya jika diperlukan dan setelah memeriksa skema/policy yang ada.
5. Jangan menghapus atau mengganti nama `CNAME` tanpa memperbarui konfigurasi domain GitHub Pages.
6. Sebelum menghapus file, periksa referensinya pada HTML, CSS, JavaScript, dan konfigurasi. Hindari perubahan massal yang bisa memutus login, verifikasi email, pelacakan token, atau akses admin.
7. Kunci publishable Supabase yang dipakai frontend bukan pengganti kebijakan keamanan. Jangan pernah memasukkan `service_role key`, kata sandi, token privat, atau rahasia lain ke file publik.

## Catatan keamanan

Pemeriksaan role pada antarmuka admin harus didukung oleh kebijakan **Row Level Security (RLS)** dan kontrol akses di database. Jangan menganggap menyembunyikan tautan admin saja sebagai perlindungan data.
