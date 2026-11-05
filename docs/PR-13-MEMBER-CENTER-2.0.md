# PR #13 — MATTHEW JOKI Member Center 2.0

## Tujuan
Menjadikan PR ini sebagai pembaruan besar untuk pengalaman member, dimulai dari perbaikan tombol KELUAR yang tertutup Inbox/menu, lalu memperkuat dashboard, alur pesanan, notifikasi, membership, ulasan, aksesibilitas, performa, dan pengujian.

> Dokumen ini adalah ruang lingkup dan checklist audit. Item tidak boleh ditandai selesai sebelum implementasi dan pengujian benar-benar dilakukan. Perubahan database/RLS produksi memerlukan migrasi terpisah dan verifikasi keamanan; jangan menjalankan perubahan produksi secara otomatis.

## A. Header, navigasi, dan desain
- [x] Sisakan ruang aman untuk tombol KELUAR agar tidak tertutup Inbox dan menu tiga titik.
- [x] Atur ulang header pada viewport kecil.
- [ ] Audit tabrakan elemen fixed/sticky di seluruh halaman.
- [x] Selaraskan dashboard member dengan tema biru/navy premium (audit lintas halaman lain masih berjalan).
- [ ] Standarkan spacing, radius, tipografi, tombol, fokus keyboard, dan state hover.
- [ ] Pastikan animasi ringan dan menghormati prefers-reduced-motion.
- [ ] Uji lebar 320px, 360px, 390px, tablet, dan desktop.

## B. Profil dan status akun
- [x] Tampilkan nama, email, role, dan tanggal bergabung dari sesi/profil; status akun tetap mengikuti access guard dan pemeriksaan status yang tersedia.
- [x] Kegagalan query/exception dashboard menampilkan pesan pemulihan dan tombol coba lagi; pemeriksaan status akun tetap mengikuti access guard. Profil hilang masih perlu uji skenario database.
- [ ] Jangan mengizinkan user mengubah role atau status melalui UI member.
- [ ] Pengaturan profil hanya ditambahkan jika ada jalur backend/RLS yang aman.

## C. Ringkasan dan statistik
- [x] Ringkasan total pesanan, selesai, proses, dibatalkan, dan akumulasi nilai transaksi.
- [ ] Pastikan definisi status mengikuti nilai status backend yang sebenarnya (normalisasi konsisten).
- [ ] Statistik periode/grafik hanya ditampilkan jika data dan definisi agregasinya valid.
- [ ] Format mata uang, tanggal, dan angka konsisten untuk locale Indonesia.

## D. Pesanan, progres, dan invoice
- [ ] Riwayat pesanan dengan filter status dan urutan tanggal.
- [ ] Detail pesanan: kode, layanan, Kingdom, kuantitas, harga, voucher/diskon, dan total.
- [ ] Timeline progres yang membaca data backend, bukan progres buatan frontend.
- [ ] Tombol salin kode pesanan dengan fallback yang aksesibel.
- [ ] Invoice aman dari HTML injection dan menampilkan rincian yang benar.
- [x] State loading, error, dan retry dasar pada pemuatan dashboard; empty state pesanan tersedia. Filter/pagination masih terbuka.
- [ ] Validasi bahwa semua data berasal dari RPC/RLS yang hanya mengembalikan pesanan milik user.

## E. Notification Center dan Inbox
- [ ] Bedakan notifikasi perubahan pesanan dari pesan resmi Matthew.
- [ ] Tampilkan status terbaca/belum dibaca secara akurat.
- [ ] Pastikan unread count tidak membocorkan pesan milik user lain.
- [ ] Realtime memiliki fallback polling yang dibersihkan saat halaman ditinggalkan.
- [ ] Tautan Inbox dan indikator unread dapat diakses keyboard/screen reader.

## F. Membership & loyalty
- [ ] Audit aturan level Bronze/Silver/Gold/Diamond terhadap kebijakan bisnis yang disetujui.
- [ ] Jangan mengasumsikan jumlah pesanan selesai otomatis sama dengan total transaksi yang memenuhi syarat.
- [ ] Tampilkan progres dan syarat level secara transparan.
- [ ] Badge/benefit tidak boleh menjanjikan benefit yang belum tersedia.

