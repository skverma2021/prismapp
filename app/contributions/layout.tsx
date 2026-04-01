import { DashboardShell } from "@/src/components/shell/dashboard-shell";

export default function ContributionsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}