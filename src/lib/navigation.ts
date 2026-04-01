import type { UserRole } from "@/src/lib/authz";

export type AppNavItem = {
  description: string;
  href: string;
  label: string;
  roles: UserRole[];
};

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export const dashboardNavItems: AppNavItem[] = [
  {
    href: "/home",
    label: "Home",
    description: "Role-aware starting point for operators and auditors.",
    roles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
  },
  {
    href: "/contributions",
    label: "Contribution Capture",
    description: "Record contributions and compensating corrections.",
    roles: ["SOCIETY_ADMIN", "MANAGER"],
  },
  {
    href: "/reports/contributions/transactions",
    label: "Transactions Report",
    description: "Filter, sort, and export contribution transactions.",
    roles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
  },
  {
    href: "/reports/contributions/paid-unpaid-matrix",
    label: "Paid/Unpaid Matrix",
    description: "Review unit-level payment coverage for a head and year.",
    roles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
  },
];

const routeMeta = [
  {
    href: "/home",
    title: "Platform Home",
    description: "Role-aware launch surface for the current Week-3 shell.",
  },
  {
    href: "/contributions",
    title: "Contribution Capture",
    description: "Post contributions and corrections with current domain constraints.",
  },
  {
    href: "/reports/contributions/transactions",
    title: "Transactions Report",
    description: "Inspect and export contribution transactions with filter round-trip.",
  },
  {
    href: "/reports/contributions/paid-unpaid-matrix",
    title: "Paid/Unpaid Matrix",
    description: "Review expected and collected contribution coverage across units.",
  },
];

export function getVisibleNavItems(role: UserRole) {
  return dashboardNavItems.filter((item) => item.roles.includes(role));
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getRouteMeta(pathname: string) {
  const match = [...routeMeta].reverse().find((item) => isNavItemActive(pathname, item.href));

  return (
    match ?? {
      title: "Workspace",
      description: "Operational shell for PrismApp modules.",
    }
  );
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/home") {
    return [{ label: "Home" }];
  }

  if (pathname.startsWith("/reports/contributions/transactions")) {
    return [
      { label: "Home", href: "/home" },
      { label: "Reports" },
      { label: "Transactions" },
    ];
  }

  if (pathname.startsWith("/reports/contributions/paid-unpaid-matrix")) {
    return [
      { label: "Home", href: "/home" },
      { label: "Reports" },
      { label: "Paid/Unpaid Matrix" },
    ];
  }

  if (pathname.startsWith("/contributions")) {
    return [{ label: "Home", href: "/home" }, { label: "Contribution Capture" }];
  }

  return [{ label: "Home", href: "/home" }, { label: "Workspace" }];
}