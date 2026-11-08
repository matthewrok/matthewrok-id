# Audit worker application — 6 November 2026

## Jalur aplikasi aktif

- `assets/js/worker-application.js` membaca status aplikasi milik akun yang login.
- Pengiriman formulir dilakukan melalui `db.functions.invoke("worker-application-submit")`; frontend tidak melakukan INSERT langsung ke tabel.
- Edge Function memverifikasi bearer token melalui Supabase Auth, memastikan email terverifikasi, lalu membaca `profiles.role` dan `account_status` memakai service role.
- Hanya akun aktif dengan role `warga biasa`, `warga tidak biasa`, atau `warga sultan` yang dapat mengajukan worker. Jenis tugas `akun`/`macul` dan status aplikasi tetap terpisah dari role akun.
- Insert aplikasi dilakukan server-side oleh Edge Function menggunakan service role. Notifikasi Telegram dikirim setelah row tersimpan.

## Temuan policy lama

Database produksi masih memiliki policy `Public submit worker application` yang mengizinkan INSERT bagi anon dan authenticated selama applicant_id NULL dan status pending. Jalur frontend aktif tidak memakai policy ini. Policy tersebut merupakan jalur lama yang tidak lagi diperlukan dan dapat menciptakan aplikasi yatim/spam.

## Tindakan yang direkomendasikan

Siapkan perubahan SQL terpisah untuk:
1. Menghapus policy `Public submit worker application`.
2. Mencabut hak INSERT langsung dari anon dan authenticated pada `worker_applications`.
3. Mempertahankan hak INSERT server-side untuk service_role dan kebijakan SELECT bagi pemohon/admin.

Perubahan database belum diterapkan. Sebelum menjalankannya, verifikasi grants tabel dan lakukan uji submit menggunakan akun member aktif serta uji penolakan anon/visitor/nonaktif. Jangan menghapus policy SELECT milik pemohon atau admin.

## Status

Audit sumber frontend dan Edge Function selesai. Audit metadata policy produksi mengonfirmasi policy INSERT lama masih aktif. Tidak ada perubahan produksi, deployment Edge Function, atau perubahan grant dalam pemeriksaan ini.
