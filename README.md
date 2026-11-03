# Matthew Joki — Dragon Kingdom

Website resmi **Matthew Joki** untuk layanan dan panduan *Rise of Kingdoms*.

🌐 **Website:** https://matthewrok.my.id/  
📦 **Repository:** https://github.com/matthewrok/matthewrok-id

## Daftar fitur

| Area | Fitur |
| --- | --- |
| Beranda | Profil Matthew, daftar paket joki, navigasi, dan pengumuman berjalan RGB |
| Akun | Login, registrasi dengan verifikasi email, akses visitor, dan pemulihan kata sandi |
| Tools | Calculator Resource dan Requirements City Hall |
| Layanan | Produk joki, pembuatan pesanan, pelacakan progres menggunakan kode/token unik |
| Komunitas | Ulasan client dan Support Matthew |
| Admin | Pengelolaan anggota/role, notifikasi, voucher, progres pesanan, dan moderasi ulasan sesuai modul yang tersedia |

### Pengumuman berjalan

Ticker di beranda mengambil **notifikasi terbaru yang aktif untuk target “Semua pengunjung”** dari tabel Supabase `site_notifications`. Pesan yang dinonaktifkan atau kedaluwarsa tidak ditampilkan. Pengaturan teks dilakukan dari **Admin Dashboard → Pusat Notifikasi**.

Jika ticker tidak tampil, periksa koneksi Supabase, kolom tabel, dan kebijakan RLS agar pengunjung anonim hanya dapat membaca data pengumuman publik yang memang ditujukan untuk semua pengunjung. Jangan membuka akses publik ke data notifikasi member atau data admin.

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
│   ├── css/       # Gaya halaman dan tema bersama
│   ├── js/        # Logika halaman, autentikasi, admin, dan Supabase
│   └── images/    # Aset gambar jika digunakan
├── supabase/      # Skrip SQL setup/migrasi yang tersedia
├── docs/          # Dokumentasi pemeliharaan
├── CNAME
├── robots.txt
├── sitemap.xml
└── README.md
```

> Halaman HTML utama sengaja tetap di root. Jangan memindah atau mengganti nama halaman tanpa memperbarui tautan, canonical URL, callback autentikasi, sitemap, dan rute GitHub Pages yang terkait.

## Teknologi

- HTML5, CSS3, dan JavaScript
- Supabase untuk autentikasi, database, dan fitur dinamis
- GitHub Pages untuk hosting situs statis dengan custom domain

## Panduan pengembangan

1. Gunakan branch terpisah untuk perubahan besar; gabungkan ke `main` setelah ditinjau.
2. Letakkan stylesheet di `assets/css/`, skrip browser di `assets/js/`, dan aset visual di folder aset yang sesuai.
3. Gunakan nama file deskriptif dengan huruf kecil dan tanda hubung, misalnya `home-announcement.js`.
4. Perhatikan jalur aset: jalur berawalan `/` mengarah ke root domain, sedangkan jalur relatif mengikuti lokasi halaman HTML.
5. Sebelum menghapus atau memindahkan file, cari semua referensinya di HTML, CSS, JavaScript, sitemap, konfigurasi, dan callback Supabase.
6. Setelah perubahan, periksa konsol browser, tautan internal, autentikasi, halaman visitor, fitur admin, dan tampilan mobile. Jangan menyatakan pengujian berhasil sebelum benar-benar dijalankan.
7. Perubahan di `main` akan dipublikasikan oleh GitHub Pages sesuai konfigurasi repository. Waktu pembaruan dapat bervariasi.

## Supabase dan keamanan

- File `assets/js/supabase.js` menggunakan publishable key untuk aplikasi browser. Publishable key bukan pengganti kebijakan keamanan database.
- Jangan menyimpan `service_role key`, password, access token privat, atau rahasia server di repository publik.
- Terapkan dan audit Row Level Security (RLS) pada tabel. Pemeriksaan role di antarmuka saja tidak cukup untuk melindungi data.
- Untuk pengumuman ticker, akses anonim harus dibatasi pada notifikasi aktif, belum kedaluwarsa, dan ber-audience `all`. Jangan memberikan akses baca publik ke pengumuman khusus member.
- Skrip SQL di `supabase/` adalah dokumentasi setup. Tinjau isi dan dampaknya sebelum menjalankannya; jangan mengulang skrip migrasi tanpa memastikan aman untuk skema saat ini.

## Pemeliharaan struktur

Perapihan dilakukan secara konservatif: halaman publik tetap di root agar URL lama tidak rusak, sedangkan CSS, JavaScript, SQL, dan dokumentasi ditempatkan berdasarkan jenisnya. Catatan teknis tambahan diletakkan di folder `docs/`.
