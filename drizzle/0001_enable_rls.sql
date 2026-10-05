-- ---------------------------------------------------------------------------
-- Keamanan: aktifkan Row Level Security (RLS) pada SEMUA tabel, TANPA policy.
--
-- Tujuan: menutup akses langsung lewat API publik Supabase (PostgREST) memakai
-- anon key. Aplikasi tetap berfungsi karena server terhubung sebagai role
-- "postgres" (pemilik tabel) yang melewati RLS.
--
-- Jangan menambahkan policy apa pun di sini: akses data hanya boleh lewat
-- route API Next.js (server side) yang sudah memakai helper otorisasi.
-- ---------------------------------------------------------------------------

ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "class_roster" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "planning_sheets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inequality_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "journals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "final_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reflections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interview_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Cabut hak akses role publik Supabase (anon/authenticated) bila role tersebut
-- ada, sehingga kalaupun RLS dimatikan di masa depan, API publik tetap tertutup.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
  END IF;
END
$$;
