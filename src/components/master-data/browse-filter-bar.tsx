import type { ReactNode } from "react";

import type { BrowseState } from "@/src/hooks/use-browse-state";

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

export const INPUT_CLASS = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
export const INPUT_DISABLED_CLASS = `${INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-slate-100`;
export const BTN_PRIMARY = "rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white";
export const BTN_SECONDARY = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700";
export const BTN_SUBMIT = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600";
export const BTN_EDIT = "rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_SAVE = "rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_CANCEL = "rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700";
export const BTN_DELETE = "rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50";

// ---------------------------------------------------------------------------
// BrowseFilterBar
// ---------------------------------------------------------------------------

type SortOptionDef = {
  value: string;
  label: string;
};

type BrowseFilterBarProps<S extends string> = {
  browse: BrowseState<unknown, S>;
  sortOptions: SortOptionDef[];
  /** Extra filter controls rendered before the sort selects */
  children?: ReactNode;
  /** Minimum width class for the filter container (default "sm:min-w-70") */
  minWidth?: string;
};

export function BrowseFilterBar<S extends string>({
  browse,
  sortOptions,
  children,
  minWidth = "sm:min-w-70",
}: BrowseFilterBarProps<S>) {
  return (
    <div className={`grid gap-2 ${minWidth}`}>
      {children}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={browse.sortBy}
          onChange={(e) => browse.setSortBy(e.target.value as S)}
          className={INPUT_CLASS}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={browse.sortDir}
          onChange={(e) => browse.setSortDir(e.target.value as "asc" | "desc")}
          className={INPUT_CLASS}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={browse.applyFilters} className={BTN_PRIMARY}>
          Apply Filters
        </button>
        <button type="button" onClick={browse.resetFilters} className={BTN_SECONDARY}>
          Reset Filters
        </button>
      </div>
    </div>
  );
}
