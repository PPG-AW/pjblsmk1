/**
 * Konten pembelajaran & kuis DapurSPtLDV.
 *
 * Konteks: SMK N 1 Salatiga, kelas X AKL, unit usaha D'Culinary (Tata Boga).
 * Kasus ilustrasi (DATA CONTOH, bukan data asli D'Culinary): nasi ayam & rice bowl.
 */
export const PROJECT_TITLE =
  "Investigasi D'Culinary: Berapa Banyak Produk yang Dapat Dibuat dan Berapa Keuntungan Maksimumnya?";

export const DRIVING_QUESTION =
  "Bagaimana menentukan kombinasi produk Tata Boga yang dapat menghasilkan keuntungan optimal dengan mempertimbangkan keterbatasan sumber daya yang tersedia?";

export const PEMANTIK_QUESTIONS = [
  "Produk apa saja yang dibuat D'Culinary setiap hari, dan bahan apa yang paling menentukan jumlah produksinya?",
  "Mengapa D'Culinary tidak bisa membuat produk sebanyak-banyaknya setiap hari?",
  "Bagaimana cara menentukan banyaknya tiap produk yang sebaiknya dibuat agar keuntungannya paling besar?",
];

export const SIX_PHASES = [
  "Pertanyaan mendasar",
  "Desain perencanaan proyek",
  "Jadwal proyek",
  "Monitoring",
  "Menguji & mengomunikasikan hasil",
  "Evaluasi pengalaman",
];

export const NO_FABRICATION_RULE =
  "Dilarang mengarang data. Data yang tidak diperoleh dicatat sebagai keterbatasan, dan asumsi apa pun harus disepakati dengan guru.";

export const SAMPLE_DATA_LABEL = "Data contoh — bukan data asli D'Culinary.";

/* -------------------------------------------------------------------------- */
/* Cerita masalah (3 babak)                                                   */
/* -------------------------------------------------------------------------- */

export const STORY_CHAPTERS = [
  {
    id: "babak-1",
    title: "Babak 1 — Keputusan produksi setiap hari",
    body:
      "Setiap pagi, pengurus D'Culinary harus memutuskan berapa banyak tiap produk yang akan dibuat: roti, tahu walik, risol, pempek, atau menu lain yang sedang dipesan pelanggan. Keputusan ini harus diambil sebelum membeli bahan, sedangkan pesanan baru diketahui setelah produk siap. Salah menaksir jumlah produksi berarti produk sisa atau kehabisan.",
  },
  {
    id: "babak-2",
    title: "Babak 2 — Bahan dan modal terbatas",
    body:
      "D'Culinary hanya punya stok bahan dan modal terbatas setiap hari. Semua produk memakai bahan yang sama — tepung, minyak, ayam, sayur, kemasan — sehingga menambah produksi satu produk berarti mengurangi kesempatan memproduksi produk lain. Karena itu sering muncul pertanyaan: produk mana yang paling menguntungkan untuk diprioritaskan?",
  },
  {
    id: "babak-3",
    title: "Babak 3 — Tantangan untuk kelompokmu",
    body:
      "Kelompokmu diminta menyelidiki salah satu pasangan produk D'Culinary. Kumpulkan data nyata melalui wawancara dan observasi, susun model matematika (sistem pertidaksamaan linear dua variabel dan fungsi tujuan), lalu tentukan kombinasi produksi yang memberi keuntungan maksimum. Data tidak boleh dikarang: bila data sulit diperoleh, catat sebagai keterbatasan.",
  },
];

/* -------------------------------------------------------------------------- */
/* Data contoh (sudah diverifikasi) untuk modul & Lab Grafik                   */
/* -------------------------------------------------------------------------- */

