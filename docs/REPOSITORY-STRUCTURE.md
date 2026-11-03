# Panduan struktur repository

## Prinsip utama

- **Halaman publik:** HTML yang menjadi URL situs tetap di root repository untuk menjaga kompatibilitas GitHub Pages.
- **Halaman administrasi:** halaman khusus admin diletakkan di `admin/`.
- **CSS:** stylesheet berada di `assets/css/`.
- **JavaScript browser:** skrip berada di `assets/js/`; hindari menyatukan semua logika ke satu file besar.
- **SQL:** setup database dan kebijakan yang terdokumentasi berada di `supabase/`.
- **Dokumentasi:** panduan teknis tambahan berada di `docs/`.

## Aturan saat memindahkan file

1. Cari nama file dan semua referensinya di HTML, CSS, JavaScript, konfigurasi, sitemap, dan tautan antarhalaman.
2. Periksa jalur relatif dan absolut. Halaman di subfolder seperti `admin/` sering membutuhkan jalur aset berbeda dari halaman root.
3. Periksa callback URL dan redirect URL Supabase sebelum memindahkan halaman login, registrasi, reset password, atau konfirmasi email.
4. Pertahankan lokasi `CNAME`, `robots.txt`, dan `sitemap.xml`, kecuali ada rencana perubahan konfigurasi domain/SEO.
5. Setelah perubahan, uji halaman desktop dan ponsel, login/visitor, tautan internal, fitur admin, dan konsol browser.

## Perawatan berkala

- Hapus file hanya setelah memastikan tidak direferensikan.
- Hindari duplikasi CSS global dan jangan menambahkan aturan yang bertentangan tanpa mengecek cascade.
- Gunakan nama file huruf kecil dengan tanda hubung, contohnya `home-announcement.js`.
- Jangan menaruh kredensial rahasia atau service-role key di file frontend.
- Pastikan RLS database membatasi data sesuai peran. Menyembunyikan elemen UI tidak menggantikan kontrol akses database.
- Dokumentasikan perubahan skema Supabase dan urutan menjalankan skrip SQL.
