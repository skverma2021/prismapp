import Link from "next/link";

import { PageHeader } from "@/src/components/shell/page-header";
import { StateSurface } from "@/src/components/ui/state-surface";

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <main className="mx-auto flex max-w-6xl flex-col gap-5">
        <PageHeader
          eyebrow="Public Entry"
          title="PrismApp"
          description="Society operations workspace with contributions and reporting complete through Week 2, now moving into the Week-3 shell and navigation baseline."
        />

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-strong)]/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent-strong)]">Current Workspace</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Contribution module is live and the shell is ready for Week 3.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Use the dashboard home to switch mocked roles, confirm menu visibility, and navigate the contribution and report flows inside the shared shell.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/home"
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                Open Dashboard Home
              </Link>
              <Link
                href="/contributions"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Open Contribution Capture
              </Link>
              <Link
                href="/reports/contributions/transactions"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Transactions Report
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <StateSurface
              title="Auth status"
              message="UI session state is mocked for Week 3. Backend mutation/report authorization still runs through the existing request-header contract until Week 4 credentials auth lands."
            />
            <StateSurface
              tone="warning"
              title="Environment"
              message="This workspace is connected to the configured Prisma Postgres database from your local .env. Route-level shell changes should not affect the API contract." 
            />
          </div>
        </section>
      </main>
    </div>
  );
}