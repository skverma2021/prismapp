"use client";

import Link, { type LinkProps } from "next/link";

type ContextLinkItem = {
  href: LinkProps["href"];
  label: string;
};

type ContextLinkChipsProps = {
  items: ContextLinkItem[];
  label?: string;
};

export function ContextLinkChips({ items, label = "Related" }: ContextLinkChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={`${typeof item.href === "string" ? item.href : item.label}-${item.label}`}
            href={item.href}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
