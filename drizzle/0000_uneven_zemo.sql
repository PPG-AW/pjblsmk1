CREATE TABLE "class_roster" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"model_text" text DEFAULT '' NOT NULL,
	"optimum_text" text DEFAULT '' NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "final_products_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"pin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_pin_unique" UNIQUE("pin")
);
--> statement-breakpoint
CREATE TABLE "inequality_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer,
	"student_id" integer,
	"attempt_no" integer NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result" jsonb,
	"correct" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"group_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_slots_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"product_a" text DEFAULT '' NOT NULL,
	"product_b" text DEFAULT '' NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_a" integer,
	"price_b" integer,
	"cost_a" integer,
	"cost_b" integer,
	"money_status" jsonb,
	"photo_link" text,
	"limitations" text DEFAULT '' NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interviews_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "journals" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"group_id" integer,
	"entry_date" text NOT NULL,
	"activity_type" text NOT NULL,
	"activity" text NOT NULL,
	"obstacle" text DEFAULT '' NOT NULL,
	"contribution" text NOT NULL,
	"doc_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"question" text DEFAULT '' NOT NULL,
	"product_a" text DEFAULT '' NOT NULL,
	"product_b" text DEFAULT '' NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_sources" text DEFAULT '' NOT NULL,
	"interview_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"final_product_type" text DEFAULT '' NOT NULL,
	"guide_link" text,
	"ethics_ack" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"teacher_note" text,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planning_sheets_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"item" text NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"attempt_no" integer NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflections" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"rating" integer DEFAULT 3 NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reflections_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"student_id" integer,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "final_products" ADD CONSTRAINT "final_products_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_products" ADD CONSTRAINT "final_products_updated_by_students_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inequality_attempts" ADD CONSTRAINT "inequality_attempts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inequality_attempts" ADD CONSTRAINT "inequality_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_slots" ADD CONSTRAINT "interview_slots_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_updated_by_students_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_sheets" ADD CONSTRAINT "planning_sheets_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_sheets" ADD CONSTRAINT "planning_sheets_updated_by_students_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_roster_name_lower_idx" ON "class_roster" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_student_unique_idx" ON "group_members" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "group_members_group_id_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "inequality_attempts_group_id_idx" ON "inequality_attempts" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "inequality_attempts_student_id_idx" ON "inequality_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "interview_slots_group_id_idx" ON "interview_slots" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "interviews_group_id_idx" ON "interviews" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "journals_student_id_idx" ON "journals" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "journals_group_id_idx" ON "journals" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "journals_entry_date_idx" ON "journals" USING btree ("entry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_student_item_unique_idx" ON "progress" USING btree ("student_id","item");--> statement-breakpoint
CREATE INDEX "progress_student_id_idx" ON "progress" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_id_idx" ON "quiz_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_student_attempt_unique_idx" ON "quiz_attempts" USING btree ("student_id","attempt_no");--> statement-breakpoint
CREATE INDEX "reflections_student_id_idx" ON "reflections" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "sessions_student_id_idx" ON "sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "students_name_lower_idx" ON "students" USING btree (lower("name"));