## G. Rating dan testimoni
- [ ] Satu ulasan per pesanan selesai ditegakkan backend, bukan hanya disembunyikan frontend.
- [ ] Validasi panjang, rating, kepemilikan pesanan, dan status selesai di server/database.
- [ ] Tangani duplikasi, kegagalan submit, dan state sukses.
- [ ] Pastikan pilihan nama publik benar-benar dihormati pada halaman publik.
- [ ] Jangan tampilkan email/PII reviewer secara tidak sengaja.

## H. Keamanan, akses, dan privasi
- [ ] Audit access guard untuk dashboard, pesanan, Inbox, worker, Macul, dan halaman admin.
- [x] Edge Function pendaftaran worker memeriksa role dan account_status dari tabel profiles di server; hanya member, SULTAN, MATTHEW, dan PELANGGAN aktif yang dapat mengajukan. WORKER/MACUL ditolak di endpoint.
- [ ] Pastikan WORKER dan MACUL tetap role terpisah pada seluruh alur persetujuan, pengelolaan role, dan akses halaman; jangan gabungkan otorisasi keduanya.
- [ ] Periksa seluruh query dashboard terhadap RLS dan kepemilikan data.
- [x] Render nama/ulasan/order dan invoice dashboard menggunakan escaping HTML pada output dinamis; audit XSS seluruh halaman masih terbuka.
- [x] Logout menampilkan penanganan error dan tombol kembali aktif jika signOut gagal; perlu uji runtime multi-tab.
- [ ] Jangan menaruh service-role key, token bot, webhook secret, atau kredensial di frontend/repository.
- [ ] Perubahan SQL/RLS/RPC harus ditinjau dan diuji terpisah sebelum diterapkan ke Supabase produksi.

## I. Performa, ketahanan, dan aksesibilitas
- [ ] Kurangi query berulang dan hindari N+1 request.
- [ ] Batasi data yang diambil dan paginasi riwayat jika diperlukan.
- [ ] Bersihkan timer, listener, dan channel realtime.
- [ ] Tangani offline/koneksi lambat dengan pesan yang jelas.
- [ ] Gunakan semantic HTML, label form, focus-visible, kontras, dan target sentuh memadai.
- [ ] Hormati prefers-reduced-motion.

## J. Audit seluruh website di dalam PR ini
- [ ] Beranda dan alur login/register/reset: redirect, tombol, tampilan, dan validasi.
- [ ] Pemisahan Visitor vs akun terdaftar; Visitor tidak boleh memesan atau memakai voucher.
- [ ] Konsistensi role ADMIN, SULTAN, MATTHEW, PELANGGAN, MEMBER, WORKER, dan MACUL.
- [ ] Alur pemesanan, voucher, kode pesanan, dan notifikasi Telegram.
- [ ] Halaman Your Order dan pelacakan progres.
- [ ] Inbox Matthew dan batasan admin-only send.
- [ ] Formulir worker/MACUL dan status persetujuan.
- [ ] Admin Control Center, pengelolaan role, worker, voucher, pengumuman, dan status website.
- [ ] Calculator Resource dan Requirements City Hall.
- [ ] Halaman Support/QRIS dan tautan WhatsApp.
- [ ] Konsistensi navigasi, cache-busting aset, SEO dasar, dan tautan internal.
- [ ] Periksa file tidak terpakai hanya setelah referensi seluruh repo ditelusuri; jangan hapus aset hanya berdasarkan nama.

## K. Pengujian dan kriteria siap merge
- [ ] Jalankan seluruh regression tests yang sudah ada.
- [ ] Tambahkan tes untuk status profil, statistik/status pesanan, escaping output, logout, dan akses data.
- [x] Pemeriksaan parser JavaScript inline `member-dashboard.html` berhasil setelah perubahan; belum menggantikan browser test.
- [ ] Jalankan tes responsivitas/aksesibilitas bila tooling tersedia.
- [ ] Periksa diff dan pastikan tidak ada perubahan rahasia atau kredensial.
- [ ] Pastikan GitHub Actions hijau.
- [ ] Uji smoke test di staging/live setelah deployment yang disetujui.
- [ ] Dokumentasikan item yang tidak dapat diuji dan alasan teknisnya.

