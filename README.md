# DapurSPtLDV, Investigasi D'Culinary

Aplikasi web pendamping **RPP Program Linear / Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV)** untuk
**SMK N 1 Salatiga, Matematika Fase E, kelas X AKL**, dengan model **Project Based Learning (PjBL)** 3 pertemuan
(6 JP) dan konteks unit usaha **D'Culinary** (Jurusan Tata Boga).

Judul proyek: *“Investigasi D'Culinary: Berapa Banyak Produk yang Dapat Dibuat dan Berapa Keuntungan
Maksimumnya?”*

| Fase PjBL | Halaman siswa |
|---|---|
| Pertanyaan mendasar | `/belajar/cerita` (cerita D'Culinary tiga babak + foto produk + pertanyaan pemantik) |
| Memahami materi | `/belajar/modul`, `/belajar/grafik` (Lab Grafik eksplorasi), `/belajar/kuis` |
| Desain perencanaan & jadwal | `/proyek/perencanaan` (Project Planning Sheet) |
| Monitoring | `/proyek/wawancara`, `/proyek/pertidaksamaan`, `/proyek/grafik` (verifikasi), `/proyek/jurnal` |
| Menguji & mengomunikasikan hasil | `/akhir/produk` (tautan Drive + ringkasan) |
| Evaluasi pengalaman | `/akhir/refleksi` |

Dashboard guru: `/guru/dashboard`. Login siswa cukup nama lengkap di `/`.

Setiap halaman siswa diakhiri **bilah pengarah langkah** (komponen `NextStepBar`, sumber urutan di
`src/lib/steps.ts`) yang menampilkan “Langkah n dari 11”, apa yang harus dikerjakan di halaman itu, tombol
**Lanjut** dan **← Kembali**. Tombol “Tandai selesai” juga langsung menampilkan tombol lanjut ke langkah
berikutnya begitu tersimpan.

## Tumpukan teknologi

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**
- **Postgres terkelola: Neon** (rekomendasi) diakses **hanya dari server** lewat **Drizzle ORM**
  (`drizzle-orm/postgres-js` + paket `postgres`, opsi `prepare: false` agar cocok dengan PgBouncer/pooler).
  Supabase Postgres juga tetap bisa dipakai dengan string koneksi yang sama.
- **Vercel** sebagai hosting (region `sin1`) + cron harian `/api/health`
- **Vitest** untuk unit test parser, geometri clipping, model wawancara, kuis, pembagian kelompok, urutan langkah,
  tanggal zona Jakarta, pembersihan string koneksi, dan pengenalan galat koneksi
- Tidak ada SDK penyedia database di klien (tanpa `supabase-js`, tanpa anon key, tanpa kunci yang terekspos)

## Setup lokal

```bash
git clone <repo>
cd dapur-sptldv
npm ci
cp .env.example .env      # lalu isi nilainya
npm run db:migrate        # membuat tabel + mengaktifkan RLS
npm run dev               # http://localhost:3000
```

Wajib ada di `.env`: `DATABASE_URL`, `DIRECT_URL`, `TEACHER_CODE`, `SESSION_SECRET`, `CRON_SECRET`.
Aplikasi **sengaja gagal start** bila `TEACHER_CODE` atau `SESSION_SECRET` kosong (tidak ada fallback).

Membuat nilai rahasia:

```bash
openssl rand -hex 8    # contoh TEACHER_CODE
openssl rand -hex 32   # SESSION_SECRET / CRON_SECRET
```

### Data contoh untuk uji coba lokal (opsional)

```bash
npm run db:seed
```

Skrip seed **menolak berjalan** bila `DATABASE_URL` bukan host lokal (`localhost` / `127.0.0.1`), sehingga data
kelas asli di Supabase tidak pernah tertimpa. Seed membuat 8 siswa, 2 kelompok (PIN `K7M2QP` dan `R4TX9B`),
percobaan kuis, planning sheet, data wawancara nasi ayam & rice bowl, jurnal, slot wawancara, produk akhir, dan
refleksi.

### Perintah lain

```bash
npm run lint        # ESLint (flat config)
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run build       # build produksi
npm run db:generate # buat file migrasi baru dari src/db/schema.ts
npm run db:migrate  # jalankan migrasi (pakai DIRECT_URL)
npm run db:studio   # Drizzle Studio
```

## Setup database (Neon)

Neon dipakai karena **tidak ada tombol “Restore project”**: database yang menganggur hanya *tidur* dan **bangun
otomatis** ketika ada permintaan (cold start biasanya di bawah 1 detik).

1. Daftar di <https://neon.tech> → **Create project**.
   - Region: **AWS Asia Pacific (Singapore), `aws-ap-southeast-1`** supaya dekat dengan region Vercel `sin1`.
   - Database & role bawaan (`neondb`, `neondb_owner`) boleh dipakai apa adanya.
2. Di console Neon → menu **SQL Editor** → tempel seluruh isi berkas **`database-setup.sql`** (ada di root repo
   ini) → **Run**. Berkas itu membuat 17 tabel + indeks sekaligus. Jalankan sekali saja.
   - Alternatif dari komputermu: `DIRECT_URL="…" npm run db:migrate` (memakai koneksi *direct*, bukan `-pooler`).
3. Neon → tombol **Connect** → salin **dua** string:
   - **Pooled connection** (nama host memuat `-pooler`) → `DATABASE_URL` (dipakai aplikasi).
   - **Direct connection** (tanpa `-pooler`) → `DIRECT_URL` (dipakai `drizzle-kit` untuk migrasi).
   - Keduanya wajib memuat `?sslmode=require`. Bila string Neon memuat `channel_binding=require`, biarkan saja, aplikasi membuang parameter itu otomatis (`src/lib/db-url.ts`) karena postgres-js tidak memahaminya.
4. Mengenai **RLS**: migrasi `0001_enable_rls.sql` mengaktifkan Row Level Security tanpa policy dan mencabut hak
   akses role `anon`/`authenticated`. Di Neon perintah itu tidak berpengaruh (Neon tidak punya role tersebut dan
   tidak menyediakan API PostgREST); dibiarkan sebagai pengaman kalau database kelak diekspos lewat Data API.
   Aplikasi tetap normal karena terhubung sebagai pemilik tabel (`neondb_owner`).

Catatan paket gratis Neon: compute **tidur setelah 5 menit menganggur** (tidak bisa dimatikan di paket gratis) dan
bangun otomatis dalam ratusan milidetik saat ada kueri. Bila ingin permintaan pertama siswa selalu cepat, pasang
pemantau gratis (mis. cron-job.org) yang memanggil `https://<domain>/api/health` setiap 5 menit pada jam sekolah.
Cron harian Vercel di `vercel.json` tetap berguna sebagai pemantau harian.

## Setup Vercel

1. Daftar/login dengan akun GitHub → **Add New → Project** → pilih repo ini.
2. **Environment Variables** (Production **dan** Preview):

| Nama | Isi |
|---|---|
| `DATABASE_URL` | Pooled connection Neon (host memuat `-pooler`, `?sslmode=require`) |
| `DIRECT_URL` | Direct connection Neon (tanpa `-pooler`, untuk `drizzle-kit`) |
| `TEACHER_CODE` | kode guru rahasia (jangan pakai nilai contoh) |
| `SESSION_SECRET` | string acak panjang (`openssl rand -hex 32`) |
| `CRON_SECRET` | string acak untuk melindungi cron (`openssl rand -hex 32`) |

3. **Deploy**. Setiap `git push` ke `main` otomatis deploy ulang. Region dipatok `sin1` di `vercel.json`.

### Cara mengganti kode guru

Kode guru tidak pernah ditampilkan di antarmuka dan tidak ada nilai bawaan di kode. Untuk menggantinya:

1. Vercel → Project → **Settings → Environment Variables** → ubah `TEACHER_CODE` (Production & Preview).
2. **Redeploy** (Deployments → ⋯ → Redeploy) agar nilai baru dipakai.
3. Lokal: ubah `TEACHER_CODE` di `.env`, lalu jalankan ulang `npm run dev`.

Semua sesi guru yang sedang aktif tetap berlaku sampai kedaluwarsa (30 hari). Untuk memaksa keluar, hapus baris di
tabel `sessions` atau tunggu kedaluwarsa.

## Keamanan yang sudah diterapkan

- **Sesi**: cookie `httpOnly`, `sameSite=lax`, `secure` di produksi, token acak 256-bit, ada `expires_at` (30 hari),
  diperbarui `last_seen_at` paling sering sekali tiap 5 menit. Query sesi + siswa + kelompok digabung satu JOIN.
- **Rate limit berbasis tabel `rate_limits`** (bukan memori proses, karena serverless): login guru (5 percobaan
  gagal / 15 menit per IP), login siswa (10 / 10 menit per IP), gabung PIN (5 gagal → terkunci 10 menit per siswa
  **dan** per IP). PIN kelompok: 6 karakter, alfabet tanpa karakter ambigu (`0/O`, `1/I/L`), unik.
- **Gerbang akses di server**: seluruh route fase proyek & akhir memakai `requireGroupMember()`; route guru memakai
  `requireTeacher()`. Siswa yang belum bergabung di kelompok menerima **403** walau memanggil API langsung.
- **Validasi input** di server (panjang, tipe, rentang, daftar status). Tautan luar hanya https dari
  `drive.google.com` / `docs.google.com` (tautan YouTube kini ditolak) dan selalu ditampilkan dengan
  `rel="noopener noreferrer"`.
- **Header keamanan** lewat `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, dan `X-Frame-Options`
  (khusus deployment Vercel agar pratinjau lokal tetap bisa dibingkai).
- **RLS aktif tanpa policy** + pencabutan hak akses `anon`/`authenticated` (efektif bila database dipakai lewat
  Supabase; di Neon perintahnya tidak berpengaruh dan hanya menjadi lapisan pengaman tambahan).
- **String koneksi dibersihkan** sebelum dipakai (`src/lib/db-url.ts`): parameter khusus libpq seperti
  `channel_binding=require` dibuang agar postgres-js tidak gagal dengan `unrecognized configuration parameter`.

## Pemandu langkah, pengingat jurnal, dan cara menulis ≤ / ≥

- **Pemandu langkah** (`src/lib/steps.ts` + `NextStepBar`): setiap halaman siswa menampilkan “Langkah n dari 11”, apa
  yang harus dikerjakan, tombol **Lanjut** dan **← Kembali**. Setelah menekan **Tandai selesai**, tombol
  **Lanjut: <langkah berikutnya>** muncul **di samping** tombol itu (juga di Lab Grafik).
- **Notice berjalan pengingat jurnal** (`JournalTicker`): marquee di bawah header untuk siswa yang sudah masuk fase
  proyek (sudah punya kelompok). Teksnya menyesuaikan: “jurnal hari ini belum diisi …” atau “sudah diisi, terima
  kasih”, ditambah pesan pengingat terakhir dari guru. Berhenti saat disorot kursor dan otomatis menjadi teks statis
  bila pengguna mengaktifkan *prefers-reduced-motion*. “Hari ini” memakai zona **Asia/Jakarta**
  (`src/lib/date.ts`), bukan UTC server.
- **Menuliskan ≤ dan ≥**: papan tombol besar `≤` / `≥` (dan `<` `>` `=`) menyisipkan tanda tepat di posisi kursor, ada di Lab Grafik dan di halaman Susun Pertidaksamaan. Selain itu mengetik `<=`, `>=`, `=<`, `=>`, bahkan `x < = 40`
  otomatis berubah menjadi `≤` / `≥` (`normalizeTypedInequality`), dengan posisi kursor tetap benar.

## Pemetaan RPP → aplikasi

| Bagian RPP | Wujud di aplikasi |
|---|---|
| Konteks D'Culinary, kelas X AKL | Seluruh cerita, contoh data, soal kuis, dan teks antarmuka |
| Project Planning Sheet | `/proyek/perencanaan`, 9 bagian (pertanyaan, produk, peran, sumber data, pertanyaan wawancara, jadwal, nomor urut hari wawancara, bentuk produk akhir, etika) |
| Form Wawancara | `/proyek/wawancara`, **tanpa waktu produksi**; 2–6 bahan pokok, stok, harga jual satuan, biaya produksi, status kelengkapan + tindak lanjut, peringatan satuan campuran, catatan keterbatasan |
| Lab Grafik ala GeoGebra | `<LabGrafik mode="eksplorasi" \| "verifikasi">`, siswa mengetik pertidaksamaan, DHP diarsir, label di dekat tiap garis, pan/zoom, **tanpa slider, tanpa klik titik pojok, tanpa nilai Z otomatis** |
| Kuis | 10 soal konteks nasi ayam & rice bowl, **tanpa batas kelulusan**, skor kesiapan + pembahasan, soal & opsi diacak di server |
| Jurnal harian | `/proyek/jurnal`, berbasis tanggal + label kegiatan, kolom kontribusi wajib, entri anggota lain hanya baca, **notice berjalan pengingat harian** di header |
| Produk akhir | `/akhir/produk`, satu pengumpulan per kelompok, **tautan Drive + ringkasan**, tanpa unggahan berkas |
| Refleksi | `/akhir/refleksi`, lima pertanyaan + rating 1–5 |
| Guru memantau | `/guru/dashboard` berbasis **tiga menu**: **Rekap nilai siswa** (ringkasan kelas, rekap nilai per siswa, rekap per kelompok, ekspor CSV), **Laporan jurnal** (status kelompok, grid jurnal per kelompok per tanggal, kontribusi per anggota, pengingat), **Pengaturan** (skor kuis & tahap berjalan, daftar kelas, saran kelompok heterogen, kelola kelompok/PIN/anggota, slot wawancara) |

## Keputusan desain (asumsi)

1. **Gerbang fase proyek** = sudah tergabung di kelompok (PIN). Tidak ada syarat skor kuis; kuis sebaiknya tetap
   dikerjakan karena skornya dipakai untuk menyusun kelompok.
2. **Fungsi tujuan** = keuntungan per pcs (harga jual 1 pcs − biaya produksi 1 pcs), sehingga kolom biaya
   produksi tetap ada. Bentuknya ditulis `Z = (untung A)x + (untung B)y`.
3. **Titik pojok dan nilai optimum dikerjakan manual** di LKPD. Lab Grafik hanya menggambar garis, label, dan DHP;
   tidak ada penanda titik pojok maupun perhitungan Z.
4. **Skor kuis untuk pembagian kelompok** memakai percobaan **pertama** (default, lebih adil sebagai tes kesiapan),
   dan dapat diubah guru menjadi **skor tertinggi** di pengaturan.
5. **Produk akhir berupa tautan Google Drive**, satu-satunya tempat unggahan dalam proyek; tidak ada unggahan
   berkas ke database, sehingga tidak ada berkas
   besar di database.
6. **Data contoh** pada modul dan Lab Grafik (nasi ayam & rice bowl) diberi label “data contoh, bukan data asli
   D'Culinary”.
7. **Login siswa** cukup nama lengkap (min. 3 huruf, tidak peka huruf besar/kecil) dengan indeks unik
   `lower(name)`. Ada opsi guru **“Hanya nama dalam daftar kelas”** dengan daftar nama yang ditempel di dashboard.
8. **Notasi angka pada parser**: titik = pemisah ribuan (`6.000` → 6000), koma = desimal (`2,5` → 2.5). Angka
   seperti `3.5` (satu digit di belakang titik) tetap dibaca desimal.
9. **Kelipatan skala** yang setara (`2x + 3y ≤ 120` untuk `100x + 150y ≤ 6000`) **tidak** diterima sebagai jawaban
   akhir pada tahap Susun Pertidaksamaan, tetapi diberi petunjuk khusus agar siswa menuliskan sesuai satuan data
   wawancaranya. Di Lab Grafik, semua bentuk yang setara tetap digambar biasa (grafik memang memeriksa gambar DHP).
10. **Tombol “Buka Lab Grafik untuk verifikasi”** ditampilkan kapan saja setelah data wawancara tersimpan, dan
    diberi penekanan setelah model benar, sesuai kebebasan yang diberikan RPP.
11. **Item berstatus “Belum ada”** tidak dipakai sebagai kendala; item “Belum jelas” tetap dipakai bila angkanya
    sudah ada, tetapi harus punya kolom tindak lanjut.
12. **Slot wawancara** dibuat guru; satu slot hanya untuk satu kelompok (ditegakkan `unique` di database), sehingga
    pemilihan bersamaan ditolak dengan pesan ramah.
13. **Pertemuan/tahap berjalan** (1, 2, 3) menggantikan pengaturan “hari ke-N” pada versi sebelumnya.

## Gaya bahasa antarmuka

- **Tanpa tanda pisah panjang (em dash)**: seluruh teks memakai koma, titik, atau titik dua. Diuji otomatis di
  `src/components/TeacherDashboard.test.ts`.
- **Halaman siswa hanya memuat keterangan untuk siswa**: tidak ada penjelasan server, API, database, atau istilah
  teknis lain. Penjelasan teknis (mis. `DATABASE_URL`, `DIRECT_URL`, `/api/health`) dipindahkan ke bagian
  **Keterangan untuk guru** pada halaman galat, atau ke dashboard guru.
- **Dashboard guru memakai menu** supaya tidak berupa satu halaman panjang: Rekap nilai siswa, Laporan jurnal,
  dan Pengaturan. Menu aktif ditandai dan konten hanya memuat satu menu pada satu waktu.

## Model data (Drizzle, 17 tabel)

`students` (indeks unik `lower(name)`), `sessions` (`expires_at`), `rate_limits`, `class_roster`, `groups`,
`group_members` (satu kelompok per siswa), `progress`, `quiz_attempts` (tanpa kolom `passed`), `reminders`,
`settings`, `planning_sheets` (satu per kelompok), `interviews` (bahan sebagai `jsonb` + status kelengkapan),
`inequality_attempts`, `journals`, `final_products` (satu per kelompok), `reflections`, `interview_slots`.

Semua kolom foreign key yang sering difilter (`student_id`, `group_id`) memiliki indeks.

## Ekspor CSV (dashboard guru)

- `?type=quiz`, skor kuis per siswa
- `?type=groups`, daftar kelompok + PIN + skor rata-rata
- `?type=journal`, kontribusi jurnal per anggota
- `?type=status`, status setiap tahapan per kelompok

## Uji manual cepat (kriteria penerimaan)

```bash
# 1) health
curl -s localhost:3000/api/health

# 2) siswa tanpa kelompok memanggil API proyek -> 403
curl -s -o /dev/null -w "%{http_code}\n" -b cookie.txt localhost:3000/api/planning

# 3) cron terproteksi (jalankan SELECT 1 + bersihkan sesi)
curl -s -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/health
```

Di Lab Grafik, ketik `2x+3y<=120` → tulisan otomatis berubah menjadi `2x+3y≤120`, garis berlabel muncul; tambahkan
`x>=0` dan `y>=0` → irisan DHP tergambar; `y < 40` → garis putus-putus.

**Menuliskan simbol ≤ dan ≥:** siswa cukup mengetik `<=` dan `>=` pada papan tombol, di Lab Grafik dan di halaman
Susun Pertidaksamaan, ketikan itu otomatis menjadi `≤`/`≥` sambil mempertahankan posisi kursor (fungsi
`normalizeTypedInequality` + `caretAfterNormalize` di `src/lib/parser.ts`). Di Lab Grafik juga tersedia deretan
tombol cepat `≤ ≥ < > =` yang menyisipkan simbol pada posisi kursor.

## Pemecahan masalah (troubleshooting)

### “Connection to client lost” / “Connection terminated unexpectedly”

Pesan ini datang dari connection pooler di sisi penyedia database (PgBouncer Neon / Supavisor Supabase) yang
memutus koneksi menganggur, bukan dari kode aplikasi. Yang sudah dilakukan aplikasi:

- satu koneksi per instance serverless (`max: 1`) dengan `idle_timeout: 10` detik dan `max_lifetime: 15 menit`
  sehingga soket tidak dipakai setelah mati;
- pembungkus route (`src/lib/http.ts`) mengenali galat koneksi (`src/lib/db-error.ts`), membuang klien lama
  (`resetDb()`), lalu **mengulang sekali permintaan baca (GET/HEAD)**. Permintaan tulis tidak diulang otomatis
  supaya data tidak tersimpan dua kali, siswa diminta menekan tombol simpan sekali lagi;
- pesan galat diterjemahkan ke bahasa Indonesia (503 + penjelasan), bukan “Terjadi kesalahan di server”.

Bila masih sering: pastikan `DATABASE_URL` memakai string **pooled** dari panel Neon (nama host memuat `-pooler`;
tanpa `-pooler` koneksi juga jalan tetapi boros koneksi), dan pastikan `sslmode=require` ada pada string.

### Permintaan pertama terasa lambat (cold start Neon)

Itu perilaku normal paket gratis Neon: compute **tidur setelah 5 menit** tanpa kueri dan bangun dalam ratusan
milidetik saat ada permintaan. Tidak ada data yang hilang dan tidak ada tombol “restore” yang perlu ditekan.

Bila ingin selalu hangat pada jam sekolah, pasang pemantau gratis (cron-job.org / UptimeRobot) yang memanggil
`https://<domain>/api/health` **setiap 5 menit** (07.00–15.00 WIB). Tanpa itu pun aplikasi tetap berfungsi.

### Muncul “unrecognized configuration parameter …”

String koneksi memuat parameter yang hanya dipahami `psql`/libpq (mis. `channel_binding=require`). Aplikasi
membuang parameter tersebut otomatis (`src/lib/db-url.ts`, diuji unit test). Bila pesan ini muncul lagi pada
parameter lain, tambahkan namanya ke `ALLOWED_QUERY_PARAMS`/daftar buang di berkas itu, atau hapus parameter itu
dari string di Vercel.

### Halaman menampilkan “Sambungan ke database sedang bermasalah”

Berarti database tidak terjangkau. Halaman itu (`src/app/error.tsx`) dan notice server-rendered di layout
memberi tombol **Coba lagi**; `/api/health` menjawab `{"status":"degraded"}` (HTTP 503). Langkah pemeriksaan:

1. Coba lagi setelah beberapa detik (kasus tersering: database baru bangun).
2. Vercel → **Settings → Environment Variables**: pastikan `DATABASE_URL` memakai host **`-pooler`** dan
   `DIRECT_URL` memakai host **tanpa `-pooler`**, keduanya berakhiran `?sslmode=require`. Bila string baru saja
   diubah → **Redeploy**.
3. Neon Console → pantau grafik **Compute**; bila kuota bulanan habis, compute nonaktif sampai awal periode
   berikutnya (tidak ada data yang hilang).

Cek status kapan saja:

```bash
curl -s https://<domain>/api/health                       # {"status":"ok"} atau 503 {"status":"degraded"}
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/health   # detail + latensi DB
```

## Yang belum dikerjakan / catatan lanjutan

- Gambar produk di `/public/produk` adalah ilustrasi, bukan foto asli D'Culinary; guru dapat menggantinya dengan
  foto asli (nama berkas sama).
- Belum ada mode offline; aplikasi memerlukan koneksi internet.
- Uji otomatis end-to-end (Playwright) belum ditambahkan; pengujian saat ini berupa unit test (Vitest) + uji manual
  API seperti pada bagian di atas.
