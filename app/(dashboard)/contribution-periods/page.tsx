"use client";

import { useEffect, useState } from "react";

import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { StateSurface } from "@/src/components/ui/state-surface";

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        message?: string;
      };
    };

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type ContributionPeriodItem = {
  id: string;
  refYear: number;
  refMonth: number;
  createdAt: string;
};

const monthLabels = [
  "Year",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

function formatPeriodLabel(item: ContributionPeriodItem) {
  return item.refMonth === 0 ? `Year ${item.refYear}` : `${monthLabels[item.refMonth]} ${item.refYear}`;
}

export default function ContributionPeriodsPage() {
  const [items, setItems] = useState<ContributionPeriodItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [appliedYearFilter, setAppliedYearFilter] = useState("");
  const [appliedMonthFilter, setAppliedMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadPeriods() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
          sortBy: "refYear",
          sortDir: "desc",
        });

        if (appliedYearFilter.trim()) {
          params.set("refYear", appliedYearFilter.trim());
        }

        if (appliedMonthFilter.trim()) {
          params.set("refMonth", appliedMonthFilter.trim());
        }

        const response = await fetch(`/api/contribution-periods?${params.toString()}`);
        const payload = (await response.json()) as ApiEnvelope<PaginatedResponse<ContributionPeriodItem>>;

        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, "Unable to load contribution periods."));
        }

        setItems(payload.data.items);
        setTotalPages(Math.max(payload.data.totalPages, 1));
        setTotalItems(payload.data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load contribution periods.");
      } finally {
        setLoading(false);
      }
    }

    void loadPeriods();
  }, [appliedMonthFilter, appliedYearFilter, page]);

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice className="mt-4" mode="report" />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">Contribution Master Data</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Contribution Periods</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              This reference table is seeded data used by contribution details. Yearly heads must post against month 0, and payments are constrained to periods within the current year.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-[320px]">
            <input
              type="number"
              min={2000}
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              placeholder="Filter by year"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All months</option>
              {monthLabels.map((label, index) => (
                <option key={label} value={String(index)}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setAppliedYearFilter(yearFilter);
                  setAppliedMonthFilter(monthFilter);
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setYearFilter("");
                  setMonthFilter("");
                  setAppliedYearFilter("");
                  setAppliedMonthFilter("");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {loadError ? <InlineNotice className="mt-4" tone="danger" message={loadError} /> : null}

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Periods are reference-only in V1. Operators can review them here, but creation and mutation stay outside the runtime workflow.
        </div>

        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />

          {loading ? (
            <StateSurface title="Loading periods" message="Fetching seeded contribution periods for the selected filters." />
          ) : items.length === 0 ? (
            <StateSurface tone="warning" title="No periods found" message="Adjust the year or month filters and try again." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Period</th>
                    <th className="px-3 py-3 font-semibold">Year</th>
                    <th className="px-3 py-3 font-semibold">Month Code</th>
                    <th className="px-3 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-medium text-slate-900">{formatPeriodLabel(item)}</td>
                      <td className="px-3 py-3">{item.refYear}</td>
                      <td className="px-3 py-3">{item.refMonth}</td>
                      <td className="px-3 py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}