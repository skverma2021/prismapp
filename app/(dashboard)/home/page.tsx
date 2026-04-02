"use client";

import Link from "next/link";

import { PageHeader } from "@/src/components/shell/page-header";
import { StateSurface } from "@/src/components/ui/state-surface";
import { useAuthSession } from "@/src/lib/auth-session";

type EntryCard = {
  description: string;
  href: string;
  kicker: string;
  roles: Array<"SOCIETY_ADMIN" | "MANAGER" | "READ_ONLY">;
  title: string;
};

const entryCards: EntryCard[] = [
  {
    kicker: "Operations",
    title: "Contribution Capture",
    description: "Record contributions and corrections with the existing Week-2 posting flow.",
    href: "/contributions",
    roles: ["SOCIETY_ADMIN", "MANAGER"],
  },
  {
    kicker: "Reporting",
    title: "Transactions Report",
    description: "Audit transaction detail rows, totals, filters, and CSV export output.",
    href: "/reports/contributions/transactions",
    roles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
  },
  {
    kicker: "Reporting",
    title: "Paid/Unpaid Matrix",
    description: "Review month coverage and expected collection against the active rate context.",
    href: "/reports/contributions/paid-unpaid-matrix",
    roles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
  },
];

export default function DashboardHomePage() {
  const { session, sessionMode } = useAuthSession();
  const visibleCards = entryCards.filter((card) => card.roles.includes(session.role));

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: "Home" }]}
        eyebrow="Role-Aware Home"
        title={`Welcome, ${session.displayName}`}
        description="Your authenticated role controls which entry points are visible in the shell and which workflow screens are available in this phase."
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {visibleCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_22px_44px_rgba(15,23,42,0.12)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">{card.kicker}</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              <span className="mt-5 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                Open
              </span>
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          <StateSurface
            title="Current role"
            message={`${session.role} can ${session.role === "READ_ONLY" ? "view reports only" : "access contribution capture and reports"} in the Week-3 shell.`}
          />
          <StateSurface
            tone="warning"
            title="Session mode"
            message={`The shell is currently backed by the ${sessionMode} adapter. Browser session state is now authenticated and ready for tighter backend integration in the next slice.`}
          />
        </div>
      </section>
    </div>
  );
}