import { StateSurface } from "@/src/components/ui/state-surface";

export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <StateSurface title="Loading reports" message="Preparing report filters, totals, and shell context..." />
    </div>
  );
}