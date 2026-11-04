# Audit dan pembersihan repository

Tanggal: 4 November 2026

## Perubahan yang diterapkan

| File | Tindakan | Alasan |
| --- | --- | --- |
| `assets/images/dragon-kingdom-hero.webp` | Dihapus | Tidak ditemukan referensi pada hasil pencarian repository. |
| `assets/images/dragon-kingdom.png` | Dihapus | Tidak ditemukan referensi pada hasil pencarian repository. |
| `assets/images/dragon-character.png` | Dihapus | Referensi runtime tidak ditemukan; empat referensi CSS lama yang tertinggal kemudian dibersihkan. |
| `assets/js/main.js` | Dihapus | Tidak direferensikan oleh halaman HTML; selector yang ditangani skrip juga tidak ditemukan di beranda. |
| `assets/css/style.css` | Dibersihkan | Menghapus komentar dan lapisan gambar yang menunjuk ke aset yang sudah tidak digunakan. |
| `assets/css/city-hall.css` | Dihapus | Tidak ditemukan pemanggil/import aktif. |
| `assets/css/admin.css` | Dihapus | Tidak ditemukan pemanggil/import aktif. |
| `assets/css` terkait | Dibersihkan | Menghapus deklarasi `@import tokens.css` yang berulang pada stylesheet City Hall sebelum file legacy dihapus. |

## Aset gambar yang dipertahankan

- `assets/images/brand/logo-matthew.png` — logo utama yang direferensikan oleh `index.html`; dipindahkan dari root agar aset brand terstruktur.
- `assets/images/qris-matthew.jpeg` — digunakan oleh `support-matthew.html`.
- `assets/images/README.txt` — catatan bahwa visual naga/warrior hero dibuat dari inline SVG dan CSS.

## Verifikasi lanjutan — 4 November 2026

- Ditemukan empat referensi CSS aktif ke `../images/dragon-character.png` setelah aset tersebut dihapus.
- Lapisan gambar yang rusak dihapus dengan tetap mempertahankan gradient pada deklarasi background.
- Pemeriksaan ulang branch `main` menemukan **0 referensi tersisa** ke `dragon-character.png`.
- Commit perbaikan: `9722fa755020dcfe0004e9372f1533a045bca0e6`.

## Audit statis lanjutan — 4 November 2026

### Tindakan dan hasil

- Memeriksa referensi `src`, `href`, dan `poster` pada 11 halaman HTML. Hasil pemeriksaan jalur lokal: **0 referensi file yang tidak ditemukan** setelah normalisasi `./` dan `../`.
- Memeriksa tautan fragmen internal `href="#..."` pada 11 halaman HTML. Hasil: **0 target ID yang hilang**.
- Menjalankan pemeriksaan sintaks JavaScript statis untuk 19 file JavaScript. Hasil: **19/19 lolos**. Pemeriksaan ini hanya mem-parsing sintaks, bukan menjalankan aplikasi.
- Menghapus dua stylesheet legacy yang tidak dirujuk: `assets/css/admin.css` dan `assets/css/city-hall.css`.

### Commit pembersihan tambahan

- Hapus `assets/css/admin.css`: `23bc1de5d1ca9cd2ed4c0893ce1c86cf836db502`.
- Hapus `assets/css/city-hall.css`: `4bf58b59f5279d069ebc28266ce7bd1c661f23bd`.

## Dokumentasi repository — 4 November 2026

- `README.md` diperluas dengan peta fitur, struktur direktori, arsitektur frontend/backend, alur autentikasi, keamanan Supabase/RLS, integrasi Telegram, publikasi GitHub Pages, dan checklist pemeliharaan.
- `docs/REPOSITORY-STRUCTURE.md` diperbarui dengan aturan pemindahan/penghapusan file, keamanan konfigurasi, dan checklist rilis.
- Dokumentasi tidak mengklaim pengujian browser atau end-to-end yang belum dilakukan.

## Penataan aset dan penghapusan legacy — 4 November 2026

- Memindahkan `logo-matthew.png` dari root ke `assets/images/brand/logo-matthew.png` menggunakan blob Git yang sama, sehingga file gambar 6,9 MB tidak perlu diunggah ulang sebagai salinan.
- Memperbarui dua referensi logo di `index.html` ke lokasi baru.
- Memperbarui `README.md`, `docs/REPOSITORY-STRUCTURE.md`, dan `assets/images/README.txt` agar mencerminkan struktur aset terbaru.
- Mengidentifikasi `assets/js/city-hall.js` sebagai skrip legacy yang tidak direferensikan oleh halaman maupun source yang dicari; fungsinya tampak berasal dari versi pencarian lama dan halaman City Hall saat ini menggunakan `assets/js/requirements.js`. File tersebut dihapus setelah pemeriksaan referensi statis.
- Cache browser tidak bisa dibersihkan dari repository. Parameter `?v=...` adalah cache-busting URL dan bukan file cache yang harus dihapus.

## Batas verifikasi

