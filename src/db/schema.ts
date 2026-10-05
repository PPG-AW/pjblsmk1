import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  Ingredient,
  MoneyData,
  ReflectionAnswers,
  RoleAssignment,
  ScheduleRow,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Siswa, sesi, dan pembatasan laju akses                                     */
/* -------------------------------------------------------------------------- */

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("students_name_lower_idx").on(sql`lower(${t.name})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    role: text("role").notNull(),
    studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("sessions_student_id_idx").on(t.studentId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

/** Daftar nama kelas (opsional): bila diaktifkan guru, nama di luar daftar ditolak. */
export const classRoster = pgTable(
  "class_roster",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("class_roster_name_lower_idx").on(sql`lower(${t.name})`)],
);

/* -------------------------------------------------------------------------- */
/* Kelompok                                                                   */
/* -------------------------------------------------------------------------- */

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pin: text("pin").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("group_members_student_unique_idx").on(t.studentId),
    index("group_members_group_id_idx").on(t.groupId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Progres & kuis                                                             */
/* -------------------------------------------------------------------------- */

/** item: 'cerita' | 'modul' | 'grafik' | 'grafik_verifikasi' */
export const progress = pgTable(
  "progress",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    item: text("item").notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("progress_student_item_unique_idx").on(t.studentId, t.item),
    index("progress_student_id_idx").on(t.studentId),
  ],
);

export type QuizStoredAnswerRow = {
  questionId: string;
  chosen: number | null;
  correct: boolean;
};

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    answers: jsonb("answers").$type<QuizStoredAnswerRow[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quiz_attempts_student_id_idx").on(t.studentId),
    uniqueIndex("quiz_attempts_student_attempt_unique_idx").on(t.studentId, t.attemptNo),
  ],
);

/* -------------------------------------------------------------------------- */
/* Pengumuman & pengaturan                                                    */
/* -------------------------------------------------------------------------- */

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Fase proyek                                                                */
/* -------------------------------------------------------------------------- */

export const planningSheets = pgTable("planning_sheets", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .unique()
    .references(() => groups.id, { onDelete: "cascade" }),
  question: text("question").notNull().default(""),
  productA: text("product_a").notNull().default(""),
  productB: text("product_b").notNull().default(""),
  roles: jsonb("roles").$type<RoleAssignment[]>().notNull().default([]),
  dataSources: text("data_sources").notNull().default(""),
  interviewQuestions: jsonb("interview_questions").$type<string[]>().notNull().default([]),
  schedule: jsonb("schedule").$type<ScheduleRow[]>().notNull().default([]),
  finalProductType: text("final_product_type").notNull().default(""),
  guideLink: text("guide_link"),
  ethicsAck: boolean("ethics_ack").notNull().default(false),
  status: text("status").notNull().default("draft"),
  teacherNote: text("teacher_note"),
  updatedBy: integer("updated_by").references(() => students.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interviews = pgTable(
  "interviews",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .unique()
      .references(() => groups.id, { onDelete: "cascade" }),
    productA: text("product_a").notNull().default(""),
    productB: text("product_b").notNull().default(""),
    ingredients: jsonb("ingredients").$type<Ingredient[]>().notNull().default([]),
    priceA: integer("price_a"),
    priceB: integer("price_b"),
    costA: integer("cost_a"),
    costB: integer("cost_b"),
    moneyStatus: jsonb("money_status").$type<MoneyData | null>(),
    photoLink: text("photo_link"),
    limitations: text("limitations").notNull().default(""),
    updatedBy: integer("updated_by").references(() => students.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("interviews_group_id_idx").on(t.groupId)],
);

export const inequalityAttempts = pgTable(
  "inequality_attempts",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
    studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull(),
    lines: jsonb("lines").$type<string[]>().notNull().default([]),
    result: jsonb("result").$type<unknown>(),
    correct: boolean("correct").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inequality_attempts_group_id_idx").on(t.groupId),
    index("inequality_attempts_student_id_idx").on(t.studentId),
  ],
);

export const journals = pgTable(
  "journals",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
    entryDate: text("entry_date").notNull(),
    activityType: text("activity_type").notNull(),
    activity: text("activity").notNull(),
    obstacle: text("obstacle").notNull().default(""),
    contribution: text("contribution").notNull(),
    docLink: text("doc_link"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("journals_student_id_idx").on(t.studentId),
    index("journals_group_id_idx").on(t.groupId),
    index("journals_entry_date_idx").on(t.entryDate),
  ],
);

export const finalProducts = pgTable("final_products", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .unique()
    .references(() => groups.id, { onDelete: "cascade" }),
  type: text("type").notNull().default(""),
  title: text("title").notNull().default(""),
  link: text("link").notNull().default(""),
  summary: text("summary").notNull().default(""),
  source: text("source").notNull().default(""),
  modelText: text("model_text").notNull().default(""),
  optimumText: text("optimum_text").notNull().default(""),
  updatedBy: integer("updated_by").references(() => students.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reflections = pgTable(
  "reflections",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .unique()
      .references(() => students.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull().default(3),
    answers: jsonb("answers").$type<ReflectionAnswers>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reflections_student_id_idx").on(t.studentId)],
);

/* -------------------------------------------------------------------------- */
/* Slot wawancara (dibuat guru, dipilih kelompok)                             */
/* -------------------------------------------------------------------------- */

export const interviewSlots = pgTable(
  "interview_slots",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull(),
    date: text("date").notNull().default(""),
    /** Satu slot hanya boleh dipakai satu kelompok (unique) -> aman dari race. */
    groupId: integer("group_id")
      .unique()
      .references(() => groups.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("interview_slots_group_id_idx").on(t.groupId)],
);

/* -------------------------------------------------------------------------- */
/* Tipe turunan                                                                */
/* -------------------------------------------------------------------------- */

export type Student = typeof students.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type PlanningSheet = typeof planningSheets.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type Journal = typeof journals.$inferSelect;
export type FinalProduct = typeof finalProducts.$inferSelect;
export type Reflection = typeof reflections.$inferSelect;
export type InterviewSlot = typeof interviewSlots.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
