import { StateSurface } from "@/src/components/ui/state-surface";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <StateSurface title="Loading dashboard" message="Preparing the Week-3 shell and active route context..." />
      </div>
    </div>
  );
}