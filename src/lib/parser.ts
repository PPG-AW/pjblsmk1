/**
 * Parser pertidaksamaan linear dua variabel (Lab Grafik & Susun Pertidaksamaan).
 *
 * Dirancang fleksibel: memakai tokenizer (bukan satu regex), sehingga menerima
 * urutan suku bebas, koefisien 1 tanpa angka, spasi bebas, tanda <= >= < > =,
 * pemisah ribuan titik (6.000), desimal koma (2,5), dan bentuk y <= 2x - 5.
 *
 * Catatan notasi angka (konvensi Indonesia):
 * - "6.000"  -> 6000  (titik = pemisah ribuan, pola 1-3 digit + (.ddd))
 * - "2.5"    -> 2.5   (hanya 1 digit setelah titik -> tetap desimal)
 * - "2,5"    -> 2.5   (koma = desimal)
 * - "1.500,5" -> 1500.5
 */

export type RelOp = "<=" | ">=" | "<" | ">" | "=";

export type ParsedInequality = {
  /** Teks asli yang diketik siswa. */
  raw: string;
  /** Bentuk baku: a·x + b·y (op) c */
  a: number;
  b: number;
  op: RelOp;
  c: number;
  kind: "standard" | "axis";
  /** Terisi bila kind = "axis" (kendala sejajar sumbu). */
  variable?: "x" | "y";
};

export type ParseFailure = { error: string };

export function isParseFailure(value: unknown): value is ParseFailure {
  return typeof value === "object" && value !== null && "error" in value;
}

export const PARSE_EXAMPLE = "2x + 3y <= 120";