export const SAMPLE_PRODUCTS = {
  productA: "Nasi ayam",
  productB: "Rice bowl",
  ingredients: [
    { name: "Beras", unit: "gram", perA: 100, perB: 150, total: 6000 },
    { name: "Ayam", unit: "gram", perA: 80, perB: 40, total: 4000 },
  ],
  priceA: 15000,
  priceB: 18000,
  costA: 9000,
  costB: 11000,
  profitA: 6000,
  profitB: 7000,
};

/**
 * Verifikasi model contoh (dihitung ulang):
 *  100x + 150y <= 6000 ; 80x + 40y <= 4000 ; x >= 0 ; y >= 0 ; Z = 6000x + 7000y
 * Titik pojok: (0,0) Z=0 ; (50,0) Z=300.000 ; (45,10) Z=340.000 ; (0,40) Z=280.000
 * Optimum: 45 nasi ayam + 10 rice bowl, Z maksimum Rp340.000.
 */
export const SAMPLE_MODEL_LINES = [
  "100x + 150y <= 6000",
  "80x + 40y <= 4000",
  "x >= 0",
  "y >= 0",
];

export const SAMPLE_OBJECTIVE = "Z = 6.000x + 7.000y";

export const SAMPLE_CORNERS = [
  { x: 0, y: 0, z: 0, note: "Tidak berproduksi" },
  { x: 50, y: 0, z: 300000, note: "Hanya nasi ayam (beras habis)" },
  { x: 45, y: 10, z: 340000, note: "Perpotongan kedua kendala bahan" },
  { x: 0, y: 40, z: 280000, note: "Hanya rice bowl (ayam habis)" },
];

export const SAMPLE_OPTIMUM = {
  x: 45,
  y: 10,
  z: 340000,
  text: "45 porsi nasi ayam dan 10 porsi rice bowl dengan keuntungan maksimum Rp340.000.",
};

/* -------------------------------------------------------------------------- */
/* Lab Grafik: contoh yang bisa dimuat dengan satu klik                        */
/* -------------------------------------------------------------------------- */

export type GraphPreset = {
  id: string;
  title: string;
  description: string;
  lines: string[];
};

export const EXPLORE_PRESETS: GraphPreset[] = [
  {
    id: "beras",
    title: "Contoh 1 — Kendala beras saja",
    description:
      "Nasi ayam memakai 100 g beras, rice bowl 150 g, stok beras 6.000 g. Perhatikan: satu garis saja menghasilkan daerah yang tidak terbatas.",
    lines: ["100x + 150y <= 6000", "x >= 0", "y >= 0"],
  },
  {
    id: "dua-bahan",
    title: "Contoh 2 — Beras + ayam",
    description:
      "Tambahkan kendala ayam: nasi ayam 80 g, rice bowl 40 g, stok 4.000 g. Lihat bagaimana irisan dua kendala mempersempit daerah penyelesaian.",
    lines: ["100x + 150y <= 6000", "80x + 40y <= 4000", "x >= 0", "y >= 0"],
  },
  {
    id: "tanda-garis",
    title: "Contoh 3 — Bandingkan ≤ dan <",
    description:
      "Ganti salah satu tanda menjadi < (misalnya y < 40) dan bandingkan: tanda < digambar sebagai garis putus-putus.",
    lines: ["2x + 3y <= 120", "y < 40", "x >= 0", "y >= 0"],
  },
];

/* -------------------------------------------------------------------------- */
/* Pilihan & label untuk halaman fase proyek                                   */
/* -------------------------------------------------------------------------- */

export const MATERIAL_OPTIONS = [
  "Roti",
  "Tahu walik",
  "Risol",
  "Pempek",
  "Nasi ayam",
  "Rice bowl",
];

export const GROUP_ROLES = [
  "Ketua",
  "Pewawancara",
  "Pencatat data",
  "Dokumentasi",
  "Penyusun model/grafik",
  "Penyusun produk akhir",
];

