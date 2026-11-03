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

- `logo-matthew.png` di root — digunakan oleh `index.html`.
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
