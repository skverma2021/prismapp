import { StateSurface } from "@/src/components/ui/state-surface";

export default function ContributionsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <StateSurface title="Loading contribution capture" message="Preparing the contribution workspace..." />
    </div>
  );
}