"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PageHeader } from "@/src/components/shell/page-header";
import { getBreadcrumbs, getRouteMeta, getVisibleNavItems, isNavItemActive } from "@/src/lib/navigation";
import { useMockSession } from "@/src/lib/mock-session";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, setRole } = useMockSession();
  const items = getVisibleNavItems(session.role);
  const meta = getRouteMeta(pathname);

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="rounded-[1.25rem] bg-slate-900 px-4 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.28em] text-teal-200">PrismApp</p>
            <h2 className="mt-2 text-xl font-semibold">Week-3 Shell</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Shared navigation and mocked role-aware session state before Week-4 credentials auth.
            </p>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Mock Session</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{session.displayName}</p>
            <p className="text-xs text-slate-500">{session.userId}</p>
            <label className="mt-4 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Active Role
              <select
                value={session.role}
                onChange={(event) => setRole(event.target.value as typeof session.role)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="SOCIETY_ADMIN">SOCIETY_ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="READ_ONLY">READ_ONLY</option>
              </select>
            </label>
          </div>

          <nav className="mt-5 space-y-2" aria-label="Primary">
            {items.map((item) => {
              const active = isNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-[1.25rem] border px-4 py-3 transition",
                    active
                      ? "border-transparent bg-[var(--accent)] text-white shadow-[0_12px_24px_rgba(15,118,110,0.24)]"
                      : "border-[var(--border)] bg-white text-slate-800 hover:border-teal-300 hover:bg-[var(--accent-soft)]/50",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className={active ? "mt-1 text-xs text-teal-100" : "mt-1 text-xs text-slate-500"}>{item.description}</p>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-4">
          <PageHeader
            breadcrumbs={getBreadcrumbs(pathname)}
            eyebrow="Dashboard Shell"
            title={meta.title}
            description={meta.description}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]/90 px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Role Visibility</p>
              <p className="mt-1 text-sm text-slate-600">
                Menu visibility is driven by the mocked role selector and stays independent from API auth headers.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full bg-white px-3 py-1">{session.role}</span>
              <span className="rounded-full bg-white px-3 py-1">Week 4 auth adapter pending</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}