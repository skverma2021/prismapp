type StateSurfaceProps = {
  title: string;
  message: string;
  tone?: "danger" | "info" | "success" | "warning";
};

const toneClasses: Record<NonNullable<StateSurfaceProps["tone"]>, string> = {
  info: "border-slate-200 bg-white text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

export function StateSurface({ title, message, tone = "info" }: StateSurfaceProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6">{message}</p>
    </div>
  );
}