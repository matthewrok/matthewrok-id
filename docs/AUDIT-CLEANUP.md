# Audit dan pembersihan repository

Tanggal: 4 November 2026

## Perubahan yang diterapkan

| File | Tindakan | Alasan |
| --- | --- | --- |
| `assets/images/dragon-kingdom-hero.webp` | Dihapus | Tidak ditemukan referensi pada hasil pencarian repository. |
| `assets/images/dragon-kingdom.png` | Dihapus | Tidak ditemukan referensi pada hasil pencarian repository. |
| `assets/images/dragon-character.png` | Dihapus | Hanya ditemukan pada komentar lama di stylesheet, bukan referensi runtime. |
| `assets/js/main.js` | Dihapus | Tidak direferensikan oleh halaman HTML; selector yang ditangani skrip juga tidak ditemukan di beranda. |
| `assets/css/style.css` | Dibersihkan | Menghapus komentar yang menunjuk ke gambar yang sudah tidak digunakan. |
| `assets/css/city-hall.css` | Dibersihkan | Menghapus deklarasi `@import tokens.css` yang berulang. |

## Aset gambar yang dipertahankan

- `logo-matthew.png` di root — digunakan oleh `index.html`.
- `assets/images/qris-matthew.jpeg` — digunakan oleh `support-matthew.html`.

File dokumentasi di `assets/images/README.txt` dipertahankan sebagai catatan aset.

## Batasan audit

- Referensi diperiksa melalui pohon file repository dan pencarian nama file. Aset yang mungkin dimuat secara dinamis dari URL yang dirakit saat runtime tetap perlu pemeriksaan manual tambahan.
- Tidak semua stylesheet digabungkan atau dirombak. Banyak selector yang tampak serupa bisa jadi merupakan override yang disengaja; penghapusan massal tanpa uji visual berisiko mengubah desain.
- Website belum diuji end-to-end di browser pada saat laporan ini ditulis. Setelah GitHub Pages menerbitkan perubahan, periksa beranda, login/registrasi, reset password, kalkulator, Requirements City Hall, halaman dukungan, dan dashboard admin.
- Penghapusan melalui GitHub tetap tercatat di riwayat commit sehingga perubahan dapat ditinjau dan dipulihkan dari riwayat bila diperlukan.

## Pemeriksaan lanjutan yang disarankan

1. Jalankan pengujian tautan internal dan aset yang hilang.
2. Periksa konsol browser pada halaman publik dan admin.
3. Audit selector CSS yang berulang per halaman, lalu lakukan refactor bertahap dengan tangkapan layar pembanding.
4. Tinjau kebijakan RLS Supabase secara terpisah dari pembersihan file frontend.


## Verifikasi lanjutan — 4 November 2026

- Ditemukan empat referensi CSS aktif ke `../images/dragon-character.png` setelah aset tersebut dihapus. Jalur itu tidak valid pada struktur repository saat ini.
- Diperbaiki dengan menghapus hanya lapisan gambar yang rusak, sambil mempertahankan lapisan gradient pada deklarasi background agar teks/overlay tetap terbaca.
- File diperiksa ulang dari branch `main`: sisa referensi `dragon-character.png` = 0.
- Commit perbaikan: `9722fa755020dcfe0004e9372f1533a045bca0e6`.
- Catatan batas verifikasi: pemeriksaan ini bersifat statis melalui GitHub. Situs live tidak dapat diakses oleh alat pemeriksaan pada sesi ini; browser visual, konsol, autentikasi, database/RLS, dan alur end-to-end belum dapat dinyatakan lulus.


## Audit statis lanjutan — 4 November 2026

### Tindakan dan hasil
- Memeriksa referensi `src`, `href`, dan `poster` pada 11 halaman HTML yang ada. Hasil pemeriksaan jalur lokal: **0 referensi ke file yang tidak ditemukan** setelah normalisasi `./` dan `../`.
- Memeriksa tautan fragmen internal `href="#..."` pada 11 halaman HTML. Hasil: **0 target ID yang hilang**.
- Menjalankan pemeriksaan sintaks JavaScript statis untuk seluruh **19 file JavaScript** di repository dengan parser sintaks JavaScript (tanpa mengeksekusi kode aplikasi). Hasil: **19/19 lolos**.
- Menghapus `assets/css/admin.css` dan `assets/css/city-hall.css` setelah pencarian repository dan pemeriksaan HTML/CSS tidak menemukan pemanggil/import untuk kedua file tersebut. Keduanya stylesheet legacy yang tidak dirujuk.

### Commit pembersihan tambahan
- Hapus `assets/css/admin.css`: `23bc1de5d1ca9cd2ed4c0893ce1c86cf836db502`.
- Hapus `assets/css/city-hall.css`: `4bf58b59f5279d069ebc28266ce7bd1c661f23bd`.

### Batas verifikasi
- Ini pemeriksaan statis atas sumber di branch `main`, bukan pengujian browser langsung.
- Pemeriksaan sintaks JavaScript tidak membuktikan perilaku runtime, integrasi Supabase, RLS, autentikasi, tampilan visual, atau kompatibilitas perangkat.
- CSS belum dijalankan melalui validator CSS khusus; tautan eksternal dan respons HTTP live belum diuji.
