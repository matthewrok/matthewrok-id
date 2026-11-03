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