const UNICODE_REPLACEMENTS: [RegExp, string][] = [
  [/[≤⩽]/g, "<="],
  [/[≥⩾]/g, ">="],
  [/[−–—]/g, "-"],
  [/[×·∙]/g, "*"],
  [/[“”"']/g, ""],
  [/\u00a0/g, " "],
];

function sanitize(input: string): string {
  let text = input;
  for (const [pattern, replacement] of UNICODE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text.trim();
}

/** Ubah teks angka mengikuti konvensi Indonesia (titik ribuan, koma desimal). */
export function parseNumberLiteral(text: string): number | null {
  if (!/^[0-9][0-9.,]*$/.test(text)) return null;
  let normalized = text;
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

type Token =
  | { type: "num"; value: number; text: string; pos: number }
  | { type: "ident"; value: string; pos: number }
  | { type: "rel"; value: RelOp; pos: number }
  | { type: "sign"; value: "+" | "-"; pos: number }
  | { type: "mul"; pos: number }
  | { type: "div"; pos: number }
  | { type: "lparen"; pos: number };

const FRIENDLY_FORMAT_HINT =
  `Format belum dikenali. Contoh yang benar: ${PARSE_EXAMPLE}, x >= 0, y <= 40, atau y > 2x - 5.`;

function tokenize(text: string): Token[] | ParseFailure {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === " ") {
      i += 1;
      continue;
    }
    if (ch === "(") {
      return {
        error:
          "Tanda kurung belum didukung di Lab Grafik. Tulis bentuk terbuka, misalnya 2(x+1) <= 8 menjadi 2x + 2 <= 8.",
      };
    }
    if (ch === "<" || ch === ">") {
      const next = text[i + 1];
      if (next === "=") {
        tokens.push({ type: "rel", value: `${ch}=` as RelOp, pos: i });
        i += 2;
      } else {
        tokens.push({ type: "rel", value: ch as RelOp, pos: i });
        i += 1;
      }
      continue;
    }
    if (ch === "=") {
      tokens.push({ type: "rel", value: "=", pos: i });
      i += 1;
      continue;
    }
    if (ch === "+" || ch === "-") {
      tokens.push({ type: "sign", value: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === "*") {
      tokens.push({ type: "mul", pos: i });
      i += 1;
      continue;
    }
    if (ch === "/") {
      tokens.push({ type: "div", pos: i });
      i += 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9.,]/.test(text[j]!)) j += 1;
      const raw = text.slice(i, j);
      const value = parseNumberLiteral(raw.replace(/[.,]$/, ""));
      if (value === null) {
        return { error: `Angka "${raw}" belum bisa dibaca. Tulis misalnya 6000 atau 6.000.` };
      }
      tokens.push({ type: "num", value, text: raw, pos: i });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < text.length && /[A-Za-z]/.test(text[j]!)) j += 1;
      tokens.push({ type: "ident", value: text.slice(i, j), pos: i });
      i = j;
      continue;
    }
    return { error: `Karakter "${ch}" tidak dikenali. ${FRIENDLY_FORMAT_HINT}` };
  }
  return tokens;
}

type Side = { a: number; b: number; c: number };

function clean(value: number): number {
  const rounded = Math.round(value * 1e9) / 1e9;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function readVariable(token: Token): "x" | "y" | ParseFailure {
  if (token.type !== "ident") return { error: "Nama variabel tidak terbaca." };
  const name = token.value.toLowerCase();
  if (name === "x" || name === "y") return name;
  if (name === "z") {
    return {
      error:
        "z dipakai untuk nilai fungsi tujuan, bukan variabel keputusan. Gunakan x dan y saja.",
    };
  }
  return { error: `Variabel hanya boleh x dan y. Kamu menulis "${token.value}".` };
}

function parseSide(tokens: Token[], sideName: "kiri" | "kanan"): Side | ParseFailure {
  const side: Side = { a: 0, b: 0, c: 0 };
  let i = 0;
  let sign = 1;
  let sawTerm = false;

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.type === "sign") {
      const next = tokens[i + 1];
      if (!next) {
        return { error: `Tanda "${token.value}" di akhir ruas ${sideName} belum diikuti angka atau variabel.` };
      }
      if (next.type === "sign") {
        return { error: `Tanda "${token.value}${next.value}" berurutan belum didukung. Tulis satu tanda saja.` };
      }
      sign *= token.value === "-" ? -1 : 1;
      i += 1;
      continue;
    }

    if (token.type === "num" || token.type === "ident") {
      let coefficient = 1;
      let variable: "x" | "y" | null = null;

      const consumeFactor = (factor: Token): ParseFailure | null => {
        if (factor.type === "num") {
          coefficient *= factor.value;
          return null;
        }
        if (factor.type === "ident") {
          const parsed = readVariable(factor);
          if (isParseFailure(parsed)) return parsed;
          if (variable && variable !== parsed) {
            return {
              error: `Suku "${factor.value}" memuat dua variabel. Sistem pertidaksamaan linear dua variabel hanya memuat x dan y secara terpisah (misalnya 2x + 3y).`,
            };
          }
          variable = parsed;
          return null;
        }
        return { error: FRIENDLY_FORMAT_HINT };
      };

      if (token.type === "num") {
        coefficient = token.value;
        i += 1;
        const next = tokens[i];
        if (next && next.type === "ident") {
          const failure = consumeFactor(next);
          if (failure) return failure;
          i += 1;
        } else if (next && next.type === "num") {
          return {
            error: `Ada dua angka berurutan di ruas ${sideName}. Sisipkan tanda + atau - (misalnya 2x + 3).`,
          };
        }
      } else {
        const failure = consumeFactor(token);
        if (failure) return failure;
        i += 1;
      }

      // Faktor lanjutan: 3*x, x/2, 2*x*y (ditolak karena bukan linear)
      while (i < tokens.length && (tokens[i]!.type === "mul" || tokens[i]!.type === "div")) {
        const operator = tokens[i]!;
        const next = tokens[i + 1];
        if (!next || (next.type !== "num" && next.type !== "ident")) {
          return {
            error: "Tanda * atau / harus diikuti angka atau variabel, misalnya 3*x atau x/2.",
          };
        }
        if (operator.type === "div") {
          if (next.type !== "num") {
            return { error: "Pembagian hanya boleh dengan angka, misalnya x/2." };
          }
          if (next.value === 0) return { error: "Tidak boleh membagi dengan nol." };
          coefficient /= next.value;
          i += 2;
          continue;
        }
        const failure = consumeFactor(next);
        if (failure) return failure;
        i += 2;
      }

      if (i < tokens.length && tokens[i]!.type === "num") {
        return {
          error: `Ada dua angka berurutan di ruas ${sideName}. Sisipkan tanda + atau - (misalnya 2x + 3).`,
        };
      }

      if (variable === "x") side.a += sign * coefficient;
      else if (variable === "y") side.b += sign * coefficient;
      else side.c += sign * coefficient;

      sign = 1;
      sawTerm = true;
      continue;
    }

    if (token.type === "rel") {
      return { error: "Ada lebih dari satu tanda pertidaksamaan pada satu baris." };
    }

    return { error: FRIENDLY_FORMAT_HINT };
  }

  if (!sawTerm) return { error: `Ruas ${sideName} masih kosong. ${FRIENDLY_FORMAT_HINT}` };
  return side;
}

export function parseInequality(input: string): ParsedInequality | ParseFailure {
  const text = sanitize(input ?? "");
  if (text.length === 0) {
    return { error: `Baris ini masih kosong. Contoh: ${PARSE_EXAMPLE}.` };
  }
  if (text.length > 120) {
    return { error: "Baris terlalu panjang (maksimal 120 karakter)." };
  }

  const tokenized = tokenize(text);
  if (isParseFailure(tokenized)) return tokenized;
  const tokens = tokenized;

  const relIndexes = tokens.reduce<number[]>((acc, token, index) => {
    if (token.type === "rel") acc.push(index);
    return acc;
  }, []);

  if (relIndexes.length === 0) {
    return {
      error: `Belum ada tanda pertidaksamaan (<=, >=, <, >). Contoh: ${PARSE_EXAMPLE}.`,
    };
  }
  if (relIndexes.length > 1) {
    return {
      error:
        "Cukup satu tanda pertidaksamaan per baris. Untuk rentang seperti 0 <= x <= 5, tulis menjadi dua baris: x >= 0 dan x <= 5.",
    };
  }

  const relIndex = relIndexes[0]!;
  const relToken = tokens[relIndex]!;
  if (relToken.type !== "rel") return { error: FRIENDLY_FORMAT_HINT };
  const op = relToken.value;

  const left = parseSide(tokens.slice(0, relIndex), "kiri");
  if (isParseFailure(left)) return left;
  const right = parseSide(tokens.slice(relIndex + 1), "kanan");
  if (isParseFailure(right)) return right;

  const a = clean(left.a - right.a);
  const b = clean(left.b - right.b);
  const c = clean(right.c - left.c);

  if (a === 0 && b === 0) {
    return {
      error:
        "Pertidaksamaan ini hanya memuat angka, tidak ada variabel x atau y. Contoh: 2x + 3y <= 120.",
    };
  }

  const kind: ParsedInequality["kind"] = a === 0 || b === 0 ? "axis" : "standard";
  return {
    raw: text,
    a,
    b,
    op,
    c,
    kind,
    ...(kind === "axis" ? { variable: a === 0 ? ("y" as const) : ("x" as const) } : {}),
  };
}

