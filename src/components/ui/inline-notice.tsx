type InlineNoticeProps = {
  message: string;
  title?: string;
  tone?: "danger" | "info" | "success" | "warning";
  className?: string;
  action?: React.ReactNode;
};

const toneClasses: Record<NonNullable<InlineNoticeProps["tone"]>, string> = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export function InlineNotice({
  message,
  title,
  tone = "info",
  className = "",
  action,
}: InlineNoticeProps) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${toneClasses[tone]} ${className}`.trim()}>
      {title && <p className="font-semibold">{title}</p>}
      <p className={title ? "mt-1" : undefined}>{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}