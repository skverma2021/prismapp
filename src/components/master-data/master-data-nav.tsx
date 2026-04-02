"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/blocks",
    label: "Blocks",
  },
  {
    href: "/units",
    label: "Units",
  },
  {
    href: "/individuals",
    label: "Individuals",
  },
  {
    href: "/ownerships",
    label: "Ownerships",
  },
  {
    href: "/residencies",
    label: "Residencies",
  },
  {
    href: "/contribution-periods",
    label: "Periods",
  },
  {
    href: "/contribution-heads",
    label: "Heads",
  },
  {
    href: "/contribution-rates",
    label: "Rates",
  },
];

export function MasterDataNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
              active
                ? "border-transparent bg-(--accent) text-white"
                : "border-(--border) bg-white text-slate-700 hover:border-teal-300 hover:bg-(--accent-soft)/50",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}