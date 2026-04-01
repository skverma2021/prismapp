import Link from "next/link";

import type { BreadcrumbItem } from "@/src/lib/navigation";

type PageHeaderProps = {
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ breadcrumbs = [], eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-strong)]/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
          {breadcrumbs.map((breadcrumb, index) => (
            <span key={`${breadcrumb.label}-${index}`} className="flex items-center gap-2">
              {breadcrumb.href ? (
                <Link href={breadcrumb.href} className="transition hover:text-slate-900">
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="text-slate-700">{breadcrumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <span>/</span>}
            </span>
          ))}
        </nav>
      )}

      {eyebrow && <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">{eyebrow}</p>}
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
    </header>
  );
}