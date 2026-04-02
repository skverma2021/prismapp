"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/src/components/auth/sign-out-button";
import { PageHeader } from "@/src/components/shell/page-header";
import { useAuthSession } from "@/src/lib/auth-session";
import { getBreadcrumbs, getRouteMeta, getVisibleNavItems, isNavItemActive } from "@/src/lib/navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, sessionMode } = useAuthSession();
  const items = getVisibleNavItems(session.role);
  const meta = getRouteMeta(pathname);

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-(--border) bg-(--surface)/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="rounded-[1.25rem] bg-slate-900 px-4 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.28em] text-teal-200">PrismApp</p>
            <h2 className="mt-2 text-xl font-semibold">Week-3 Shell</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Shared navigation and authenticated role-aware session state for Week-4 access control.
            </p>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-(--border) bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Authenticated Session</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{session.displayName}</p>
            <p className="text-xs text-slate-500">{session.email}</p>
            <p className="mt-1 text-xs text-slate-500">User ID: {session.userId}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Mode: {sessionMode}</p>
            <div className="mt-4">
              <SignOutButton />
            </div>
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
                      ? "border-transparent bg-(--accent) text-white shadow-[0_12px_24px_rgba(15,118,110,0.24)]"
                      : "border-(--border) bg-white text-slate-800 hover:border-teal-300 hover:bg-(--accent-soft)/50",
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-(--border) bg-(--surface)/90 px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Role Visibility</p>
              <p className="mt-1 text-sm text-slate-600">
                Menu visibility is driven by authenticated session claims and stays aligned with the UI role model.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full bg-white px-3 py-1">{session.role}</span>
              <span className="rounded-full bg-white px-3 py-1">{sessionMode} adapter active</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}