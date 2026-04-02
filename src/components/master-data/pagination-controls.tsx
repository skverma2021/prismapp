type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ page, totalPages, totalItems, onPageChange }: PaginationControlsProps) {
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
      <p>
        Page {totalPages === 0 ? 0 : page} of {totalPages} · {totalItems} total items
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => onPageChange(page - 1)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}