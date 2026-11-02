# Matthew Joki — Dragon Kingdom

Website personal bertema Rise of Kingdoms, dibuat dengan HTML, CSS, dan JavaScript statis.

## Halaman
- `index.html` — beranda, autentikasi terintegrasi, About Matthew, layanan, kontak, dan panel admin.
- `login.html` — halaman login terpisah.
- `register.html` — halaman pendaftaran akun terpisah.
- `calculator-resource.html` — kalkulator pajak Trading Post.
- `requirements-city-hall.html` — checklist syarat upgrade City Hall level 1–25.

## Struktur aset
- `assets/css/style.css` — desain utama beranda.
- `assets/css/auth.css` — desain halaman login dan pendaftaran.
- `assets/css/calculator.css` — desain kalkulator resource.
- `assets/css/requirements.css` — desain tabel City Hall.
- `assets/js/main.js` — utilitas UI umum.
- `assets/js/supabase.js` — inisialisasi Supabase browser client.
- `assets/js/auth.js` — logika login dan pendaftaran halaman terpisah.
- `assets/js/calculator.js` — perhitungan pajak Trading Post.
- `assets/js/requirements.js` — filter, pencarian, dan checklist City Hall.

## Autentikasi Supabase
Halaman autentikasi memakai Supabase Auth. Beranda saat ini juga memiliki login/daftar terintegrasi dan membaca profil dari tabel `profiles`. Pastikan project Supabase memiliki tabel, policy RLS, dan trigger pembuatan profil yang sesuai dengan kode beranda. Atur URL redirect konfirmasi email di Supabase Authentication agar mengarah ke domain website ini.

Kunci yang digunakan di browser harus berupa **publishable/anon key**, bukan service-role key. Jangan pernah menaruh service-role key di file frontend.

## Catatan City Hall
Angka biaya, waktu, dan kapasitas pada tabel merupakan nilai dasar referensi dan dapat berubah mengikuti pembaruan game. Bonus kecepatan bangunan, bantuan aliansi, dan buff tidak dihitung.

## Deploy
Repository ini dapat dipublikasikan melalui GitHub Pages. Setelah commit, tunggu proses deploy selesai lalu refresh situs. Jika perubahan belum terlihat, coba refresh tanpa cache atau buka dalam mode samaran.