export const MINIMAL_DATA_CHECKLIST = [
  "Nama dua produk yang dianalisis (A dan B)",
  "Kebutuhan minimal 2 bahan pokok untuk 1 unit produk A dan 1 unit produk B",
  "Stok/total bahan yang tersedia",
  "Harga jual satuan produk A dan produk B",
  "Biaya produksi per unit produk A dan produk B",
];

export const PRODUCT_PLACES = ["Kelas", "D'Culinary", "Di luar jam sekolah"];

export const FINAL_PRODUCT_TYPES = [
  { value: "laporan_tertulis", label: "Laporan tertulis" },
  { value: "laporan_digital", label: "Laporan digital" },
  { value: "poster", label: "Poster / infografis" },
  { value: "video", label: "Video presentasi" },
  { value: "booklet", label: "Booklet" },
];

export const JOURNAL_ACTIVITY_TYPES = [
  "Pertemuan 1",
  "Wawancara/observasi",
  "Pertemuan 2",
  "Menyusun produk akhir",
  "Pertemuan 3",
  "Lainnya",
];

export const DATA_SOURCE_OPTIONS = ["Wawancara", "Observasi", "Dokumen/catatan", "Lainnya"];

/* -------------------------------------------------------------------------- */
/* Kuis kesiapan (10 soal, konteks nasi ayam & rice bowl)                      */
/* -------------------------------------------------------------------------- */

