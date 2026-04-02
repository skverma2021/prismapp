import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/src/components/auth/login-form";
import { PageHeader } from "@/src/components/shell/page-header";
import { StateSurface } from "@/src/components/ui/state-surface";
import { getServerAppSession } from "@/src/lib/server-auth";

function getAuthBanner(searchParams: { auth?: string; next?: string }) {
  if (searchParams.auth === "required") {
    return {
      tone: "warning" as const,
      message: searchParams.next
        ? `Sign in to continue to ${searchParams.next}.`
        : "Sign in to continue to the protected workspace.",
    };
  }

  if (searchParams.auth === "signed-out") {
    return {
      tone: "success" as const,
      message: "You have been signed out of PrismApp.",
    };
  }

  return undefined;
}

export default async function PublicLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; next?: string }>;
}) {
  const session = await getServerAppSession();

  if (session) {
    redirect("/home");
  }

  const params = await searchParams;
  const redirectTo = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/home";
  const authBanner = getAuthBanner(params);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <main className="mx-auto flex max-w-6xl flex-col gap-5">
        <PageHeader
          eyebrow="Public Entry"
          title="PrismApp"
          description="Society operations workspace with contributions and reporting complete through Week 2, now entering Week-4 authentication with credentials login and protected navigation."
        />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-(--border) bg-(--surface-strong)/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-(--accent-strong)">Current Workspace</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Contribution module is live and the shell now accepts authenticated sign-in.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Sign in to reach the protected dashboard, contribution capture, and report routes. UI sessions now carry real role claims while the underlying APIs continue using the existing header-based authorization contract.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contributions"
                className="rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-strong)"
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
            <LoginForm
              redirectTo={redirectTo}
              bannerTone={authBanner?.tone}
              bannerMessage={authBanner?.message}
            />
            <StateSurface
              title="Auth status"
              message="Browser auth is backed by Auth.js credentials and JWT session persistence, and protected route handlers now resolve the authenticated session server-side."
            />
            <StateSurface
              tone="warning"
              title="Development seed accounts"
              message="Seeded users: admin@prismapp.local, manager@prismapp.local, readonly@prismapp.local. Password comes from AUTH_SEED_PASSWORD in .env, or defaults to ChangeMe123! if not set before seeding." 
            />
          </div>
        </section>
      </main>
    </div>
  );
}