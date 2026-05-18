import { requireServerAppSession } from "@/src/lib/server-auth";

export default async function AuditLogLayout({ children }: { children: React.ReactNode }) {
  await requireServerAppSession({
    allowedRoles: ["SOCIETY_ADMIN"],
    redirectTo: "Audit Log",
  });

  return <>{children}</>;
}
