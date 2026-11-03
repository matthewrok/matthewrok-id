# Matthew Joki — Dragon Kingdom

Website resmi Matthew Joki untuk komunitas Rise of Kingdoms.

## Struktur proyek

- `index.html` — beranda, login/registrasi Supabase, About Matthew, layanan, kontak, dan dashboard admin.
- `calculator-resource.html` — kalkulator resource Trading Post.
- `requirements-city-hall.html` — kebutuhan upgrade City Hall.
- `joki-matthew.html` — pelacak progres pesanan joki.
- `login.html` dan `register.html` — halaman autentikasi terpisah.
- `admin/dashboard.html` — halaman dashboard admin terpisah.
- `assets/css/` — stylesheet, satu file per halaman/fitur.
- `assets/js/` — JavaScript, satu file per halaman/fitur.
- `assets/images/` — gambar yang sudah disimpan dalam folder aset.
- `dragon-character.png` dan `dragon-kingdom.png` — artwork lama di root; jangan dipindah/hapus sebelum semua referensi gambar diperbarui.
- `supabase/joki-progress-setup.sql` — SQL untuk tabel dan RPC pelacak progres joki.
- `CNAME` — konfigurasi domain khusus GitHub Pages; jangan hapus.

## Catatan pemeliharaan

Halaman HTML tetap di root karena tautan relatif dan konfigurasi GitHub Pages saat ini mengandalkannya. File CSS/JS dipisah di `assets/`. File yang terlihat kosong atau tampak tidak dipakai harus diperiksa semua referensinya sebelum dihapus agar fitur login, role admin, dan Supabase tidak rusak.

## Teknologi

- HTML, CSS, JavaScript
- Supabase Auth dan Database
- GitHub Pages
