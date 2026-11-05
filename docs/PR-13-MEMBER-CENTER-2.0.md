# PR #13 — MATTHEW JOKI Member Center 2.0

## Tujuan
Menjadikan PR ini sebagai pembaruan besar untuk pengalaman member, dimulai dari perbaikan tombol KELUAR yang tertutup Inbox/menu, lalu memperkuat dashboard, alur pesanan, notifikasi, membership, ulasan, aksesibilitas, performa, dan pengujian.

> Dokumen ini adalah ruang lingkup dan checklist audit. Item tidak boleh ditandai selesai sebelum implementasi dan pengujian benar-benar dilakukan. Perubahan database/RLS produksi memerlukan migrasi terpisah dan verifikasi keamanan; jangan menjalankan perubahan produksi secara otomatis.

## A. Header, navigasi, dan desain
- [x] Sisakan ruang aman untuk tombol KELUAR agar tidak tertutup Inbox dan menu tiga titik.
- [x] Atur ulang header pada viewport kecil.
- [ ] Audit tabrakan elemen fixed/sticky di seluruh halaman.
- [ ] Selaraskan dashboard dengan tema biru/navy premium (hindari aksen merah lama yang tidak konsisten).
- [ ] Standarkan spacing, radius, tipografi, tombol, fokus keyboard, dan state hover.
- [ ] Pastikan animasi ringan dan menghormati prefers-reduced-motion.
- [ ] Uji lebar 320px, 360px, 390px, tablet, dan desktop.

## B. Profil dan status akun
- [ ] Tampilkan nama, email, role, tanggal bergabung, dan status akun dari sumber data yang benar.
- [ ] Tangani profil hilang, status nonaktif, dan kegagalan query tanpa menampilkan dashboard seolah-olah sehat.
- [ ] Jangan mengizinkan user mengubah role atau status melalui UI member.
- [ ] Pengaturan profil hanya ditambahkan jika ada jalur backend/RLS yang aman.

## C. Ringkasan dan statistik
- [ ] Ringkasan total pesanan, selesai, proses, dibatalkan, dan total transaksi.
- [ ] Pastikan definisi status mengikuti nilai status backend yang sebenarnya (normalisasi konsisten).
- [ ] Statistik periode/grafik hanya ditampilkan jika data dan definisi agregasinya valid.
- [ ] Format mata uang, tanggal, dan angka konsisten untuk locale Indonesia.

## D. Pesanan, progres, dan invoice
- [ ] Riwayat pesanan dengan filter status dan urutan tanggal.
- [ ] Detail pesanan: kode, layanan, Kingdom, kuantitas, harga, voucher/diskon, dan total.
- [ ] Timeline progres yang membaca data backend, bukan progres buatan frontend.
- [ ] Tombol salin kode pesanan dengan fallback yang aksesibel.
- [ ] Invoice aman dari HTML injection dan menampilkan rincian yang benar.
- [ ] Empty, loading, error, dan retry state.
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
- [ ] Pastikan WORKER dan MACUL tetap role terpisah; jangan gabungkan otorisasi keduanya.
- [ ] Periksa seluruh query dashboard terhadap RLS dan kepemilikan data.
- [ ] Periksa XSS/HTML injection, terutama render ulasan, pesan, nama, dan invoice.
- [ ] Logout harus menangani error dan membersihkan sesi lokal dengan benar.
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
- [ ] Jalankan pemeriksaan sintaks JavaScript untuk file yang berubah.
- [ ] Jalankan tes responsivitas/aksesibilitas bila tooling tersedia.
- [ ] Periksa diff dan pastikan tidak ada perubahan rahasia atau kredensial.
- [ ] Pastikan GitHub Actions hijau.
- [ ] Uji smoke test di staging/live setelah deployment yang disetujui.
- [ ] Dokumentasikan item yang tidak dapat diuji dan alasan teknisnya.

## Batas perubahan
1. Tidak melakukan merge tanpa persetujuan eksplisit.
2. Tidak mengubah skema, RLS, RPC, Edge Function, atau konfigurasi Auth produksi tanpa migrasi dan persetujuan terpisah.
3. Tidak menghapus file/aset sebelum seluruh referensinya diverifikasi.
4. Tidak menyatakan fitur selesai hanya karena checklist atau UI sudah dibuat.
5. Perubahan harus tetap kompatibel dengan GitHub Pages dan Supabase yang sudah digunakan.
