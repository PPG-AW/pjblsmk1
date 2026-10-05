/**
 * Saran pembagian kelompok heterogen (4 orang) dengan pola "ular" (snake draft):
 * siswa diurutkan dari skor kuis tertinggi ke terendah, lalu dibagikan
 * bergantian maju-mundur sehingga rata-rata skor tiap kelompok seimbang.
 *
 * Siswa tanpa skor kuis ditempatkan paling akhir dan diberi tanda.
 */

export type ScoredStudent = {
  studentId: number;
  name: string;
  score: number | null;
};

export type SuggestedGroup = {
  name: string;
  studentIds: number[];
  averageScore: number | null;
  withoutScore: number;
};

export type GroupingMode = "seimbang" | "kecil";

export type GroupingResult = {
  groups: SuggestedGroup[];
  mode: GroupingMode;
  note: string;
  withoutScore: number[];
};

export const DEFAULT_GROUP_SIZE = 4;

function sortStudents(students: ScoredStudent[]): ScoredStudent[] {
  return [...students].sort((a, b) => {
    if (a.score === null && b.score === null) return a.name.localeCompare(b.name, "id");
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name, "id");
  });
}

function summarize(name: string, memberIds: number[], byId: Map<number, ScoredStudent>): SuggestedGroup {
  const scores = memberIds
    .map((id) => byId.get(id)?.score ?? null)
    .filter((score): score is number => score !== null);
  return {
    name,
    studentIds: memberIds,
    averageScore: scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null,
    withoutScore: memberIds.filter((id) => (byId.get(id)?.score ?? null) === null).length,
  };
}

export function suggestHeterogeneousGroups(
  students: ScoredStudent[],
  options: { size?: number; mode?: GroupingMode } = {},
): GroupingResult {
  const size = options.size ?? DEFAULT_GROUP_SIZE;
  const mode = options.mode ?? "seimbang";
  const ordered = sortStudents(students);
  const byId = new Map(students.map((student) => [student.studentId, student]));
  const total = ordered.length;

  if (total === 0) {
    return { groups: [], mode, note: "Belum ada siswa yang bisa dibagi.", withoutScore: [] };
  }

  const groupCount =
    mode === "seimbang"
      ? Math.max(1, Math.floor(total / size))
      : Math.max(1, Math.ceil(total / size));

  const buckets: number[][] = Array.from({ length: groupCount }, () => []);

  // Pola ular: 0,1,...,k-1,k-1,...,1,0,0,...
  let index = 0;
  let direction = 1;
  for (const student of ordered) {
    if (buckets[index]!.length >= size) {
      // dasar terisi: siswa sisa akan ditempatkan pada kelompok berskor terendah
      break;
    }
    buckets[index]!.push(student.studentId);
    if (index + direction < 0 || index + direction >= groupCount) {
      direction *= -1;
    } else {
      index += direction;
    }
  }

  const assigned = new Set(buckets.flat());
  const leftover = ordered.filter((student) => !assigned.has(student.studentId));

  // Sebar siswa sisa ke kelompok dengan rata-rata skor terendah agar tetap seimbang.
  for (const student of leftover) {
    let target = 0;
    let lowest = Number.POSITIVE_INFINITY;
    buckets.forEach((members, candidateIndex) => {
      const scores = members
        .map((id) => byId.get(id)?.score ?? null)
        .filter((score): score is number => score !== null);
      const average = scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
      if (average < lowest) {
        lowest = average;
        target = candidateIndex;
      }
    });
    buckets[target]!.push(student.studentId);
  }

  const groups = buckets.map((memberIds, position) =>
    summarize(`Kelompok ${position + 1}`, memberIds, byId),
  );

  const withoutScore = ordered.filter((student) => student.score === null).map((student) => student.studentId);
  const sizes = groups.map((group) => group.studentIds.length).join(", ");
  const note =
    `Mode "${mode}": ${groups.length} kelompok berukuran ${sizes}. ` +
    (withoutScore.length > 0
      ? `${withoutScore.length} siswa belum punya skor kuis dan ditempatkan di akhir — tandai agar diberi perhatian.`
      : "Semua siswa sudah punya skor kuis.");

  return { groups, mode, note, withoutScore };
}
