import { DashboardShell } from "@/src/components/shell/dashboard-shell";
import { requireServerAppSession } from "@/src/lib/server-auth";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireServerAppSession({
    allowedRoles: ["SOCIETY_ADMIN", "MANAGER", "READ_ONLY"],
    redirectTo: "/reports/contributions/transactions",
  });

  return <DashboardShell>{children}</DashboardShell>;
}