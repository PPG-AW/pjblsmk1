/**
 * Seed data contoh untuk PENGEMBANGAN LOKAL saja.
 *
 * Skrip ini MENOLAK berjalan bila DATABASE_URL bukan host lokal (localhost /
 * 127.0.0.1), supaya data kelas asli di Supabase tidak pernah tertimpa.
 *
 * Jalankan: npm run db:seed
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum diisi.");
  process.exit(1);
}

const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(
    `Seed dihentikan: DATABASE_URL menunjuk ke "${host}" (bukan lokal). ` +
      "Skrip ini hanya untuk database pengembangan lokal.",
  );
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

const STUDENTS = [
  "Aulia Rahma",
  "Bima Saputra",
  "Cinta Maharani",
  "Damar Prakoso",
  "Eka Lestari",
  "Fajar Nugroho",
  "Gita Puspita",
  "Hana Salsabila",
];

const QUIZ_SCORES = [9, 8, 8, 7, 6, 5, 7, 4];

async function main() {
  console.log("Menghapus data lama…");
  await sql`TRUNCATE TABLE
      rate_limits, sessions, journals, inequality_attempts, final_products, reflections,
      interview_slots, interviews, planning_sheets, quiz_attempts, progress, group_members,
      groups, class_roster, reminders, students
    RESTART IDENTITY CASCADE`;

  console.log("Menambahkan pengingat & daftar kelas…");
  await sql`INSERT INTO reminders (message, active) VALUES
    ('Pertemuan 3: kumpulkan produk akhir (tautan Drive) dan refleksi sebelum jam pelajaran berakhir.', true)`;
  await sql`INSERT INTO class_roster (name) VALUES ${sql(STUDENTS.map((name) => [name]))}`;

  const studentRows = await sql`
    INSERT INTO students (name) VALUES ${sql(STUDENTS.map((name) => [name]))}
    RETURNING id, name`;

  console.log("Menambahkan percobaan kuis…");
  for (const [index, student] of studentRows.entries()) {
    const score = QUIZ_SCORES[index % QUIZ_SCORES.length];
    await sql`
      INSERT INTO quiz_attempts (student_id, attempt_no, score, total, answers)
      VALUES (${student.id}, 1, ${score}, 10, '[]'::jsonb)`;
    await sql`
      INSERT INTO progress (student_id, item) VALUES (${student.id}, 'video'), (${student.id}, 'modul')
      ON CONFLICT DO NOTHING`;
  }

  console.log("Membuat kelompok…");
  const groups = await sql`
    INSERT INTO groups (name, pin) VALUES ('Kelompok 1', 'K7M2QP'), ('Kelompok 2', 'R4TX9B')
    RETURNING id, name, pin`;

  const groupOne = groups[0];
  const groupTwo = groups[1];

  for (const [index, student] of studentRows.entries()) {
    const groupId = index < 4 ? groupOne.id : groupTwo.id;
    await sql`INSERT INTO group_members (group_id, student_id) VALUES (${groupId}, ${student.id})`;
  }

  console.log("Menambahkan planning sheet, wawancara, jurnal, slot…");
  const roles = [
    { studentId: studentRows[0].id, roles: ["Ketua", "Penyusun model/grafik"] },
    { studentId: studentRows[1].id, roles: ["Pewawancara"] },
    { studentId: studentRows[2].id, roles: ["Pencatat data", "Dokumentasi"] },
    { studentId: studentRows[3].id, roles: ["Penyusun produk akhir"] },
  ];

  await sql`
    INSERT INTO planning_sheets
      (group_id, question, product_a, product_b, roles, data_sources, interview_questions, schedule,
       final_product_type, ethics_ack, status, updated_by)
    VALUES (
      ${groupOne.id},
      'Bagaimana menentukan kombinasi nasi ayam dan rice bowl D''Culinary agar keuntungannya maksimum?',
      'Nasi ayam', 'Rice bowl', ${sql.json(roles)},
      'Wawancara pengurus D''Culinary + observasi proses produksi',
      ${sql.json([
        "Berapa banyak nasi ayam dan rice bowl yang biasanya dibuat setiap hari?",
        "Berapa gram beras dan ayam yang dipakai untuk satu porsi?",
        "Berapa stok beras dan ayam yang tersedia setiap hari?",
        "Berapa harga jual dan biaya produksi per porsi?",
      ])},
      ${sql.json([
        {
          activity: "Wawancara pengurus D'Culinary",
          place: "D'Culinary",
          date: "2026-10-07",
          person: "Bima Saputra",
        },
      ])},
      'poster', true, 'final', ${studentRows[0].id}
    )`;

  await sql`
    INSERT INTO planning_sheets (group_id, question, product_a, product_b, roles, status, updated_by)
    VALUES (
      ${groupTwo.id},
      'Bagaimana menentukan kombinasi tahu walik dan risol D''Culinary agar keuntungannya maksimum?',
      'Tahu walik', 'Risol', ${sql.json([
        { studentId: studentRows[4].id, roles: ["Ketua"] },
        { studentId: studentRows[5].id, roles: [] },
        { studentId: studentRows[6].id, roles: ["Pencatat data"] },
        { studentId: studentRows[7].id, roles: ["Dokumentasi"] },
      ])}, 'draft', ${studentRows[4].id}
    )`;

  await sql`
    INSERT INTO interviews
      (group_id, product_a, product_b, ingredients, price_a, price_b, cost_a, cost_b, money_status, limitations, updated_by)
    VALUES (
      ${groupOne.id}, 'Nasi ayam', 'Rice bowl',
      ${sql.json([
        { name: "Beras", unit: "gram", perA: 100, perB: 150, total: 6000, status: "lengkap", followUp: "" },
        { name: "Ayam", unit: "gram", perA: 80, perB: 40, total: 4000, status: "lengkap", followUp: "" },
        {
          name: "Kemasan",
          unit: "buah",
          perA: 1,
          perB: 1,
          total: 0,
          status: "belum_ada",
          followUp: "tanya jumlah stok kemasan ke pengurus, Jumat depan",
        },
      ])},
      15000, 18000, 9000, 11000,
      ${sql.json({ priceA: "lengkap", priceB: "lengkap", costA: "lengkap", costB: "lengkap", followUp: "" })},
      'Jumlah kemasan tidak diperoleh sehingga belum dipakai sebagai kendala.',
      ${studentRows[0].id}
    )`;

  await sql`
    INSERT INTO interview_slots (label, date, group_id) VALUES
      ('Slot 1', '2026-10-06', ${groupOne.id}),
      ('Slot 2', '2026-10-07', NULL),
      ('Slot 3', '2026-10-08', NULL)`;

  await sql`
    INSERT INTO journals (student_id, group_id, entry_date, activity_type, activity, obstacle, contribution, doc_link)
    VALUES
      (${studentRows[0].id}, ${groupOne.id}, '2026-10-06', 'Pertemuan 1', 'Menyusun rencana proyek dan membagi peran', '', 'Saya memimpin diskusi dan menulis pertanyaan wawancara inti.', NULL),
      (${studentRows[1].id}, ${groupOne.id}, '2026-10-07', 'Wawancara/observasi', 'Wawancara pengurus D''Culinary tentang bahan dan harga', 'Waktu wawancara hanya 10 menit', 'Saya mewawancarai pengurus dan memastikan semua angka tercatat.', NULL)`;

  await sql`
    INSERT INTO inequality_attempts (group_id, student_id, attempt_no, lines, correct)
    VALUES (${groupOne.id}, ${studentRows[0].id}, 1,
      ${sql.json(["100x + 150y <= 6000", "80x + 40y <= 4000", "x >= 0", "y >= 0"])}, true)`;

  await sql`
    INSERT INTO final_products (group_id, type, title, link, summary, source, model_text, optimum_text, updated_by)
    VALUES (${groupOne.id}, 'poster', 'Poster Keuntungan Maksimum Nasi Ayam & Rice Bowl',
      'https://drive.google.com/file/d/contoh-contoh/view',
      'Dari data wawancara, kombinasi terbaik adalah 45 porsi nasi ayam dan 10 porsi rice bowl dengan keuntungan Rp340.000 per hari. Jumlah ini memakai seluruh stok beras dan ayam sehingga tidak ada bahan tersisa.',
      'Wawancara pengurus D''Culinary (Slot 1) dan observasi proses produksi.',
      '100x + 150y <= 6000 ; 80x + 40y <= 4000 ; x >= 0 ; y >= 0 ; Z = 6000x + 7000y',
      'Titik pojok (0,0)=0 ; (50,0)=300.000 ; (45,10)=340.000 ; (0,40)=280.000. Optimum di (45,10).',
      ${studentRows[0].id})`;

  await sql`
    INSERT INTO reflections (student_id, rating, answers)
    VALUES (${studentRows[0].id}, 5, ${sql.json({
      keberhasilan: "Kami berhasil mengubah data wawancara menjadi model matematika yang bisa dipakai.",
      tantangan: "Menyamakan satuan data stok bahan karena hasil wawancara memakai gram dan kilogram.",
      solusi: "Kami mengonversi semua ke gram lebih dulu lalu mengecek ulang bersama anggota yang mencatat.",
      bermakna: "Saat pengurus menjelaskan kenapa produksi dibatasi stok beras, saya baru sadar matematika ini dipakai sehari-hari.",
      perbaikan: "Kami akan membagi tugas wawancara lebih rinci agar waktunya cukup.",
    })})`;

  console.log("Selesai. Contoh data lokal siap dipakai.");
  await sql.end();
}

main().catch(async (error) => {
  console.error("Seed gagal:", error.message);
  if (error.query) console.error("Query bermasalah:\n" + error.query);
  await sql.end();
  process.exit(1);
});
