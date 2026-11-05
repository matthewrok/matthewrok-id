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

## Hasil preflight Supabase (5 November 2026)

Preflight read-only berhasil dijalankan pada project `aqiwrgnxwtphhwikqtmn`. Tidak ada DDL, perubahan data, atau perubahan grant yang dilakukan.

### Fakta database yang terverifikasi

- Tabel `joki_progress` memiliki kolom `token` wajib dan unik; `order_number` nullable dengan unique partial index.
- Terdapat unique index pada `upper(token)`, sehingga token bersifat case-insensitive untuk keunikan.
- Saat preflight, tabel berisi **1 baris**. Baris tersebut berstatus `Dalam pengerjaan`, `order_number` masih NULL, email client NULL, dan token berformat lain (22 karakter), bukan kode order otomatis lama dan bukan token admin 256-bit yang baru dibuat frontend.
- Karena data aktual memuat order manual dengan format token lama yang tidak tercakup dalam pola yang diasumsikan sebelumnya, migrasi tidak boleh hanya mem-backfill berdasarkan pola `MJ-YYMMDD-XXXXXXXX`. Semua token lama harus dipertahankan sebagai alias transisi atau dirotasi dengan proses distribusi privat.
- `joki_reviews` memiliki unique constraint pada `joki_progress_id`, sehingga satu order hanya dapat memiliki satu ulasan.
- RPC `lookup_joki_progress(text)`, `lookup_joki_review(text)`, dan `submit_joki_review(text,integer,text,boolean)` adalah SECURITY DEFINER dan saat ini dapat dieksekusi oleh `anon` maupun `authenticated`. Ini membuat kualitas/kerahasiaan token menjadi batas keamanan utama.
- `create_joki_order` hanya diberikan kepada `authenticated`; `list_my_joki_orders` hanya kepada `authenticated`. `get_public_joki_reviews` memang dapat dipanggil publik untuk menampilkan ulasan yang disetujui.
- Function lookup progres di database saat ini hanya mengembalikan nama client, layanan, status, persen, catatan, dan waktu update. Ia belum mengembalikan nomor order, jumlah karakter, atau total harga yang dibaca frontend.

### Keputusan desain yang dikunci sebelum DDL final

1. Tambahkan `tracking_token` nullable terlebih dahulu dengan unique index; jangan mengubah atau menghapus `token` legacy di tahap pertama.
2. Buat token baru dari `extensions.gen_random_bytes(32)` di PostgreSQL (64 karakter hex, 256-bit) untuk order otomatis. Admin manual juga perlu menyimpan token 256-bit ke kolom baru.
3. Selama masa transisi, lookup dapat memeriksa `tracking_token` terlebih dahulu lalu token legacy hanya untuk baris yang belum memiliki `tracking_token`. Fase fallback harus memiliki tenggat dan prosedur rotasi yang jelas; setelah migrasi selesai, fallback legacy dicabut.
4. Order lama/manual yang tokennya tidak diketahui formatnya tidak boleh kehilangan akses secara diam-diam. Admin perlu menyalin dan mengirim token baru secara privat, atau mempertahankan token lama sampai pelanggan menerima token rotasi.
5. Nomor order tetap berbeda dari token dan tidak boleh dipakai oleh RPC lookup atau review.
6. Token tidak boleh dikirim ke Telegram group, URL query, ulasan publik, atau daftar order umum. Pesan WhatsApp konfirmasi privat kepada pemesan dapat memuat token baru.
7. Karena function return contract berubah, buat migrasi terkoordinasi untuk seluruh RPC dan frontend. Jangan menjalankan file `lookup-joki-progress-contract.sql` sendirian; file itu masih menggunakan kolom legacy.

### Risiko keamanan yang perlu ditutup

- Token lama 22 karakter pada baris aktif belum diketahui entropy/pembuatannya. Perlakukan sebagai kredensial rahasia dan rencanakan rotasi.
- `anon` dapat menjalankan fungsi lookup dan submit ulasan. Saat merilis kontrak token baru, pastikan semua fungsi lookup/review memakai token acak kuat, validasi input/status, batas data minimum, dan grant eksplisit. Pertimbangkan rate limit di lapisan API/Edge Function karena SQL function sendiri tidak memberi proteksi brute-force.
- `submit_joki_review` saat ini dapat dieksekusi anon; unique constraint mencegah ulasan kedua untuk order yang sama, tetapi tidak menggantikan token yang kuat.
- `get_public_joki_reviews` menggunakan `search_path=public`; perbaiki ke `search_path=''` dan fully-qualified object names saat disentuh dalam migrasi keamanan.

### Status

Hasil preflight berhasil; migrasi final belum dibuat atau dijalankan. Langkah berikutnya adalah menulis satu migrasi kompatibel yang menangani kolom baru, indeks, RPC create/lookup/review/list, serta prosedur transisi token legacy secara atomik. Uji staging tetap wajib sebelum deployment.
