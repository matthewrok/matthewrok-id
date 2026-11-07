# Panduan Backup & Pemulihan Supabase — MATTHEW JOKI

> Dokumen operasional. Simpan salinan backup di lokasi privat di luar repository GitHub. Jangan pernah commit dump database, file `.env`, access token, database password, atau secret Edge Function ke repository publik.

## 1. Apa yang perlu dicadangkan

Backup database saja belum tentu mencakup seluruh konfigurasi proyek. Buat inventaris terpisah untuk:

- Skema dan data PostgreSQL yang diperlukan aplikasi.
- Definisi tabel, indeks, constraint, trigger, function/RPC, view, enum, dan extension.
- Kebijakan Row Level Security (RLS), grants, serta konfigurasi Storage policies.
- File objek di Supabase Storage (backup database tidak menyalin isi bucket).
- Konfigurasi Auth: provider, URL redirect, SMTP, template email, MFA, dan pengaturan keamanan.
- Edge Functions beserta source code dan daftar nama secret yang dibutuhkan.
- Environment variables dan konfigurasi deployment GitHub Pages/Actions.
- DNS/domain, callback URL, webhook, serta integrasi Telegram.

Catat waktu backup, project reference, versi CLI, dan siapa yang melakukan backup. Jangan menyimpan secret dalam dokumen ini.

## 2. Dashboard backup

1. Masuk ke Supabase Dashboard dan pilih project MATTHEW JOKI.
2. Buka pengaturan database/backup pada project.
3. Periksa jadwal backup otomatis, retensi, dan apakah fitur unduh backup tersedia pada paket project.
4. Jika tersedia, unduh backup dan simpan terenkripsi di lokasi privat.
5. Catat waktu snapshot dan uji pemulihan secara berkala ke project staging terpisah.

Ketersediaan, retensi, dan opsi unduh bergantung pada paket dan konfigurasi project. Jangan menganggap snapshot otomatis sebagai satu-satunya salinan.

## 3. Backup dengan PostgreSQL tools

Gunakan versi `pg_dump` yang kompatibel dengan versi PostgreSQL server. Ambil connection string dari Dashboard secara privat. Hindari menempelkan password ke command yang tersimpan di shell history.

Contoh memakai environment variable sementara (isi nilainya secara interaktif di terminal; jangan commit file ini):

```bash
read -rsp "Database password: " PGPASSWORD
export PGPASSWORD
echo
pg_dump "host=DB_HOST port=5432 dbname=postgres user=postgres sslmode=require" \
  --format=custom --no-owner --no-privileges \
  --file="matthew-joki-$(date +%F).dump"
unset PGPASSWORD
```

Ganti `DB_HOST` dengan host database yang benar dari Dashboard. Gunakan connection pooler hanya jika dokumentasi dan mode koneksinya sesuai untuk tool backup.

Untuk SQL plain text:

```bash
pg_dump "host=DB_HOST port=5432 dbname=postgres user=postgres sslmode=require" \
  --format=plain --no-owner --no-privileges \
  --file="matthew-joki-$(date +%F).sql"
```

Opsi `--no-owner --no-privileges` menghindari pemulihan owner/grant yang tidak sesuai pada lingkungan berbeda. Artinya, hak akses dan konfigurasi role perlu ditinjau serta diterapkan kembali secara terkontrol setelah restore. Jangan menghapus opsi tersebut tanpa memahami dampaknya.

## 4. Restore / uji pemulihan

Lakukan restore terlebih dahulu ke project staging atau database baru, bukan langsung ke produksi.

Untuk custom dump:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="host=STAGING_DB_HOST port=5432 dbname=postgres user=postgres sslmode=require" \
  "matthew-joki-YYYY-MM-DD.dump"
```

Untuk SQL plain text:

```bash
psql "host=STAGING_DB_HOST port=5432 dbname=postgres user=postgres sslmode=require" \
  --file="matthew-joki-YYYY-MM-DD.sql"
```

Periksa log restore. Validasi tabel penting, jumlah record, function/RPC, trigger, RLS policies, grants, serta alur aplikasi menggunakan akun uji dengan role berbeda. Jangan menonaktifkan RLS sebagai jalan pintas untuk membuat restore terlihat berhasil.

**Perhatian Auth:** skema `auth` dikelola Supabase. Jangan mengimpor atau menimpa `auth.users`, session, atau tabel internal Auth secara sembarangan pada project aktif. Ikuti prosedur migrasi/restore resmi Supabase untuk kebutuhan Auth dan verifikasi provider, redirect URL, SMTP, serta template secara terpisah.

## 5. Storage, Edge Functions, dan konfigurasi

### Storage
- Inventaris nama bucket, public/private status, MIME/size limits, dan policies.
- Unduh/salin objek bucket menggunakan prosedur Storage yang sesuai.
- Simpan metadata objek dan mapping path.
- Uji akses baca/tulis dengan akun anon dan authenticated yang sesuai.
- Ingat: dump PostgreSQL tidak menyimpan file objek Storage.

### Edge Functions
- Simpan source code dan konfigurasi deployment di repository privat atau folder source yang aman.
- Catat nama secret yang dibutuhkan, bukan nilainya.
- Simpan secret pada secret manager/dashboard; set ulang secara manual di project pemulihan.
- Deploy ulang dan uji endpoint serta autentikasinya.

### Auth & URL
Catat dan verifikasi:
- Site URL dan daftar redirect URL.
- Email/Google/other provider configuration.
- SMTP sender, email templates, rate limits, dan MFA settings.
- Webhook atau callback yang bergantung pada domain.

### GitHub Pages & integrasi
- Simpan daftar environment variable dan secret GitHub Actions.
- Pastikan hanya Supabase publishable/anon key yang digunakan di browser.
- Jangan pernah memasukkan `service_role`, secret key, bot token Telegram, atau database password ke JavaScript frontend.

## 6. Checklist setelah pemulihan

- [ ] Website dapat dibuka melalui domain dan HTTPS.
- [ ] Login, logout, reset password, dan email verification berfungsi.
- [ ] Akun member hanya dapat membaca data miliknya.
- [ ] Admin-only actions tetap dibatasi di server/RLS/RPC, bukan hanya disembunyikan di UI.
- [ ] Visitor tidak dapat membuat pesanan atau menggunakan voucher.
- [ ] Daftar pesanan, progres, review, dan profil cocok dengan catatan backup.
- [ ] Storage file dapat diakses sesuai policy.
- [ ] Edge Functions, Telegram integration, dan webhook berfungsi.
- [ ] Error log diperiksa dan tidak ada secret/PII yang bocor.

## 7. Jadwal dan tata kelola

- Tentukan RPO (berapa banyak data yang boleh hilang) dan RTO (berapa lama layanan boleh tidak tersedia).
- Gunakan backup otomatis ditambah backup manual sebelum perubahan skema besar.
- Simpan minimal satu salinan terenkripsi di luar akun/proyek utama.
- Batasi akses backup hanya untuk pihak yang berwenang.
- Uji restore berkala; backup yang belum pernah diuji belum terbukti dapat dipulihkan.
- Hapus backup lama sesuai kebijakan retensi dan aturan privasi.

## Referensi resmi

- Supabase Backups: https://supabase.com/docs/guides/platform/backups
- Supabase CLI database: https://supabase.com/docs/guides/local-development/overview
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- PostgreSQL `pg_dump`: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore`: https://www.postgresql.org/docs/current/app-pgrestore.html