## L. System Control Center & Maintenance Mode

- [ ] Audit mekanisme status website yang sudah ada sebelum menambah sumber status baru.
- [ ] Rancang tiga mode: FULL MAINTENANCE, ORDER MAINTENANCE, dan SYSTEM MAINTENANCE.
- [ ] Sediakan pesan maintenance, estimasi selesai, alasan, dan status aktif/nonaktif.
- [ ] Admin bypass harus diverifikasi server-side; jangan mengandalkan role dari localStorage atau user_metadata.
- [ ] ORDER MAINTENANCE harus memblokir pembuatan pesanan dan penukaran voucher di backend, bukan hanya menonaktifkan tombol.
- [ ] SYSTEM MAINTENANCE harus mendukung pemilihan modul terdampak (mis. Worker, MACUL, Inbox) tanpa mematikan modul lain.
- [ ] Catat riwayat perubahan: aktor, mode, pesan, waktu mulai/selesai, dan modul terdampak.
- [ ] Integrasikan kontrol Telegram hanya melalui Edge Function terautentikasi dan secret server-side.
- [ ] Pastikan jalur darurat untuk memulihkan akses admin tetap tersedia jika konfigurasi maintenance salah.
- [ ] Tambahkan pengujian role, visitor, order/voucher, endpoint langsung, dan kegagalan backend.
- [ ] Uji status maintenance saat database/network tidak tersedia; gunakan perilaku fail-safe yang tidak membuka operasi sensitif.
- [ ] Dokumentasikan prosedur aktivasi, pembatalan, dan pemulihan.
## Batas perubahan
1. Tidak melakukan merge tanpa persetujuan eksplisit.
2. Tidak mengubah skema, RLS, RPC, Edge Function, atau konfigurasi Auth produksi tanpa migrasi dan persetujuan terpisah.
3. Tidak menghapus file/aset sebelum seluruh referensinya diverifikasi.
4. Tidak menyatakan fitur selesai hanya karena checklist atau UI sudah dibuat.
5. Perubahan harus tetap kompatibel dengan GitHub Pages dan Supabase yang sudah digunakan.

## M. Audit statis lanjutan — 6 November 2026

### Kontrak data yang berhasil diverifikasi
- `list_my_joki_orders()` pada SQL repository mengembalikan `id`, `order_number`, `client_name`, `client_email`, `service_name`, `kingdom_number`, `quantity`, rincian harga, `status`, progres, dan timestamp. Kolom `total_price` yang dipakai statistik dan invoice tersedia pada kontrak SQL tersebut.
- Fungsi daftar pesanan memfilter berdasarkan email akun terautentikasi dan hanya diberikan kepada role `authenticated`. Tetap perlu uji RLS/negatif di database aktif; pemeriksaan source bukan bukti konfigurasi produksi saat ini sama.
- `submit_member_joki_review()` memeriksa sesi login, rating 1–5, panjang ulasan 5–700 karakter, kepemilikan pesanan berdasarkan email akun, status `Selesai`, dan menangani unique violation untuk mencegah ulasan ganda.
- `get_public_joki_reviews()` hanya mengembalikan ulasan berstatus `approved` dan menyamarkan nama ketika pengguna tidak mengizinkan nama ditampilkan.
- `create_joki_order()` pada SQL repository menolak sesi anonim, menyamakan email pesanan dengan email akun, memvalidasi Kingdom numerik dan kuantitas 4–12, memvalidasi produk/voucher, serta menghitung harga di backend.

