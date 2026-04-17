"use client";

import { useState } from "react";

import { BrowseFilterBar, BTN_DELETE, BTN_EDIT, BTN_SAVE, BTN_CANCEL, BTN_SUBMIT, INPUT_CLASS, INPUT_DISABLED_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { invalidateContributionHeadLookups } from "@/src/lib/master-data-lookups";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";

type ContributionHeadItem = {
  id: number;
  description: string;
  payUnit: number;
  period: "MONTH" | "YEAR";
  createdAt: string;
  _count?: {
    rates: number;
    contributions: number;
  };
};

type SortOption = "description" | "payUnit" | "period" | "createdAt";

const SORT_OPTIONS = [
  { value: "description" as const, label: "Sort by description" },
  { value: "period" as const, label: "Sort by period" },
  { value: "payUnit" as const, label: "Sort by pay unit" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

const payUnitOptions = [
  { value: "1", label: "1 - Per Sq Ft" },
  { value: "2", label: "2 - Per Resident" },
  { value: "3", label: "3 - Lump Sum" },
];

function describePayUnit(payUnit: number) {
  if (payUnit === 1) return "Per Sq Ft";
  if (payUnit === 2) return "Per Resident";
  if (payUnit === 3) return "Lump Sum";
  return `Unit ${payUnit}`;
}

export default function ContributionHeadsPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";
  const currentYear = new Date().getUTCFullYear();

  const browse = useBrowseState<ContributionHeadItem, SortOption>({
    endpoint: "/api/contribution-heads",
    errorMessage: "Unable to load contribution heads.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "description",
    defaultSortDir: "asc",
    filters: [{ key: "q" }, { key: "period" }, { key: "payUnit" }],
  });

  const crud = useCrudActions({
    setSubmitError: browse.setSubmitError,
    setSubmitSuccess: browse.setSubmitSuccess,
  });

  const [createState, setCreateState] = useState({ description: "", payUnit: "1", period: "MONTH" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingState, setEditingState] = useState({ description: "", payUnit: "1", period: "MONTH" });

  function handleCreate() {
    void crud.create<ContributionHeadItem>({
      endpoint: "/api/contribution-heads",
      body: {
        description: createState.description.trim(),
        payUnit: Number(createState.payUnit),
        period: createState.period,
      },
      errorMessage: "Unable to create contribution head.",
      onSuccess: (data) => {
        invalidateContributionHeadLookups();
        setCreateState({ description: "", payUnit: "1", period: "MONTH" });
        browse.setSubmitSuccess(`Contribution head created: ${data.description}`);
        browse.setPage(1);
        browse.setQuery("");
      },
    });
  }

  function handleUpdate(id: number) {
    void crud.update<ContributionHeadItem>({
      endpoint: `/api/contribution-heads/${id}`,
      body: {
        description: editingState.description.trim(),
        payUnit: Number(editingState.payUnit),
        period: editingState.period,
      },
      errorMessage: "Unable to update contribution head.",
      onSuccess: (data) => {
        invalidateContributionHeadLookups();
        setEditingId(null);
        setEditingState({ description: "", payUnit: "1", period: "MONTH" });
        browse.setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
        browse.setSubmitSuccess(`Contribution head updated: ${data.description}`);
      },
    });
  }

  function handleDelete(id: number) {
    void crud.remove({
      id,
      endpoint: `/api/contribution-heads/${id}`,
      errorMessage: "Unable to delete contribution head.",
      onSuccess: () => {
        invalidateContributionHeadLookups();
        browse.setSubmitSuccess("Contribution head deleted.");
        const nextCount = browse.items.length - 1;
        if (nextCount === 0 && browse.page > 1) {
          browse.setPage(browse.page - 1);
        } else {
          browse.setItems((prev) => prev.filter((item) => item.id !== id));
          browse.setTotalItems((prev) => Math.max(prev - 1, 0));
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice className="mt-4" mode="mutation" allowedRoles={["SOCIETY_ADMIN", "MANAGER"]} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">Contribution Master Data</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Contribution Heads</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage the charge heads that drive posting. Pay unit 1 derives quantity from unit area, pay unit 2 uses resident count, and pay unit 3 behaves as a flat amount.
            </p>
          </div>
          <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS} minWidth="sm:min-w-90">
            <input
              value={browse.query}
              onChange={(e) => browse.setQuery(e.target.value)}
              placeholder="Search head description"
              className={INPUT_CLASS}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={browse.filters["period"] ?? ""} onChange={(e) => browse.setFilter("period", e.target.value)} className={INPUT_CLASS}>
                <option value="">All periods</option>
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Yearly</option>
              </select>
              <select value={browse.filters["payUnit"] ?? ""} onChange={(e) => browse.setFilter("payUnit", e.target.value)} className={INPUT_CLASS}>
                <option value="">All pay units</option>
                {payUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </BrowseFilterBar>
        </div>

        <NoticeStack submitError={browse.submitError} submitSuccess={browse.submitSuccess} loadError={browse.loadError} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Contribution Head</p>
            <p className="mt-1 text-sm text-slate-600">Descriptions are unique and define the period type used during contribution posting.</p>
            <div className="mt-4 grid gap-3">
              <input
                value={createState.description}
                onChange={(e) => setCreateState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Maintenance"
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              />
              <select
                value={createState.period}
                onChange={(e) => setCreateState((prev) => ({ ...prev, period: e.target.value }))}
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Yearly</option>
              </select>
              <select
                value={createState.payUnit}
                onChange={(e) => setCreateState((prev) => ({ ...prev, payUnit: e.target.value }))}
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              >
                {payUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!canMutate || crud.createLoading || createState.description.trim().length === 0}
                onClick={handleCreate}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Creating..." : "Create Head"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<ContributionHeadItem>
              columns={[
                {
                  header: "Description",
                  render: (item) => {
                    const isEditing = editingId === item.id;
                    return isEditing ? (
                      <input
                        value={editingState.description}
                        onChange={(e) => setEditingState((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    ) : (
                      <div>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="text-xs text-slate-500">Created {new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                    );
                  },
                },
                {
                  header: "Period",
                  render: (item) =>
                    editingId === item.id ? (
                      <select value={editingState.period} onChange={(e) => setEditingState((prev) => ({ ...prev, period: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="MONTH">Monthly</option>
                        <option value="YEAR">Yearly</option>
                      </select>
                    ) : item.period === "YEAR" ? "Yearly" : "Monthly",
                },
                {
                  header: "Pay Unit",
                  render: (item) =>
                    editingId === item.id ? (
                      <select value={editingState.payUnit} onChange={(e) => setEditingState((prev) => ({ ...prev, payUnit: e.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        {payUnitOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      describePayUnit(item.payUnit)
                    ),
                },
                {
                  header: "Usage",
                  render: (item) => (
                    <div className="text-xs text-slate-600">
                      <div>Rates: {item._count?.rates ?? 0}</div>
                      <div>Posts: {item._count?.contributions ?? 0}</div>
                    </div>
                  ),
                },
                {
                  header: "Actions",
                  render: (item) => (
                    <div className="flex flex-wrap gap-2">
                      {editingId === item.id ? (
                        <>
                          <button type="button" onClick={() => handleUpdate(item.id)} className={BTN_SAVE}>Save</button>
                          <button type="button" onClick={() => { setEditingId(null); setEditingState({ description: "", payUnit: "1", period: "MONTH" }); }} className={BTN_CANCEL}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={!canMutate}
                            onClick={() => { setEditingId(item.id); setEditingState({ description: item.description, payUnit: String(item.payUnit), period: item.period }); }}
                            className={BTN_EDIT}
                          >
                            Edit
                          </button>
                          <button type="button" disabled={!canMutate || crud.deleteLoadingId === item.id} onClick={() => handleDelete(item.id)} className={BTN_DELETE}>
                            {crud.deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                          </button>
                          <ContextLinkChips
                            label="Go To"
                            items={[
                              { href: { pathname: "/contribution-rates", query: { contributionHeadId: String(item.id) } }, label: "Rates" },
                              { href: { pathname: "/contributions", query: { headId: String(item.id) } }, label: "Contribution Capture" },
                              { href: { pathname: "/reports/contributions/transactions", query: { refYear: String(currentYear), headId: String(item.id) } }, label: "Transactions" },
                              { href: { pathname: "/reports/contributions/paid-unpaid-matrix", query: { refYear: String(currentYear), headId: String(item.id) } }, label: "Paid/Unpaid" },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
              loadingMessage="Loading contribution heads..."
              emptyMessage="No heads found. Create a head or widen your filters to see matching records."
              rowKey={(item) => item.id}
            />
          </div>
        </div>
      </section>
    </div>
  );
}