export function opFamily(op: RelOp): "le" | "ge" | "eq" {
  if (op === "<=" || op === "<") return "le";
  if (op === ">=" || op === ">") return "ge";
  return "eq";
}

export function isStrict(op: RelOp): boolean {
  return op === "<" || op === ">";
}

export type ComparableInequality = Pick<ParsedInequality, "a" | "b" | "op" | "c">;

/**
 * Bandingkan dua pertidaksamaan secara matematis.
 * - exact    : model sama persis (koefisien, tanda, ruas kanan)
 * - scaled   : kelipatan skala yang setara (mis. 2x + 3y <= 120 vs 100x + 150y <= 6000)
 * - op       : koefisien & ruas kanan sama, tetapi tanda berbeda (<= vs >=)
 * - rhs      : koefisien sama, ruas kanan berbeda
 * - coef     : satu koefisien berbeda
 * - different: tidak berhubungan
 */
export function compareInequality(
  student: ComparableInequality,
  target: ComparableInequality,
  tolerance = 1e-6,
): "exact" | "scaled" | "op" | "rhs" | "coef" | "different" {
  const a1 = student.a;
  const b1 = student.b;
  const c1 = student.c;
  const a2 = target.a;
  const b2 = target.b;
  const c2 = target.c;

  const sameFamily = opFamily(student.op) === opFamily(target.op);
  const sameOp = student.op === target.op;

  let scale: number | null = null;
  if (Math.abs(a1) > tolerance && Math.abs(a2) > tolerance) {
    scale = a2 / a1;
  } else if (Math.abs(b1) > tolerance && Math.abs(b2) > tolerance) {
    scale = b2 / b1;
  } else {
    return sameFamily || sameOp ? "different" : "different";
  }
  if (!Number.isFinite(scale) || Math.abs(scale) < tolerance) return "different";

  const close = (x: number, y: number) =>
    Math.abs(x - y) <= tolerance + tolerance * Math.max(Math.abs(x), Math.abs(y));

  const coefMatches = close(a2, scale * a1) && close(b2, scale * b1);
  if (!coefMatches) return "coef";

  const rhsMatches = close(c2, scale * c1);
  if (!rhsMatches) return "rhs";

  if (!sameFamily) return "op";
  if (Math.abs(scale - 1) > tolerance) return "scaled";
  return sameOp ? "exact" : "exact";
}

export function trimNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  if (Number.isInteger(rounded)) {
    return new Intl.NumberFormat("id-ID").format(rounded);
  }
  return String(rounded).replace(".", ",");
}

/* -------------------------------------------------------------------------- */
/*  Bantuan pengetikan: <= otomatis menjadi ≤                                 */
/* -------------------------------------------------------------------------- */

/**
 * Ubah ketikan siswa menjadi simbol yang enak dibaca:
 *   <=  dan  =<   ->  ≤
 *   >=  dan  =>   ->  ≥
 *
 * Tanda tunggal < dan > tetap dibiarkan (memang berarti garis putus-putus),
 * sehingga siswa cukup menulis seperti biasa tanpa perlu mencari simbol di
 * papan tombol. Parser tetap menerima kedua bentuk, jadi fungsi ini murni
 * kenyamanan pengetikan.
 */
export function normalizeTypedInequality(text: string): string {
  return text
    .replace(/<=/g, "≤")
    .replace(/=</g, "≤")
    .replace(/>=/g, "≥")
    .replace(/=>/g, "≥");
}

/**
 * Hitung posisi kursor setelah normalizeTypedInequality dipakai.
 * Setiap penggantian dua karakter menjadi satu karakter menggeser kursor satu
 * langkah ke kiri, sehingga kursor tidak melompat ke ujung teks.
 */
export function caretAfterNormalize(raw: string, caret: number): number {
  const clamped = Math.max(0, Math.min(caret, raw.length));
  const before = raw.slice(0, clamped);
  const matches = before.match(/<=|=<|>=|=>/g);
  const removed = matches ? matches.length : 0;
  return Math.max(0, clamped - removed);
}
