"use client";

import type { UserRole } from "@/src/lib/user-role";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";

type SessionContextNoticeProps = {
  allowedRoles?: UserRole[];
  className?: string;
  mode: "mutation" | "report";
};

export function SessionContextNotice({ allowedRoles, className, mode }: SessionContextNoticeProps) {
  const { session, sessionMode } = useAuthSession();
  const isAllowed = !allowedRoles || allowedRoles.includes(session.role);

  if (!isAllowed) {
    const allowedLabel = allowedRoles?.join(" / ") ?? "authorized roles";

    return (
      <InlineNotice
        className={className}
        tone="warning"
        title="Current shell role is limited"
        message={`This screen is using ${session.userId} (${session.role}) from the ${sessionMode} session adapter. ${mode === "mutation" ? "Posting actions" : "Requests"} on this screen are intended for ${allowedLabel}. Sign in with an allowed role to continue.`}
      />
    );
  }

  return (
    <InlineNotice
      className={className}
      title="Using dashboard session"
      message={`${mode === "mutation" ? "Posting actions" : "Report requests"} on this screen use ${session.userId} (${session.role}) from the ${sessionMode} session adapter.`}
    />
  );
}