# Rencana migrasi token pelacakan — MATTHEW JOKI

Status dokumen: rancangan implementasi; belum diterapkan ke database produksi.

## Tujuan

Memisahkan nomor order yang boleh dibagikan untuk administrasi dari token rahasia yang memberi akses ke progres dan ulasan. Token baru harus memiliki entropi tinggi dan semua RPC yang menggunakan token harus memakai kolom token baru.

## Peta pemanggil yang harus ikut berubah

- `assets/js/home-orders.js`: setelah `create_joki_order`, pesan WhatsApp harus menyertakan nomor order dan token pelacakan secara terpisah. Token hanya diberikan kepada pemesan.
- `assets/js/joki-matthew.js`: lookup progres, lookup ulasan, dan submit ulasan harus mengirim token pelacakan, bukan nomor order.
- `assets/js/admin-joki-progress.js`: pesanan manual perlu memiliki token pelacakan; UI admin harus menampilkan tindakan salin token dan tidak menganggap nomor order sebagai token.
- `list_my_joki_orders()` dan halaman riwayat: hanya pemilik yang terautentikasi boleh memperoleh token untuk order miliknya, jika alur pemulihan token memang dibutuhkan.
- Telegram/admin: setiap fungsi pencarian/update perlu dipastikan tetap menggunakan ID internal atau nomor order; token rahasia tidak boleh masuk ke pesan grup atau log yang tidak diperlukan.
- `lookup_joki_review` dan `submit_joki_review`: harus mencari melalui token pelacakan baru; submit harus tetap memeriksa status selesai dan keunikan ulasan.

## Tahapan aman

1. **Inventaris dan backup** — catat jumlah order lama, signature RPC, grants, dependencies, serta buat backup yang bisa dipulihkan.
2. **Skema kompatibel** — tambahkan kolom `tracking_token` nullable dengan unique index case-insensitive. Jangan langsung menghapus atau menimpa `token` lama.
3. **Token untuk order baru** — ubah RPC `create_joki_order` agar membuat token dengan sumber acak kriptografis di PostgreSQL, menyimpan token pada kolom baru, dan mengembalikannya ke pemesan. Karena perubahan return type tidak kompatibel dengan `CREATE OR REPLACE`, siapkan drop/recreate signature dengan verifikasi dependensi dan grant yang eksplisit.
4. **Order manual admin** — isi kolom `tracking_token` dengan token 256-bit dari browser crypto yang sudah diimplementasikan; tampilkan token hanya di panel admin dan kirimkan secara privat kepada pelanggan.
5. **RPC pembaca/ulasan** — pindahkan lookup progres, lookup ulasan, dan submit ulasan ke `tracking_token`. Gunakan `SET search_path = ''`, nama objek fully qualified, validasi input, dan grant minimum.
6. **Transisi order lama** — pilih salah satu secara eksplisit sebelum rilis: (a) rotasi semua token lama dan kirim ulang secara privat, atau (b) fase transisi dengan batas waktu dan monitoring. Jangan diam-diam mempertahankan lookup token lama selamanya, karena itu mempertahankan risiko keamanan.
7. **Uji staging** — uji order baru, order manual, order lama, voucher, visitor ditolak, user tidak dapat melihat order orang lain, token salah, ulasan sebelum selesai ditolak, ulasan kedua ditolak, admin update progres, dan fallback WhatsApp.
8. **Rilis** — jalankan migrasi melalui mekanisme migration terkontrol, deploy frontend setelah RPC siap, pantau error, dan siapkan rollback. Jangan merge PR desain sebelum uji login dan pesanan lolos.

## Kriteria penerimaan

- Nomor order tidak dapat digunakan sebagai token pelacakan.
- Token pelacakan tidak dipublikasikan pada daftar order, review publik, Telegram, atau URL query.
- Hanya pemilik token yang mengetahui token bisa melihat detail yang disetujui; data yang dikembalikan dibatasi ke kebutuhan halaman.
- Order baru dan order manual dapat dilacak; alur order lama punya strategi transisi yang telah diuji.
- RPC memiliki grants eksplisit, search path aman, validasi status/ulasan, dan uji negatif tercatat.

## Batasan yang diketahui

- Token otomatis `create_joki_order` saat ini masih sama dengan nomor order dan formatnya masih lama.
- RPC publik `lookup_joki_progress`, `lookup_joki_review`, dan `submit_joki_review` saat ini menerima `token` lama.
- `lookup_joki_progress` yang ada di database belum mengembalikan semua kolom yang dibaca frontend.
- Advisory Supabase juga menandai leaked-password protection nonaktif serta dua tabel RLS tanpa policy. Jangan menambah policy baca umum pada tabel riwayat atau state Telegram hanya untuk menghilangkan warning; akses service-role-only mungkin memang disengaja.
- Tidak ada DDL produksi yang dijalankan sebagai bagian dari rancangan ini.


## Preflight database (read-only)

File `supabase/tracking-token-preflight.sql` ditambahkan sebagai inventaris sebelum menyusun DDL final. Query hanya membaca metadata dan agregat; tidak mengubah tabel, function, grant, maupun data. Jalankan dan simpan hasilnya sebelum migrasi agar signature, dependency, indeks, grant, dan pola token aktual dapat diverifikasi.

### Temuan implementasi frontend yang sudah dikonfirmasi

- Form order otomatis saat ini hanya membaca `order_number` dari RPC dan memasukkannya ke pesan WhatsApp; belum ada properti token pelacakan terpisah.
- Halaman pelacakan mengirim input yang sama ke tiga RPC: lookup progres, lookup ulasan, dan submit ulasan.
- Panel admin membuat token manual 256-bit, tetapi menyimpannya ke kolom legacy `token`; perubahan kolom harus mengubah jalur insert, select, copy, dan edit secara bersamaan.
- `list_my_joki_orders()` saat ini mengembalikan detail order berdasarkan email akun, tetapi belum mengembalikan token pelacakan. Jangan menambahkan token ke daftar riwayat secara otomatis tanpa memutuskan apakah fitur pemulihan token memang diperlukan dan memastikan akses hanya untuk pemilik.
- Script `lookup-joki-progress-contract.sql` adalah kandidat terpisah yang masih mencari melalui kolom `token`; jangan jalankan bersamaan atau sebelum migrasi token final karena akan mempertahankan kontrak lama.

Preflight belum dijalankan pada database produksi. Hasilnya harus ditinjau terlebih dahulu; khususnya dependency function dan policy/grant perlu diverifikasi sebelum membuat migrasi final.