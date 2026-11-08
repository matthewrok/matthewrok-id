# Access Control — MATTHEW JOKI

## Tujuan
Mendokumentasikan perlindungan halaman privat dan skenario uji sebelum publikasi. Guard browser mengendalikan alur tampilan, bukan pengganti otorisasi server.

## Implementasi
- Muat Supabase SDK, /assets/js/supabase.js, lalu /assets/js/access-guard.js secara sinkron di head pada setiap halaman privat.
- Guard menyembunyikan body sampai pemeriksaan selesai.
- auth.getSession() memastikan sesi tersedia; auth.getUser() memvalidasi pengguna terhadap Auth.
- Guard membaca role dan account_status dari profil pengguna.
- Hanya account_status active yang diizinkan.
- /admin/* hanya untuk role admin.
- Kelompok worker terdiri dari dua role: `macul` untuk petani/farmer dan `worker` untuk pembuat akun atau penjoki akun. Keduanya diizinkan pada halaman worker, Inbox, pesanan, dan dashboard member, tetapi tidak pada /admin/*.
- Visitor disimpan di sessionStorage dan tidak mempunyai sesi Auth, sehingga tidak lolos guard.
- Halaman privat boleh menyertakan parameter `next` saat meminta login, tetapi handler login sengaja mengabaikannya: semua login akun berakhir di `/index.html`.

## Skenario uji manual
| No. | Kondisi | Hasil yang diharapkan |
|---|---|---|
| 1 | Buka /worker.html tanpa sesi | Dialihkan ke login |
| 2 | Buka /inbox.html tanpa sesi | Dialihkan ke login |
| 3 | Buka /your-order.html tanpa sesi | Dialihkan ke login |
| 4 | Buka /admin/dashboard.html tanpa sesi | Dialihkan ke login |
| 5 | Masuk sebagai visitor lalu buka halaman privat | Dialihkan ke login |
| 6 | Member membuka /admin/dashboard.html | Akses ditolak |
| 7 | Member berstatus active membuka dashboard/inbox/pesanan | Diizinkan |
| 8 | Role `worker` (pembuat akun/penjoki akun) berstatus active membuka worker/inbox | Diizinkan |
| 8a | Role `macul` (petani/farmer) berstatus active membuka worker/inbox | Diizinkan |
| 9 | Akun dengan status selain active | Sesi lokal diakhiri dan dialihkan ke login |
| 10 | Akun belum verifikasi email | Dialihkan ke login |
| 11 | Admin membuka halaman di /admin/ | Diizinkan |
| 12 | Login setelah diminta membuka halaman privat | Selalu menuju `/index.html`, tanpa memulihkan path privat |
| 13 | Parameter `next` berisi URL eksternal, path privat, atau path tak diizinkan | Seluruhnya diabaikan; masuk ke `/index.html` |

## Pengamanan backend yang tetap wajib
1. Audit RLS untuk semua tabel pada schema terekspos.
2. Pastikan query pesanan hanya mengembalikan pesanan milik pengguna yang login, kecuali admin terotorisasi.
3. Semua RPC/Edge Function administratif harus memeriksa identitas dan role dari sumber tepercaya; jangan percaya user metadata atau input browser.
4. Tinjau fungsi SECURITY DEFINER dan hak EXECUTE berdasarkan tujuan tiap fungsi sebelum mengubah grant.
5. Jangan membuka tabel riwayat admin atau state Telegram ke anon/authenticated tanpa kebutuhan dan kebijakan eksplisit.
6. Jangan memasukkan service-role key, token bot, atau secret ke JavaScript frontend.

## Batasan dan status verifikasi
- File HTML statis tetap dapat diminta langsung dari GitHub Pages; guard hanya mencegah halaman privat ditampilkan melalui alur normal browser.
- Login menolak melanjutkan jika profil tidak ditemukan atau `account_status` bukan `active`; status `suspended` mendapat pesan khusus.
- Setelah login berhasil, semua role diarahkan ke `/index.html`; parameter `next` tidak digunakan sebagai tujuan redirect.
- Pemeriksaan statis bukan pengganti uji browser dengan akun visitor, member, worker, macul, admin, belum verifikasi, profil hilang, dan suspended.
- Lakukan pengujian setelah deployment dan periksa log Supabase bila ada kegagalan akses.

## Temuan audit Supabase yang belum diubah

Pemeriksaan advisor pada project menemukan beberapa hal yang perlu ditinjau terpisah dari perubahan frontend ini:

- RLS aktif tanpa policy pada tabel joki_order_history dan telegram_command_state. Kondisi ini dapat disengaja jika akses memang hanya melalui backend/service role; jangan menambahkan policy publik hanya untuk menghilangkan peringatan.
- Advisor menandai beberapa SECURITY DEFINER RPC yang dapat dipanggil oleh anon atau authenticated, termasuk fungsi publik untuk review/progress dan fungsi administratif. Periksa isi setiap fungsi, validasi token/identitas, search_path, serta kebutuhan akses sebelum mengubah EXECUTE grants. Jangan melakukan revoke massal karena beberapa fungsi memang menjadi API aplikasi.
- Perlindungan password bocor (Have I Been Pwned) pada Supabase Auth saat audit masih nonaktif. Aktifkan melalui pengaturan Auth setelah memastikan kebijakan password yang dipakai.
- Tabel profiles memiliki role `macul` pada satu akun saat audit. Pengguna telah mengonfirmasi bahwa `macul` adalah role petani/farmer, sedangkan `worker` adalah pembuat akun atau penjoki akun. Keduanya kini masuk allowlist halaman privat non-admin. Tidak ada akses admin yang diberikan kepada keduanya.

Temuan ini dicatat untuk tindak lanjut. Tidak ada perubahan skema, policy, grant, function, maupun konfigurasi Auth yang dilakukan pada database produksi dalam PR ini.


## Hasil pemeriksaan pra-merge (6 November 2026)

- Pengujian otomatis tersedia di `tests/auth-regression.test.cjs` dan dijalankan GitHub Actions melalui `.github/workflows/auth-regression.yml`.
- Cakupan tes: redirect homepage untuk seluruh role yang didukung meskipun ada parameter `next`; penolakan akun suspended/profil tidak tersedia; pembersihan sesi lokal saat pemeriksaan Auth/profil gagal; timer sesi dibersihkan setelah sign-out; serta matriks akses halaman worker/member dan admin.
- Pemeriksaan database produksi: `public.profiles` memiliki RLS aktif dan hak `SELECT` untuk role `authenticated`. Policy SELECT mengizinkan pengguna membaca baris miliknya berdasarkan `auth.uid() = id`, serta admin melalui policy khusus.
- Simulasi query sebagai role PostgreSQL `authenticated` dengan JWT subject akun member menghasilkan `own_profile_visible = 1` dan `total_profiles_visible = 1` dari 6 profil. Ini mengonfirmasi RLS tidak menghalangi akun member membaca profilnya sendiri, tanpa membuka profil pengguna lain.
- Model Role terbaru: `admin`, `warga biasa`, `warga tidak biasa`, dan `warga sultan`. Kenaikan otomatis dihitung dari pesanan berstatus `Selesai`; status worker disimpan terpisah dari role akun.
- Pengujian otomatis ini menjalankan kode browser melalui mock DOM/Auth, bukan browser sungguhan. Uji login manual di browser dengan akun produksi tetap disarankan setelah deployment.
