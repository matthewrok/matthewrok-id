# PR #13 — System Control Center & Maintenance Mode

## Status
Dokumen desain/implementasi untuk PR #13. Ini belum mengaktifkan maintenance mode di website dan belum mengubah database Supabase produksi.

## Tujuan
Memberi admin kendali operasional saat website atau sebagian layanan perlu dihentikan sementara, tanpa mengunci admin sendiri dan tanpa mengandalkan kontrol frontend sebagai pengaman.

## Mode operasional

### 1. FULL MAINTENANCE
- Halaman publik/member menampilkan halaman maintenance dengan tema biru/navy MATTHEW JOKI.
- Hanya admin yang lolos verifikasi server-side yang boleh melewati halaman maintenance.
- Semua operasi sensitif tetap ditolak di backend selama mode ini aktif.
- Halaman menampilkan judul, pesan, estimasi selesai (opsional), dan status layanan.

### 2. ORDER MAINTENANCE
- Website tetap dapat dijelajahi dan pengguna tetap dapat masuk ke akun.
- Pembuatan pesanan baru, penggunaan voucher, dan operasi terkait order ditolak oleh backend.
- Riwayat dan detail pesanan lama tetap dapat dibaca sesuai RLS.
- UI menampilkan banner status layanan dan alasan penghentian order.

### 3. SYSTEM MAINTENANCE
- Admin memilih modul terdampak, misalnya Worker, MACUL, Inbox, atau modul order.
- Modul yang tidak terdampak tetap berjalan.
- Setiap endpoint/RPC/Edge Function terkait wajib memeriksa status modul di server.

## Kontrol admin
- Toggle mode dan status aktif/nonaktif.
- Pesan pengumuman dan estimasi selesai.
- Pemilihan modul untuk mode system.
- Pratinjau tampilan maintenance.
- Riwayat aktivasi/nonaktif dan perubahan konfigurasi.
- Tombol pemulihan darurat yang hanya dapat digunakan admin terverifikasi.

## Rancangan backend — belum diterapkan
Sebelum implementasi, audit tabel, RPC, Edge Functions, RLS, dan mekanisme status website yang sudah ada. Hindari membuat tabel/kontrak kedua jika mekanisme yang kompatibel sudah tersedia.

Model data konseptual (bukan SQL siap-jalankan):
- Konfigurasi aktif: mode, enabled, message, estimated_end_at, affected_modules, updated_at, updated_by.
- Riwayat append-only: actor_id, action, previous_state, new_state, created_at.
- Satu sumber status kanonis agar frontend, RPC, dan Edge Functions tidak membaca konfigurasi berbeda.

Aturan keamanan wajib:
1. Perubahan konfigurasi hanya oleh admin yang diverifikasi dari sumber otorisasi tepercaya di server/database.
2. Jangan gunakan user_metadata, localStorage, parameter URL, atau role dari browser untuk memberi bypass.
3. RLS harus membatasi pembacaan konfigurasi internal dan penulisan riwayat.
4. Operasi order/voucher harus memeriksa maintenance di jalur backend yang benar-benar digunakan aplikasi.
5. Telegram hanya menjadi antarmuka kontrol ke Edge Function; token bot dan secret tidak boleh masuk ke browser atau repository.
6. Jika status tidak dapat diverifikasi, jangan izinkan operasi sensitif baru (fail closed untuk mutasi).
7. Sediakan prosedur pemulihan yang tidak bergantung pada halaman admin yang sedang dikunci.

## Tahapan implementasi
1. Inventarisasi status website, order, voucher, worker/MACUL, Inbox, Telegram, dan akses admin yang sudah ada.
2. Tetapkan kontrak status kanonis serta aturan fail-safe.
3. Siapkan migrasi SQL terpisah dan tinjau RLS/RPC sebelum deployment.
4. Implementasikan enforcement backend dan uji endpoint langsung terlebih dahulu.
5. Implementasikan halaman/banner dan panel admin setelah kontrak backend stabil.
6. Tambahkan Telegram setelah endpoint admin terverifikasi tersedia.
7. Jalankan regresi untuk ADMIN, member, Visitor, WORKER, dan MACUL.
8. Aktifkan hanya setelah seluruh tes dan prosedur pemulihan lolos.

## Kriteria selesai
- Admin bisa mengaktifkan dan mematikan semua mode tanpa kehilangan akses.
- Member/visitor tidak bisa melewati maintenance melalui manipulasi frontend atau memanggil endpoint secara langsung.
- Order/voucher benar-benar ditolak di backend pada mode yang sesuai.
- Modul yang tidak terdampak tetap tersedia.
- Riwayat audit tercatat dan tidak bisa dimanipulasi pengguna biasa.
- Telegram tidak membocorkan secret.
- Tes regresi dan CI lulus.

## Batasan
Dokumen ini tidak mengubah Supabase produksi, tidak membuat UI toggle palsu, dan tidak menyatakan fitur aktif. Implementasi kode dilakukan setelah inventarisasi kontrak backend dan pengujian yang sesuai.
