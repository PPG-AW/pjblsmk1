import { describe, expect, it } from "vitest";
import {
  buildQuizPlan,
  gradeQuiz,
  isValidQuizSeed,
  newQuizSeed,
  publicQuizQuestions,
  QUIZ_QUESTIONS,
  QUIZ_TOTAL,
  readinessMessage,
} from "@/lib/sptldv";

describe("buildQuizPlan", () => {
  it("menghasilkan urutan yang sama untuk seed yang sama", () => {
    const first = buildQuizPlan("0123456789abcdef");
    const second = buildQuizPlan("0123456789abcdef");
    expect(first.order).toEqual(second.order);
    expect(first.optionOrder).toEqual(second.optionOrder);
  });

  it("mengacak urutan soal dan opsi", () => {
    const plan = buildQuizPlan("fedcba9876543210");
    expect(new Set(plan.order).size).toBe(QUIZ_TOTAL);
    expect(plan.order.length).toBe(QUIZ_TOTAL);
    for (const id of plan.order) {
      const order = plan.optionOrder[id]!;
      const question = QUIZ_QUESTIONS.find((item) => item.id === id)!;
      expect(order).toHaveLength(question.options.length);
      expect([...order].sort()).toEqual(question.options.map((_, index) => index));
    }
  });

  it("tidak pernah mengirim kunci jawaban ke klien", () => {
    const plan = buildQuizPlan("abcdef0123456789");
    const questions = publicQuizQuestions(plan);
    for (const question of questions) {
      const serialized = JSON.stringify(question);
      expect(serialized).not.toContain("correctIndex");
      expect(serialized).not.toContain("explanation");
      expect(question.options).toHaveLength(4);
    }
  });

  it("menerima hanya seed 16 karakter heksadesimal", () => {
    expect(isValidQuizSeed(newQuizSeed())).toBe(true);
    expect(isValidQuizSeed("bukan-seed")).toBe(false);
    expect(isValidQuizSeed("ABC123")).toBe(false);
  });
});

describe("gradeQuiz", () => {
  it("memberi skor penuh bila semua jawaban tepat", () => {
    const plan = buildQuizPlan("1111222233334444");
    const answers: Record<string, number> = {};
    for (const id of plan.order) {
      const question = QUIZ_QUESTIONS.find((item) => item.id === id)!;
      const order = plan.optionOrder[id]!;
      const shuffledIndex = order.findIndex((originalIndex) => originalIndex === question.correctIndex);
      answers[id] = shuffledIndex;
    }
    const grading = gradeQuiz(plan, answers);
    expect(grading.score).toBe(QUIZ_TOTAL);
    expect(grading.details.every((detail) => detail.correct)).toBe(true);
  });

  it("memberi skor nol bila semua jawaban salah", () => {
    const plan = buildQuizPlan("5555666677778888");
    const answers: Record<string, number> = {};
    for (const id of plan.order) {
      const question = QUIZ_QUESTIONS.find((item) => item.id === id)!;
      const order = plan.optionOrder[id]!;
      const wrongShuffledIndex = order.findIndex((originalIndex) => originalIndex !== question.correctIndex);
      answers[id] = wrongShuffledIndex;
    }
    const grading = gradeQuiz(plan, answers);
    expect(grading.score).toBe(0);
  });

  it("menghitung soal yang tidak dijawab sebagai belum tepat", () => {
    const plan = buildQuizPlan("9999000011112222");
    const grading = gradeQuiz(plan, {});
    expect(grading.score).toBe(0);
    expect(grading.details.every((detail) => detail.chosenText === null)).toBe(true);
  });

  it("menyertakan pembahasan untuk tiap soal", () => {
    const plan = buildQuizPlan("aaaabbbbccccdddd");
    const grading = gradeQuiz(plan, {});
    expect(grading.details).toHaveLength(QUIZ_TOTAL);
    for (const detail of grading.details) {
      expect(detail.explanation.length).toBeGreaterThan(10);
      expect(detail.correctText.length).toBeGreaterThan(0);
    }
  });
});

describe("readinessMessage", () => {
  it("tidak memakai kata lulus/gagal", () => {
    for (const score of [0, 5, 8, 10]) {
      const message = readinessMessage(score, 10).toLowerCase();
      expect(message).not.toContain("lulus");
      expect(message).not.toContain("gagal");
    }
  });
});

describe("soal kuis", () => {
  it("memakai konteks nasi ayam & rice bowl, bukan roti/donat", () => {
    const serialized = JSON.stringify(QUIZ_QUESTIONS).toLowerCase();
    expect(serialized).toContain("nasi ayam");
    expect(serialized).toContain("rice bowl");
    expect(serialized).not.toContain("donat");
    expect(serialized).not.toContain("tepung roti");
  });

  it("punya 10 soal dengan 4 opsi dan satu kunci valid", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(10);
    for (const question of QUIZ_QUESTIONS) {
      expect(question.options).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
    }
  });
});
