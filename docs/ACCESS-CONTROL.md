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
- Visitor disimpan di sessionStorage dan tidak mempunyai sesi Auth, sehingga tidak lolos guard.
- Parameter next hanya menerima path privat yang diizinkan pada origin yang sama.

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
| 8 | Worker berstatus active membuka worker/inbox | Diizinkan |
| 9 | Akun dengan status selain active | Sesi lokal diakhiri dan dialihkan ke login |
| 10 | Akun belum verifikasi email | Dialihkan ke login |
| 11 | Admin membuka halaman di /admin/ | Diizinkan |
| 12 | Login setelah diminta membuka halaman privat | Kembali ke path privat internal yang diizinkan |
| 13 | Parameter next berisi URL eksternal atau path tak diizinkan | Diabaikan; masuk ke dashboard member |

## Pengamanan backend yang tetap wajib
1. Audit RLS untuk semua tabel pada schema terekspos.
2. Pastikan query pesanan hanya mengembalikan pesanan milik pengguna yang login, kecuali admin terotorisasi.
3. Semua RPC/Edge Function administratif harus memeriksa identitas dan role dari sumber tepercaya; jangan percaya user metadata atau input browser.
4. Tinjau fungsi SECURITY DEFINER dan hak EXECUTE berdasarkan tujuan tiap fungsi sebelum mengubah grant.
5. Jangan membuka tabel riwayat admin atau state Telegram ke anon/authenticated tanpa kebutuhan dan kebijakan eksplisit.
6. Jangan memasukkan service-role key, token bot, atau secret ke JavaScript frontend.

## Batasan dan status verifikasi
- File HTML statis tetap dapat diminta langsung dari GitHub Pages; guard hanya mencegah halaman privat ditampilkan melalui alur normal browser.
- Pemeriksaan statis bukan pengganti uji browser dengan akun visitor, member, worker, admin, belum verifikasi, dan suspended.
- Lakukan pengujian setelah deployment dan periksa log Supabase bila ada kegagalan akses.
