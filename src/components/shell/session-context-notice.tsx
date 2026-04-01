"use client";

import type { UserRole } from "@/src/lib/authz";
import { useMockSession } from "@/src/lib/mock-session";
import { InlineNotice } from "@/src/components/ui/inline-notice";

type SessionContextNoticeProps = {
  allowedRoles?: UserRole[];
  className?: string;
  mode: "mutation" | "report";
};

export function SessionContextNotice({ allowedRoles, className, mode }: SessionContextNoticeProps) {
  const { session } = useMockSession();
  const isAllowed = !allowedRoles || allowedRoles.includes(session.role);

  if (!isAllowed) {
    const allowedLabel = allowedRoles?.join(" / ") ?? "authorized roles";

    return (
      <InlineNotice
        className={className}
        tone="warning"
        title="Current shell role is limited"
        message={`This screen is using ${session.userId} (${session.role}) from the dashboard shell. ${mode === "mutation" ? "Posting actions" : "Requests"} on this screen are intended for ${allowedLabel}. Change role from the shell to continue.`}
      />
    );
  }

  return (
    <InlineNotice
      className={className}
      title="Using dashboard session"
      message={`${mode === "mutation" ? "Posting actions" : "Report requests"} on this screen use ${session.userId} (${session.role}) from the dashboard shell. Change role from the shell if you need to verify another access path.`}
    />
  );
}