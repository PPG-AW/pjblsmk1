# DapurSPtLDV — Investigasi D'Culinary

Aplikasi web pendamping **RPP Program Linear / Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV)** untuk
**SMK N 1 Salatiga, Matematika Fase E, kelas X AKL**, dengan model **Project Based Learning (PjBL)** 3 pertemuan
(6 JP) dan konteks unit usaha **D'Culinary** (Jurusan Tata Boga).

Judul proyek: *“Investigasi D'Culinary: Berapa Banyak Produk yang Dapat Dibuat dan Berapa Keuntungan
Maksimumnya?”*

| Fase PjBL | Halaman siswa |
|---|---|
| Pertanyaan mendasar | `/belajar/video` (cerita D'Culinary + video + pertanyaan pemantik) |
| Memahami materi | `/belajar/modul`, `/belajar/grafik` (Lab Grafik eksplorasi), `/belajar/kuis` |
| Desain perencanaan & jadwal | `/proyek/perencanaan` (Project Planning Sheet) |
| Monitoring | `/proyek/wawancara`, `/proyek/pertidaksamaan`, `/proyek/grafik` (verifikasi), `/proyek/jurnal` |
| Menguji & mengomunikasikan hasil | `/akhir/produk` (tautan Drive + ringkasan) |
| Evaluasi pengalaman | `/akhir/refleksi` |

Dashboard guru: `/guru/dashboard`. Login siswa cukup nama lengkap di `/`.

## Tumpukan teknologi

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**
- **Supabase Postgres** diakses **hanya dari server** lewat **Drizzle ORM** (`drizzle-orm/postgres-js` + paket
  `postgres`, opsi `prepare: false` untuk transaction pooler)
- **Vercel** sebagai hosting (region `sin1`) + cron harian `/api/health`
- **Vitest** untuk unit test parser, geometri clipping, model wawancara, kuis, dan pembagian kelompok
- Tidak memakai `supabase-js` maupun anon key di klien

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

## Setup Supabase

1. Daftar di <https://supabase.com> → **New project**. Region **Southeast Asia (Singapore)**.
2. Simpan **Database password**.
3. **Project Settings → Database → Connection string**:
   - **Transaction pooler (port 6543)** → isi ke `DATABASE_URL` (dipakai aplikasi saat berjalan).
   - **Session pooler (port 5432)** → isi ke `DIRECT_URL` (dipakai `drizzle-kit` untuk migrasi, aman di IPv4).
4. Jalankan migrasi dari komputermu:

```bash
export DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
npm run db:migrate
```

Migrasi otomatis mengaktifkan **Row Level Security pada semua tabel tanpa policy** dan mencabut hak akses role
`anon`/`authenticated`. Aplikasi tetap berfungsi karena server terhubung sebagai role `postgres` (pemilik tabel),
sementara akses langsung lewat API publik Supabase (PostgREST + anon key) tertutup.

Catatan paket gratis: proyek Supabase dijeda otomatis setelah ±1 minggu tanpa aktivitas. `vercel.json` memuat
cron harian ke `/api/health`, dan endpoint itu **melakukan `SELECT 1`** (syarat cron Vercel berjalan hanya dengan
respons 200) serta membersihkan sesi kedaluwarsa.

## Setup Vercel

1. Daftar/login dengan akun GitHub → **Add New → Project** → pilih repo ini.
2. **Environment Variables** (Production **dan** Preview):

| Nama | Isi |
|---|---|
| `DATABASE_URL` | Transaction pooler Supabase (port 6543) |
| `DIRECT_URL` | Session pooler Supabase (port 5432) |
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
- **Validasi input** di server (panjang, tipe, rentang, daftar status), tautan hanya https dari
  `drive.google.com`, `docs.google.com`, `youtube.com`, `youtu.be` dan selalu ditampilkan dengan
  `rel="noopener noreferrer"`.
- **Header keamanan** lewat `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, dan `X-Frame-Options`
  (khusus deployment Vercel agar pratinjau lokal tetap bisa dibingkai).
- **RLS aktif tanpa policy** + pencabutan hak akses `anon`/`authenticated`.

## Pemetaan RPP → aplikasi

| Bagian RPP | Wujud di aplikasi |
|---|---|
| Konteks D'Culinary, kelas X AKL | Seluruh cerita, contoh data, soal kuis, dan teks antarmuka |
| Project Planning Sheet | `/proyek/perencanaan` — 10 bagian (pertanyaan, produk, peran, sumber data, pertanyaan wawancara, jadwal, nomor urut hari wawancara, bentuk produk akhir, tautan pedoman, etika) |
| Form Wawancara | `/proyek/wawancara` — **tanpa waktu produksi**; 2–6 bahan pokok, stok, harga jual satuan, biaya produksi, status kelengkapan + tindak lanjut, peringatan satuan campuran, tautan foto LKPD, catatan keterbatasan |
| Lab Grafik ala GeoGebra | `<LabGrafik mode="eksplorasi" \| "verifikasi">` — siswa mengetik pertidaksamaan, DHP diarsir, label di dekat tiap garis, pan/zoom, **tanpa slider, tanpa klik titik pojok, tanpa nilai Z otomatis** |
| Kuis | 10 soal konteks nasi ayam & rice bowl, **tanpa batas kelulusan**, skor kesiapan + pembahasan, soal & opsi diacak di server |
| Jurnal harian | `/proyek/jurnal` — berbasis tanggal + label kegiatan, kolom kontribusi wajib, tautan dokumentasi, entri anggota lain hanya baca |
| Produk akhir | `/akhir/produk` — satu pengumpulan per kelompok, **tautan Drive + ringkasan**, tanpa unggahan berkas |
| Refleksi | `/akhir/refleksi` — lima pertanyaan + rating 1–5 |
| Guru memantau | `/guru/dashboard` — saran kelompok heterogen, panel per kelompok, slot wawancara, pengingat, catatan guru, ekspor CSV |

## Keputusan desain (asumsi)

1. **Gerbang fase proyek** = sudah tergabung di kelompok (PIN). Tidak ada syarat skor kuis; kuis sebaiknya tetap
   dikerjakan karena skornya dipakai untuk menyusun kelompok.
2. **Fungsi tujuan** = keuntungan per unit (harga jual satuan − biaya produksi per unit), sehingga kolom biaya
   produksi tetap ada. Bentuknya ditulis `Z = (untung A)x + (untung B)y`.
3. **Titik pojok dan nilai optimum dikerjakan manual** di LKPD. Lab Grafik hanya menggambar garis, label, dan DHP;
   tidak ada penanda titik pojok maupun perhitungan Z.
4. **Skor kuis untuk pembagian kelompok** memakai percobaan **pertama** (default, lebih adil sebagai tes kesiapan),
   dan dapat diubah guru menjadi **skor tertinggi** di pengaturan.
5. **Produk akhir dan dokumentasi berupa tautan** (Google Drive), bukan unggahan berkas, sehingga tidak ada berkas
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
    diberi penekanan setelah model benar — sesuai kebebasan yang diberikan RPP.
11. **Item berstatus “Belum ada”** tidak dipakai sebagai kendala; item “Belum jelas” tetap dipakai bila angkanya
    sudah ada, tetapi harus punya kolom tindak lanjut.
12. **Slot wawancara** dibuat guru; satu slot hanya untuk satu kelompok (ditegakkan `unique` di database), sehingga
    pemilihan bersamaan ditolak dengan pesan ramah.
13. **Pertemuan/tahap berjalan** (1, 2, 3) menggantikan pengaturan “hari ke-N” pada versi sebelumnya.

## Model data (Drizzle, 17 tabel)

`students` (indeks unik `lower(name)`), `sessions` (`expires_at`), `rate_limits`, `class_roster`, `groups`,
`group_members` (satu kelompok per siswa), `progress`, `quiz_attempts` (tanpa kolom `passed`), `reminders`,
`settings`, `planning_sheets` (satu per kelompok), `interviews` (bahan sebagai `jsonb` + status kelengkapan),
`inequality_attempts`, `journals`, `final_products` (satu per kelompok), `reflections`, `interview_slots`.

Semua kolom foreign key yang sering difilter (`student_id`, `group_id`) memiliki indeks.

## Ekspor CSV (dashboard guru)

- `?type=quiz` — skor kuis per siswa
- `?type=groups` — daftar kelompok + PIN + skor rata-rata
- `?type=journal` — kontribusi jurnal per anggota
- `?type=status` — status setiap tahapan per kelompok

## Uji manual cepat (kriteria penerimaan)

```bash
# 1) health
curl -s localhost:3000/api/health

# 2) siswa tanpa kelompok memanggil API proyek -> 403
curl -s -o /dev/null -w "%{http_code}\n" -b cookie.txt localhost:3000/api/planning

# 3) cron terproteksi (jalankan SELECT 1 + bersihkan sesi)
curl -s -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/health
```

Di Lab Grafik, ketik `2x+3y<=120` → garis berlabel muncul; tambahkan `x>=0` dan `y>=0` → irisan DHP tergambar;
`y < 40` → garis putus-putus.

## Yang belum dikerjakan / catatan lanjutan

- Video cerita masalah diisi guru melalui pengaturan (tautan YouTube). Berkas video tidak dibundel di repo.
- Gambar produk di `/public/produk` adalah ilustrasi, bukan foto asli D'Culinary; guru dapat menggantinya dengan
  foto asli (nama berkas sama).
- Belum ada mode offline; aplikasi memerlukan koneksi internet.
- Uji otomatis end-to-end (Playwright) belum ditambahkan; pengujian saat ini berupa unit test (Vitest) + uji manual
  API seperti pada bagian di atas.
