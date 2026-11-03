# Panduan struktur repository

Dokumen ini menjelaskan penempatan file dan aturan aman saat merapikan repository Matthew Joki.

## Peta direktori

```text
.
├── *.html                 # Halaman publik dan alur autentikasi
├── CNAME                  # Custom domain GitHub Pages
├── robots.txt             # Aturan crawling
├── sitemap.xml            # Daftar URL publik
├── admin/                 # Halaman dashboard dan pengelolaan progres
├── assets/
│   ├── css/               # Stylesheet per halaman dan komponen bersama
│   ├── js/                # Modul JavaScript browser
│   └── images/            # Gambar dan dokumentasi aset
├── supabase/              # SQL setup/migrasi serta sumber Edge Function terdokumentasi
└── docs/                  # Dokumentasi teknis dan laporan audit
```

## Prinsip penempatan

- **Halaman publik tetap di root.** Lokasi ini menjaga URL GitHub Pages yang sudah dipakai dan mengurangi risiko link/callback rusak.
- **Halaman administrasi di `admin/`.** Perhatikan bahwa jalur relatif dari subfolder berbeda dari jalur halaman root.
- **CSS di `assets/css/`.** Pisahkan stylesheet berdasarkan halaman/komponen; jangan membuat duplikat aturan global tanpa memeriksa cascade.
- **JavaScript browser di `assets/js/`.** Pertahankan pemisahan modul autentikasi, beranda, kalkulator, layanan, dan administrasi.
- **SQL/backend terdokumentasi di `supabase/`.** Perubahan skema harus disertai catatan migrasi dan pemeriksaan RLS.
- **Dokumentasi di `docs/`.** Simpan hasil audit, keputusan struktur, dan instruksi pemeliharaan.
- Gunakan nama file huruf kecil, deskriptif, dan tanda hubung.

## Aturan sebelum memindahkan atau menghapus file

1. Cari semua referensi nama file pada HTML, CSS, JavaScript, SQL, Markdown, JSON/YAML, sitemap, dan konfigurasi.
2. Periksa pemanggilan dinamis seperti `fetch()`, `import()`, `setAttribute()`, template URL, dan nama file yang dibentuk saat runtime.
3. Periksa `<script>`, `<link>`, `@import`, `src`, `href`, `poster`, favicon, manifest, serta aset yang dipanggil dari CSS.
4. Periksa apakah file menjadi URL publik, redirect/callback autentikasi, target webhook, atau dependensi proses deployment.
5. Jangan menghapus file hanya karena namanya tidak muncul di satu halaman; pastikan cakupan pencarian mencakup seluruh repository.
6. Jika file dihapus, catat bukti tidak digunakannya file, alasan, dan commit di `docs/AUDIT-CLEANUP.md`.

## Keamanan dan konfigurasi

- Jangan pernah menyimpan service-role key, token bot Telegram, password, atau secret server di file browser maupun repository.
- Publishable/anon key di frontend tetap harus dilindungi dengan RLS dan kebijakan database yang ketat.
- Pemeriksaan role di UI bukan kontrol otorisasi. Operasi sensitif harus divalidasi di backend.
- Perubahan `CNAME`, `robots.txt`, `sitemap.xml`, dan konfigurasi GitHub Pages dapat memengaruhi domain, SEO, atau publikasi.
- Perubahan halaman login, registrasi, verifikasi, dan reset password harus ditinjau bersama konfigurasi Site URL/Redirect URLs Supabase.

## Checklist setelah perubahan

- [ ] Semua referensi file lokal dan tautan internal valid.
- [ ] Tidak ada asset lokal yang hilang.
- [ ] JavaScript lolos pemeriksaan sintaks.
- [ ] HTML dan CSS divalidasi.
- [ ] Tidak ada secret yang ikut ter-commit.
- [ ] Console dan Network browser diperiksa.
- [ ] Halaman diuji pada desktop dan ponsel.
- [ ] Alur autentikasi, visitor, tools, pesanan, dan halaman support diuji sesuai dampak perubahan.
- [ ] Fitur admin diuji dengan role yang sesuai dan RLS tetap membatasi akses.
- [ ] Deployment GitHub Pages dan custom domain diperiksa.
- [ ] README dan laporan audit diperbarui jika struktur atau perilaku berubah.

Pemeriksaan statis seperti pencarian referensi dan parser sintaks tidak menggantikan pengujian runtime/browser. Catat secara eksplisit bagian yang belum diuji; jangan menyatakan seluruh aplikasi lulus hanya berdasarkan pemeriksaan statis.

## Perawatan berkala

- Hapus kode/asset legacy secara bertahap, satu kelompok perubahan dalam satu commit yang mudah ditinjau.
- Hindari refactor CSS besar bersamaan dengan perubahan tampilan; bandingkan hasil visual sebelum dan sesudah.
- Tinjau dependensi eksternal, URL callback, dan kebijakan RLS secara terpisah.
- Dokumentasikan setiap migrasi database beserta urutan dan dampaknya.
- Pertahankan riwayat commit yang deskriptif agar perubahan mudah ditelusuri dan dipulihkan.