export type QuizQuestion = {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    topic: "Variabel keputusan",
    prompt:
      "Di D'Culinary, x menyatakan banyak porsi nasi ayam dan y menyatakan banyak porsi rice bowl yang dibuat. Satu porsi nasi ayam memakai 100 g beras. Banyak beras (dalam gram) yang dipakai untuk x porsi nasi ayam adalah …",
    options: ["100x", "100y", "80x", "x + 100"],
    correctIndex: 0,
    explanation:
      "Setiap porsi nasi ayam memakai 100 g beras, sehingga untuk x porsi dipakai 100x gram beras.",
  },
  {
    id: "q2",
    topic: "Model kendala",
    prompt:
      "Stok beras di dapur 6.000 g. Nasi ayam memakai 100 g beras per porsi dan rice bowl memakai 150 g beras per porsi. Model kendala untuk pemakaian beras adalah …",
    options: [
      "100x + 150y ≤ 6.000",
      "150x + 100y ≤ 6.000",
      "100x + 150y ≥ 6.000",
      "100x + 150y = 6.000",
    ],
    correctIndex: 0,
    explanation:
      "Pemakaian beras = 100x + 150y gram, dan tidak boleh melebihi stok 6.000 g, jadi 100x + 150y ≤ 6.000.",
  },
  {
    id: "q3",
    topic: "Model kendala",
    prompt:
      "Stok ayam 4.000 g. Satu porsi nasi ayam memakai 80 g ayam, satu porsi rice bowl memakai 40 g ayam. Kendala pemakaian ayam adalah …",
    options: [
      "80x + 40y ≤ 4.000",
      "40x + 80y ≤ 4.000",
      "80x + 40y ≥ 4.000",
      "120x + 120y ≤ 4.000",
    ],
    correctIndex: 0,
    explanation:
      "Pemakaian ayam = 80x + 40y gram dan dibatasi stok 4.000 g sehingga 80x + 40y ≤ 4.000.",
  },
  {
    id: "q4",
    topic: "Fungsi tujuan",
    prompt: "Fungsi tujuan Z = 6.000x + 7.000y pada proyek ini berarti …",
    options: [
      "keuntungan Rp6.000 per porsi nasi ayam dan Rp7.000 per porsi rice bowl",
      "harga jual Rp6.000 per porsi nasi ayam dan Rp7.000 per porsi rice bowl",
      "biaya produksi Rp6.000 dan Rp7.000 per porsi",
      "banyak beras dan ayam yang dipakai",
    ],
    correctIndex: 0,
    explanation:
      "Koefisien fungsi tujuan adalah keuntungan per unit: Rp6.000 per porsi nasi ayam dan Rp7.000 per porsi rice bowl.",
  },
  {
    id: "q5",
    topic: "Makna tanda pertidaksamaan",
    prompt:
      "Mengapa kendala bahan memakai tanda ≤ dan bukan ≥ pada 100x + 150y … 6.000?",
    options: [
      "karena pemakaian bahan tidak boleh melebihi stok yang tersedia",
      "karena stok bahan harus selalu habis terpakai",
      "karena jumlah porsi tidak boleh nol",
      "karena keuntungan harus lebih besar dari modal",
    ],
    correctIndex: 0,
    explanation:
      "Bahan yang dipakai paling banyak sama dengan stok, sehingga pemakaian ≤ stok. Tanda ≥ akan berarti memakai bahan melebihi stok.",
  },
  {
    id: "q6",
    topic: "Uji titik pada kendala",
    prompt:
      "Pasangan (x, y) manakah yang memenuhi kedua kendala 100x + 150y ≤ 6.000 dan 80x + 40y ≤ 4.000?",
    options: ["(45, 10)", "(50, 10)", "(40, 20)", "(60, 0)"],
    correctIndex: 0,
    explanation:
      "(45, 10): beras 100(45) + 150(10) = 6.000 (pas) dan ayam 80(45) + 40(10) = 4.000 (pas). Pilihan lain melewati stok beras atau stok ayam.",
  },
  {
    id: "q7",
    topic: "Daerah penyelesaian",
    prompt: "Daerah penyelesaian (DHP) dari sistem pertidaksamaan linear dua variabel adalah …",
    options: [
      "himpunan semua titik (x, y) yang memenuhi seluruh pertidaksamaan sekaligus",
      "himpunan titik yang memenuhi salah satu pertidaksamaan saja",
      "daerah di luar semua garis batas",
      "titik potong kedua garis batas saja",
    ],
    correctIndex: 0,
    explanation:
      "DHP adalah irisan (bagian bersama) dari daerah yang memenuhi setiap pertidaksamaan, sehingga harus memenuhi semua kendala sekaligus.",
  },
  {
    id: "q8",
    topic: "Nilai fungsi tujuan",
    prompt: "Nilai Z = 6.000x + 7.000y untuk titik (50, 0) adalah …",
    options: ["Rp300.000", "Rp280.000", "Rp340.000", "Rp350.000"],
    correctIndex: 0,
    explanation: "Z = 6.000(50) + 7.000(0) = 300.000.",
  },
  {
    id: "q9",
    topic: "Titik pojok & nilai optimum",
    prompt:
      "Pada daerah penyelesaian yang tertutup (berbentuk poligon), nilai optimum fungsi tujuan diperoleh dengan cara …",
    options: [
      "menghitung nilai Z pada setiap titik pojok daerah penyelesaian lalu membandingkannya",
      "menghitung nilai Z pada titik (0, 0) saja",
      "mengambil titik terjauh dari titik asal",
      "menjumlahkan semua koefisien kendala",
    ],
    correctIndex: 0,
    explanation:
      "Menurut teorema titik pojok, nilai maksimum/minimum fungsi tujuan pada daerah tertutup terjadi di salah satu titik pojoknya.",
  },
  {
    id: "q10",
    topic: "Interpretasi hasil",
    prompt:
      "Nilai Z di titik pojok: (0,0) → 0; (50,0) → 300.000; (45,10) → 340.000; (0,40) → 280.000. Kombinasi produksi yang memberi keuntungan maksimum adalah …",
    options: [
      "45 porsi nasi ayam dan 10 porsi rice bowl",
      "50 porsi nasi ayam saja",
      "40 porsi rice bowl saja",
      "60 porsi nasi ayam saja",
    ],
    correctIndex: 0,
    explanation:
      "Z terbesar (Rp340.000) terjadi di titik pojok (45, 10), jadi sebaiknya dibuat 45 porsi nasi ayam dan 10 porsi rice bowl.",
  },
];

