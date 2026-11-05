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
- Pemeriksaan GitHub Actions untuk head PR saat audit tidak mengembalikan workflow run; belum ada bukti CI lulus.
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
- Regression test statis ditambahkan untuk memastikan kontrak otorisasi ini tidak hilang; workflow auth-regression kini berjalan juga ketika file Edge Function tersebut berubah.
- BELUM diterapkan ke Supabase produksi. Source GitHub saja tidak mengubah fungsi yang sedang ter-deploy. Setelah PR ditinjau/di-merge, Edge Function harus di-deploy secara terencana lalu diuji dengan role member aktif, visitor/tanpa sesi, akun nonaktif, admin, WORKER, dan MACUL.
- Catatan audit: supabase/admin-role-management.sql saat ini membatasi profiles.role pada member, admin, SULTAN, MATTHEW, dan PELANGGAN; kontrak tersebut belum memasukkan WORKER/MACUL. Jangan menjalankan constraint tersebut ulang sebelum skema role diselaraskan dengan desain role final.
