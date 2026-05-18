import { requireServerAppSession } from "@/src/lib/server-auth";

export default async function PendingCorrectionsLayout({ children }: { children: React.ReactNode }) {
  await requireServerAppSession({
    allowedRoles: ["SOCIETY_ADMIN"],
    redirectTo: "Pending Corrections",
  });

  return <>{children}</>;
}
