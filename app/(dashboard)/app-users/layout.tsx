import { requireServerAppSession } from "@/src/lib/server-auth";

export default async function AppUsersLayout({ children }: { children: React.ReactNode }) {
  await requireServerAppSession({
    allowedRoles: ["SOCIETY_ADMIN"],
    redirectTo: "App Users",
  });

  return <>{children}</>;
}