export const QUIZ_TOTAL = QUIZ_QUESTIONS.length;

export type QuizPlan = {
  seed: string;
  order: string[];
  optionOrder: Record<string, number[]>;
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seedNumber: number): () => number {
  let state = seedNumber >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithSeed<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function newQuizSeed(): string {
  // Memakai Web Crypto (tersedia di Node 20+ dan di peramban), sehingga modul
  // ini aman diimpor oleh komponen klien maupun server.
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isValidQuizSeed(seed: string): boolean {
  return /^[0-9a-f]{16}$/.test(seed);
}

/**
 * Rencana kuis: urutan soal dan urutan opsi diacak di server.
 * Kunci jawaban tidak pernah dikirim ke klien.
 */
export function buildQuizPlan(seed: string): QuizPlan {
  const random = mulberry32(hashSeed(seed));
  const order = shuffleWithSeed(
    QUIZ_QUESTIONS.map((question) => question.id),
    random,
  );
  const optionOrder: Record<string, number[]> = {};
  for (const id of order) {
    const question = QUIZ_QUESTIONS.find((item) => item.id === id)!;
    optionOrder[id] = shuffleWithSeed(
      question.options.map((_, index) => index),
      random,
    );
  }
  return { seed, order, optionOrder };
}

export type PublicQuizQuestion = {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
};

export function publicQuizQuestions(plan: QuizPlan): PublicQuizQuestion[] {
  return plan.order.map((id) => {
    const question = QUIZ_QUESTIONS.find((item) => item.id === id)!;
    const order = plan.optionOrder[id]!;
    return {
      id,
      topic: question.topic,
      prompt: question.prompt,
      options: order.map((index) => question.options[index]!),
    };
  });
}

export type QuizGrading = {
  score: number;
  total: number;
  details: {
    questionId: string;
    prompt: string;
    /** Indeks opsi pada urutan asli soal (bukan urutan acak). */
    chosenIndex: number | null;
    /** Indeks opsi pada urutan yang dilihat siswa. */
    chosenShuffledIndex: number | null;
    chosenText: string | null;
    correctText: string;
    correct: boolean;
    explanation: string;
  }[];
};

export function gradeQuiz(plan: QuizPlan, answers: Record<string, number | null>): QuizGrading {
  const details: QuizGrading["details"] = [];
  let score = 0;

  for (const id of plan.order) {
    const question = QUIZ_QUESTIONS.find((item) => item.id === id)!;
    const order = plan.optionOrder[id]!;
    const chosen = answers[id];
    const chosenIndex = typeof chosen === "number" && chosen >= 0 ? chosen : null;
    const originalIndex = chosenIndex !== null ? order[chosenIndex] ?? null : null;
    const correct = originalIndex === question.correctIndex;
    if (correct) score += 1;
    details.push({
      questionId: id,
      prompt: question.prompt,
      chosenIndex: originalIndex,
      chosenShuffledIndex: chosenIndex,
      chosenText:
        chosenIndex !== null ? question.options[order[chosenIndex] ?? -1] ?? null : null,
      correctText: question.options[question.correctIndex]!,
      correct,
      explanation: question.explanation,
    });
  }

  return { score, total: plan.order.length, details };
}

export function readinessMessage(score: number, total: number): string {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.8) {
    return "Kesiapanmu sudah kuat. Kamu siap membantu kelompok menyusun model matematika.";
  }
  if (ratio >= 0.5) {
    return "Kesiapanmu cukup. Pelajari lagi pembahasan soal yang belum tepat, lalu bantu kelompokmu.";
  }
  return "Kesiapanmu masih perlu ditingkatkan. Baca ulang modul (terutama bagian model matematika dan titik pojok), lalu coba kuis lagi sebagai latihan.";
}