- Audit di atas adalah pemeriksaan statis melalui sumber repository. Pemeriksaan referensi tidak selalu menemukan URL/path yang dirakit secara dinamis saat runtime.
- Pemeriksaan sintaks JavaScript tidak membuktikan perilaku runtime, integrasi Supabase, kebijakan RLS, autentikasi, tampilan visual, atau kompatibilitas perangkat.
- CSS belum divalidasi dengan validator khusus dan seluruh tautan eksternal belum diuji melalui HTTP.
- Pengujian browser desktop/mobile, console/network, autentikasi, database, dan alur end-to-end masih perlu dilakukan secara terpisah.
- Penghapusan melalui GitHub tercatat di riwayat commit dan dapat ditinjau/dipulihkan dari riwayat bila diperlukan.

## Pemeriksaan lanjutan yang disarankan

1. Audit CSS untuk aturan duplikat/override dengan pembanding visual per halaman.
2. Validasi HTML dan CSS dengan validator khusus.
3. Uji seluruh halaman di browser desktop dan ponsel serta periksa console/network.
4. Uji alur autentikasi, visitor, pesanan, kalkulator, dan modul admin dengan akun/role yang sesuai.
5. Audit RLS dan secret Edge Function secara terpisah dari pembersihan frontend.

## Audit keamanan Supabase — 5 November 2026

Pemeriksaan dilakukan secara read-only terhadap advisor Supabase, metadata tabel/RLS, definisi fungsi RPC, dan sumber Edge Functions aktif. Pemeriksaan ini bukan penetration test dan tidak mengubah database produksi.

### Temuan prioritas

1. **Token pelacakan pesanan memiliki entropi rendah.** Fungsi `public.create_joki_order` membuat nomor/token dengan awalan tanggal dan hanya 8 karakter heksadesimal acak. RPC `lookup_joki_progress`, `lookup_joki_review`, dan `submit_joki_review` dapat dipanggil oleh peran `anon`; fungsi pencarian tidak menunjukkan pembatasan percobaan atau pembatasan laju. Karena token menjadi kunci akses publik, kombinasi ini berisiko ditebak/di-enumerasi. Rekomendasi: tingkatkan token acak untuk pesanan baru menjadi setidaknya 128 bit dari sumber acak kriptografis, pisahkan token publik dari nomor pesanan bila memungkinkan, tambahkan rate limiting dan pemantauan, serta tinjau ulang eksposur data fungsi lookup. Token lama tetap memerlukan strategi migrasi tersendiri.
2. **Perlindungan kata sandi bocor nonaktif.** Supabase Security Advisor melaporkan leaked-password protection belum diaktifkan. Tindakan yang disarankan: aktifkan melalui konfigurasi Auth proyek bila paket mendukung, lalu uji pendaftaran dan perubahan kata sandi.
3. **Fungsi SECURITY DEFINER yang dapat dipanggil pengguna.** Advisor melaporkan beberapa RPC berhak istimewa. Pemeriksaan isi fungsi yang diambil menunjukkan `admin_set_member_role` memeriksa `auth.uid()` dan role `admin`; `admin_set_member_status` memakai pemeriksaan admin; `create_joki_order` menolak sesi anonim dan memvalidasi kuantitas 4–12, produk, email akun, Kingdom, dan voucher. Namun, seluruh fungsi tetap perlu audit otorisasi per fungsi dan uji negatif. Jangan mencabut grant massal tanpa memetakan pemanggil aplikasi karena dapat merusak fitur.
4. **Tabel internal RLS tanpa policy.** Advisor mencatat `joki_order_history` dan `telegram_command_state` memiliki RLS aktif tanpa policy. Ini dapat disengaja untuk akses service-role/backend saja; pertahankan keadaan ini sampai pola akses backend diverifikasi.
5. **Edge Functions yang menonaktifkan verifikasi JWT otomatis.** `telegram-order-notify` memeriksa secret webhook dan membatasi chat/pengirim ke chat admin yang dikonfigurasi. `inbox-send` memvalidasi bearer token melalui Auth, memeriksa email terverifikasi, lalu memverifikasi role admin sebelum mengirim pesan. Karena pemeriksaan dilakukan manual, perubahan fungsi harus mempertahankan pemeriksaan ini dan menguji permintaan tanpa token, token tidak valid, serta pengguna non-admin.

### Temuan performa

Advisor menandai beberapa indeks belum digunakan dan beberapa tabel memiliki policy permisif ganda. Tidak ada indeks atau policy yang dihapus/diubah karena statistik pemakaian dan semantik policy perlu ditinjau lebih lanjut; penghapusan indeks/policy secara spekulatif dapat menurunkan performa atau mengubah akses.

### Status tindakan

- [x] Pemeriksaan read-only advisor keamanan dan performa.
- [x] Pemeriksaan definisi RPC yang dipilih serta alur otorisasi Edge Function.
- [ ] Perbaikan token publik dan strategi kompatibilitas token lama.
- [ ] Mengaktifkan leaked-password protection pada konfigurasi Auth.
- [ ] Uji negatif end-to-end untuk role non-admin, visitor, dan token pelacakan tidak valid.
- [ ] Audit lengkap seluruh RPC SECURITY DEFINER dan kebijakan RLS.

**Catatan:** temuan ini dicatat sebagai pekerjaan lanjutan. Belum ada perubahan schema, grant, Edge Function, atau konfigurasi Auth produksi yang dilakukan dalam audit ini.