### Risiko dan pekerjaan yang masih terbuka
- Halaman dashboard melakukan beberapa request Supabase setelah `DOMContentLoaded`; jalur `getSession()`/request paralel belum dibungkus satu penanganan exception menyeluruh. Kegagalan jaringan tertentu berpotensi meninggalkan state loading tanpa pesan pemulihan. Perlu diperbaiki dan diuji.
- Aturan level Bronze/Silver/Gold/Diamond dihitung di frontend berdasarkan jumlah pesanan selesai. Belum ada bukti kebijakan loyalty bisnis final; jangan menganggap level ini sebagai benefit/otorisasi backend.
- Statistik total nilai saat ini menjumlahkan `total_price` semua pesanan yang dikembalikan RPC, termasuk status selain selesai. Label saat ini adalah “Total Nilai Pesanan”, bukan omzet/total transaksi lunas; jangan mengganti label menjadi omzet sebelum status pembayaran tersedia dan didefinisikan.
- Access guard browser adalah lapisan UX, bukan pengganti RLS/RPC. Pastikan seluruh akses data dan mutasi tetap dibatasi server-side.
- Dashboard menampilkan panel ulasan di luar container dashboard yang disembunyikan selama pemuatan. Tinjau agar state loading/error dan konten terautentikasi konsisten serta tidak terjadi kilatan konten.
- `member-review-moderation.sql` dan `order-kingdom-and-quantity-limit.sql` adalah source SQL di repository. Audit ini tidak memverifikasi checksum/versi fungsi yang sedang aktif di Supabase produksi.

### CI dan batas pengujian

