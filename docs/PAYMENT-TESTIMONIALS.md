# Bukti Pembayaran & Testimoni

## Fitur
- Halaman publik: `/testimonials.html`.
- Halaman pengelolaan khusus admin: `/admin/testimonials.html`.
- Foto diproses di browser menggunakan Canvas sebelum upload; watermark menjadi bagian permanen dari gambar WebP.
- Watermark hybrid: logo MATTHEW di area tengah dan tulisan MATTHEW JOKI berulang diagonal.
- Admin dapat mempublikasikan, menyembunyikan, dan menghapus dokumentasi.
- File gambar disimpan di bucket publik `payment-testimonials`; hanya admin aktif yang boleh mengunggah atau menghapus file.
- Metadata disimpan di tabel `public.payment_testimonials`; publik hanya dapat membaca baris yang dipublikasikan.

## Aktivasi Supabase
Setelah PR disetujui dan digabung:
1. Tinjau lalu jalankan `supabase/payment_testimonials_setup.sql` pada proyek Supabase `matthew-joki`.
2. Pastikan tabel `payment_testimonials` tersedia melalui Data API.
3. Pastikan bucket `payment-testimonials` berstatus public dan batas upload 8 MB dengan MIME `image/webp`.
4. Jalankan Security Advisor dan pastikan policy RLS tabel serta Storage aktif.

Jangan pernah memasukkan service-role key atau secret Supabase ke frontend/repository.

## Catatan privasi
Sebelum upload, admin wajib menyamarkan nomor rekening, nomor telepon, alamat email, saldo, nomor referensi, atau data sensitif lain yang tidak diperlukan. Watermark bukan pengganti penyamaran informasi sensitif.
