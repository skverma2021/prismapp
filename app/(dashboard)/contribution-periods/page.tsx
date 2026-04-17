"use client";

import { BrowseFilterBar, INPUT_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";

type ContributionPeriodItem = {
  id: string;
  refYear: number;
  refMonth: number;
  createdAt: string;
};

type SortOption = "id" | "refYear" | "refMonth" | "createdAt";

const SORT_OPTIONS = [
  { value: "refYear" as const, label: "Sort by year" },
  { value: "refMonth" as const, label: "Sort by month code" },
  { value: "createdAt" as const, label: "Sort by created time" },
  { value: "id" as const, label: "Sort by id" },
];

const monthLabels = [
  "Year", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPeriodLabel(item: ContributionPeriodItem) {
  return item.refMonth === 0 ? `Year ${item.refYear}` : `${monthLabels[item.refMonth]} ${item.refYear}`;
}

export default function ContributionPeriodsPage() {
  const browse = useBrowseState<ContributionPeriodItem, SortOption>({
    endpoint: "/api/contribution-periods",
    errorMessage: "Unable to load contribution periods.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "refYear",
    defaultSortDir: "desc",
    filters: [{ key: "refYear" }, { key: "refMonth" }],
  });

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
          <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS} minWidth="sm:min-w-[320px]">
            <input
              type="number"
              min={2000}
              value={browse.filters["refYear"] ?? ""}
              onChange={(e) => browse.setFilter("refYear", e.target.value)}
              placeholder="Filter by year"
              className={INPUT_CLASS}
            />
            <select
              value={browse.filters["refMonth"] ?? ""}
              onChange={(e) => browse.setFilter("refMonth", e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">All months</option>
              {monthLabels.map((label, index) => (
                <option key={label} value={String(index)}>{label}</option>
              ))}
            </select>
          </BrowseFilterBar>
        </div>

        <NoticeStack loadError={browse.loadError} />

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Periods are reference-only in V1. Operators can review them here, but creation and mutation stay outside the runtime workflow.
        </div>

        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

          <DataTable<ContributionPeriodItem>
            columns={[
              { header: "Period", render: (item) => <span className="font-medium text-slate-900">{formatPeriodLabel(item)}</span> },
              { header: "Year", render: (item) => item.refYear },
              { header: "Month Code", render: (item) => item.refMonth },
              { header: "Created", render: (item) => new Date(item.createdAt).toLocaleDateString() },
              {
                header: "Actions",
                render: (item) => (
                  <ContextLinkChips
                    label="Go To"
                    items={[
                      {
                        href: {
                          pathname: "/reports/contributions/transactions",
                          query: {
                            refYear: String(item.refYear),
                            ...(item.refMonth > 0 ? { refMonth: String(item.refMonth) } : {}),
                          },
                        },
                        label: "Transactions",
                      },
                    ]}
                  />
                ),
              },
            ]}
            items={browse.items}
            loading={browse.loading}
            loadingMessage="Loading contribution periods..."
            emptyMessage="No periods found. Adjust the year or month filters and try again."
            rowKey={(item) => item.id}
          />
        </div>
      </section>
    </div>
  );
}