- Perbaikan dashboard lanjutan pada 6 November: panel Rating & Testimoni kini berada di dalam kontainer dashboard terautentikasi (tidak tampil saat dashboard masih loading); kegagalan request ditangani dengan pesan dan tombol coba lagi; logout menampilkan error tanpa mengunci tombol selamanya. Parser JavaScript inline berhasil dijalankan melalui pemeriksaan statis. Browser/runtime test tetap belum dilakukan.
- GitHub Actions workflow Authentication regression tests pada head PR 1737aeccde1d019525d977270e2a258788d1363c selesai dengan conclusion success (run #16). Job Login redirect, session cleanup, and role access berhasil.
- Belum dilakukan browser smoke test, uji mobile, uji akun dengan role berbeda, uji koneksi terputus, maupun pengujian database aktif.
- Tidak ada perubahan schema, RLS, RPC, Edge Function, atau konfigurasi Auth produksi pada tahap audit ini.

### Langkah berikutnya
1. Tangani exception jaringan dan state retry di dashboard tanpa mengubah kontrak RPC.
2. Pindahkan panel ulasan ke state dashboard terautentikasi setelah data berhasil dimuat.
3. Verifikasi aturan level member dan status transaksi dengan kebijakan bisnis yang disetujui.
4. Tambahkan pemeriksaan sintaks dan smoke/regression test otomatis yang sesuai dengan struktur proyek.
5. Jalankan uji browser serta verifikasi backend terpisah sebelum mengubah checklist menjadi selesai.


### Hardening tambahan — validasi pendaftaran worker di server
- Source supabase/functions/worker-application-submit/index.ts kini mengambil role dan account_status langsung dari profiles menggunakan service-role key yang hanya berada di Edge Function.
- Endpoint menolak akun tanpa profil, akun nonaktif, serta role selain member, sultan, matthew, dan pelanggan. Nilai role dinormalisasi ke huruf kecil sebelum dibandingkan.
- Pemeriksaan ini tidak bergantung pada role dari browser, user_metadata, atau access guard frontend.
- Regression test kontrak otorisasi ditambahkan; workflow auth-regression kini berjalan juga ketika file Edge Function tersebut berubah. GitHub Actions run #9 pada head PR terbaru berstatus success.
- BELUM diterapkan ke Supabase produksi. Source GitHub saja tidak mengubah fungsi yang sedang ter-deploy. Setelah PR ditinjau/di-merge, Edge Function harus di-deploy secara terencana lalu diuji dengan role member aktif, visitor/tanpa sesi, akun nonaktif, admin, WORKER, dan MACUL.
- Catatan audit: database aktif sudah memakai role member, admin, SULTAN, MATTHEW, PELANGGAN, WORKER, MACUL, dan AKUN. File supabase/admin-role-management.sql telah diperbaiki agar tidak menghapus role operasional WORKER/MACUL/AKUN saat dijalankan di kemudian hari. SQL belum dijalankan ke produksi.


### Audit Supabase aktif — 6 November 2026 (read-only)
- Proyek aktif matthew-joki berada di region eu-west-3 dan memakai PostgreSQL 17.11. Audit ini hanya membaca metadata, grants, policy, dan definisi fungsi; tidak ada perubahan database atau deployment.
- Edge Function worker-application-submit yang aktif di Supabase masih versi 3 dan belum memuat pemeriksaan role/account_status yang sudah ditambahkan di branch PR. Source repository sudah diperbaiki; deployment dan uji role matrix masih diperlukan.
- Policy Public submit worker application saat ini memberi INSERT ke anon dan authenticated untuk baris worker_applications dengan applicant_id NULL. Jalur ini berpotensi membuat record yatim/spam. Perlu audit frontend agar dipastikan semua formulir sudah memakai Edge Function terautentikasi sebelum policy tersebut dicabut melalui migrasi terpisah. Belum ada perubahan policy.
- Tabel joki_order_history dan telegram_command_state memiliki RLS aktif tanpa policy dan tanpa grants langsung untuk anon/authenticated; keduanya tidak terbuka melalui role publik yang diperiksa.
- Inbox policy membatasi pembacaan pesan ke receipt milik user. Pengiriman resmi melalui Edge Function memeriksa role admin di server.
- Security Advisor menandai beberapa SECURITY DEFINER RPC yang dapat dipanggil anon/authenticated. Endpoint publik dan endpoint login perlu ditinjau satu per satu berdasarkan isi fungsi, parameter, dan grants; tidak semua temuan otomatis merupakan kerentanan. Advisor juga menandai leaked-password protection nonaktif.
- process_worker_application_decision memetakan worker_type akun ke role AKUN dan macul ke MACUL, membuat pesan Inbox, serta membatasi aktor pada admin/MATTHEW. RPC tidak dapat dipanggil anon/authenticated; Telegram Edge Function memverifikasi secret webhook dan chat/sender ID admin sebelum menjalankannya.
- Rekomendasi: evaluasi dan cabut anonymous INSERT worker_applications setelah audit frontend; aktifkan leaked-password protection di Auth; audit SECURITY DEFINER RPC; dan deploy Edge Function worker setelah diff versi aktif dengan branch ditinjau.

- Pengujian CI run #16 mencakup file auth regression, kontrak role Edge Function, CORS HTTP/HTTPS, dan role SQL; seluruh test berhasil.

### Follow-up security audit — worker applications and public RPCs (6 November 2026)

#### Worker application flow
- Verified assets/js/worker-application.js: it reads the applicant's own application status and submits through db.functions.invoke(worker-application-submit); it does not directly INSERT into worker_applications.
- Verified the repository Edge Function checks Supabase Auth, verified email, server-side profiles.role, and account_status, then inserts with the service-role key.
- Live policy metadata confirms the legacy policy Public submit worker application still permits anon/authenticated INSERT when applicant_id IS NULL. It is not used by the active frontend flow and is a candidate for retirement.
- Added docs/WORKER-APPLICATION-SECURITY-AUDIT.md documenting the evidence and safe retirement plan.
- A database change to drop that policy and revoke direct INSERT has not been applied. Production table grants still need a separate read-only verification before final SQL is approved.

#### SECURITY DEFINER RPC classification
- Admin mutations admin_set_member_role and admin_set_member_status are executable by authenticated only and check admin identity/role server-side.
- create_joki_order is authenticated-only and validates a non-anonymous session, account email, Kingdom format, quantity, product and voucher on the database side.
- list_my_joki_orders, list_my_joki_order_history, get_my_reviewed_order_ids, and submit_member_joki_review are authenticated-only and use the current user's identity/ownership checks.
- Trigger/event helpers and process_worker_application_decision are not executable by anon/authenticated.
- get_public_joki_reviews is intentionally public and returns only approved review fields.
- lookup_joki_progress, lookup_joki_review, and submit_joki_review remain public to anon/authenticated and rely on the legacy tracking token. The automatic order RPC currently generates a date-prefixed token with only 8 random hex characters and stores it as both token and order number. This is a material enumeration risk; do not claim public tracking is secure until a coordinated migration separates a high-entropy tracking token from the public order number, includes old-order transition, and adds abuse/rate controls.
- The repository already contains docs/TRACKING-TOKEN-MIGRATION.md and supabase/tracking-token-preflight.sql; the latter was used read-only in a prior audit. Do not apply the separate lookup-contract candidate alone.

#### Additional regression coverage
- Added a test asserting the worker form uses the server-validated Edge Function and does not directly INSERT into the table.
- Latest test commit: 9eedfd3314c301f8e65c7be6a39501746baa9fef.
- CI for this exact commit has not yet returned a run at the time of this update; prior successful run #16 applies to an earlier head only.

#### Outstanding release gates
- Run the latest CI and full regression suite.
- Retire the unused public worker INSERT policy only after checking direct table grants and reviewing a separate SQL change.
- Coordinate the tracking-token migration across database RPCs, automatic order confirmation, admin-created orders, progress lookup, review lookup/submit, and old-order rotation. Stage and test first.
- Review leaked-password protection in Supabase Auth settings and test signup/password reset after enabling.
- Browser smoke tests and real role matrix tests remain outstanding.
- No Supabase production DDL, grants, Auth settings, Edge Function deployment, or PR merge was performed in this follow-up.

### Release hardening follow-up — 6 November 2026

#### Production changes completed
- Supabase Edge Function `worker-application-submit` deployed as version 4, with `verify_jwt=true`.
- The deployed source now validates Auth user/email confirmation and checks the current server-side profile role and account_status. Only active `member`, `sultan`, `matthew`, and `pelanggan` roles may apply; `worker`, `macul`, `akun`, visitor, admin, and inactive profiles are rejected.
- The unused policy `Public submit worker application` was removed from production.
- Direct table INSERT privileges were revoked from `anon` and `authenticated`; authenticated SELECT for applicants/admin and service-role INSERT remain.
- Post-change metadata query confirmed the old INSERT policy is absent and the remaining grants match the intended server-side submission flow.

#### Tracking token implementation staged in PR
- `home-orders.js` now calls `create_joki_order_secure` and includes the private tracking token separately from the public order number in the customer's WhatsApp confirmation draft.
- `joki-matthew.js` now calls the secure tracking/review RPC names and no longer treats order number as a tracking credential.
- `admin-joki-progress.js` now reads/displays/copies `tracking_token`; manually created rows write both the legacy required token field and the new private tracking field.
- Added `supabase/tracking-token-v2.sql`: additive expansion, 256-bit cryptographic token generation, unique index, insert trigger, secure order RPC, and secure lookup/review RPCs.
- Added `supabase/tracking-token-v2-cutover.sql`: separate legacy RPC shutdown, explicitly gated until the new frontend is live and new tokens have been privately delivered to existing customers.
- These tracking-token SQL files are staged only. They have NOT been applied to production. This avoids breaking the currently published frontend before the PR is merged and deployed.

#### Production data and transition
- Live `joki_progress` currently contains 3 orders and `joki_reviews` contains 0 reviews (counts only; no customer data was retrieved into this report).
- The expansion migration preserves all existing legacy token/order_number values and backfills a new random token for each order. The admin panel will expose each new token after migration so the operator can privately distribute it.
- Cutover must not run until customers have received their new tokens. Legacy token RPCs remain active during the transition window and must be revoked in the cutover phase after the new frontend is published.
- No order rows were deleted or modified by the production changes made in this follow-up.

#### QA / release gates
- CI path filters now include the order/tracking frontend scripts and both tracking SQL files.
- Added regression assertions for the secure RPC call paths, private token delivery, admin token management, and staged SQL grants/randomness.
- Browser/device smoke tests and end-to-end order tests remain required after migration + frontend deployment.
- Supabase leaked-password protection is still disabled; the available connected Supabase actions do not expose the Auth security-settings toggle. This must be enabled and verified in Supabase Dashboard.
- PR #13 is not merged. No public frontend release was performed in this follow-up.
