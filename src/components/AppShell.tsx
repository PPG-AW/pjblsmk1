import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import JournalTicker from "@/components/JournalTicker";
import NextStepBar from "@/components/NextStepBar";
import { STUDENT_STEPS } from "@/lib/steps";

export type ShellSession =
  | { kind: "guest" }
  | {
      kind: "student";
      name: string;
      groupName: string | null;
      /** Info pengingat jurnal harian; null bila siswa belum bergabung di kelompok. */
      ticker: { hasJournalToday: boolean; reminder: string | null } | null;
    }
  | { kind: "teacher" };


export default function AppShell({
  session,
  children,
}: {
  session: ShellSession;
  children: React.ReactNode;
}) {
  const isStudent = session.kind === "student";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-kitchen-800/80 bg-kitchen-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href={session.kind === "teacher" ? "/guru/dashboard" : "/dashboard"} className="flex items-center gap-2 no-underline">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ember-500 font-display text-lg font-bold text-kitchen-950">
              D
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg text-cream-100">DapurSPtLDV</span>
              <span className="block font-mono text-[10px] tracking-wider text-cream-400 uppercase">
                SMK N 1 Salatiga · D&apos;Culinary
              </span>
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-2">
            {session.kind === "student" && (
              <span className="chip">
                {session.name}
                {session.groupName ? ` · ${session.groupName}` : " · belum berkelompok"}
              </span>
            )}
            {session.kind === "teacher" && <span className="chip chip-ok">Mode guru</span>}
            {session.kind === "guest" && (
              <Link className="btn btn-primary btn-small" href="/">
                Masuk
              </Link>
            )}
            {session.kind !== "guest" && <LogoutButton />}
          </div>
        </div>

        {isStudent && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-xs">
            {STUDENT_STEPS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-lg border border-kitchen-800 px-2.5 py-1 whitespace-nowrap no-underline text-cream-300 transition hover:border-ember-500/60 hover:text-ember-300"
              >
                {item.nav}
              </Link>
            ))}
          </nav>
        )}

        {session.kind === "student" && session.ticker && (
          <JournalTicker
            hasJournalToday={session.ticker.hasJournalToday}
            reminder={session.ticker.reminder}
          />
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {isStudent && <NextStepBar />}

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-cream-400">
        <p>DapurSPtLDV · proyek PjBL Program Linear (SPtLDV) kelas X AKL.</p>
      </footer>
    </div>
  );
}
