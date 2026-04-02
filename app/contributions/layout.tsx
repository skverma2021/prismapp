import { DashboardShell } from "@/src/components/shell/dashboard-shell";
import { requireServerAppSession } from "@/src/lib/server-auth";

export default async function ContributionsLayout({ children }: { children: React.ReactNode }) {
  await requireServerAppSession({
    allowedRoles: ["SOCIETY_ADMIN", "MANAGER"],
    redirectTo: "/contributions",
  });

  return <DashboardShell>{children}</DashboardShell>;
}