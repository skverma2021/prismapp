"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { StateSurface } from "@/src/components/ui/state-surface";
import { useAuthSession } from "@/src/lib/auth-session";
import { invalidateContributionHeadLookups } from "@/src/lib/master-data-lookups";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { pushQueryState } from "@/src/lib/url-query-state";

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

const payUnitOptions = [
  { value: "1", label: "1 - Per Sq Ft" },
  { value: "2", label: "2 - Per Resident" },
  { value: "3", label: "3 - Lump Sum" },
];

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

function describePayUnit(payUnit: number) {
  if (payUnit === 1) {
    return "Per Sq Ft";
  }

  if (payUnit === 2) {
    return "Per Resident";
  }

  if (payUnit === 3) {
    return "Lump Sum";
  }

  return `Unit ${payUnit}`;
}

export default function ContributionHeadsPage() {
  const { session } = useAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canMutate = session.role !== "READ_ONLY";
  const currentYear = new Date().getUTCFullYear();

  const [items, setItems] = useState<ContributionHeadItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [query, setQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [payUnitFilter, setPayUnitFilter] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [appliedPeriodFilter, setAppliedPeriodFilter] = useState("");
  const [appliedPayUnitFilter, setAppliedPayUnitFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("description");
  const [appliedSortBy, setAppliedSortBy] = useState<SortOption>("description");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [appliedSortDir, setAppliedSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [createState, setCreateState] = useState({ description: "", payUnit: "1", period: "MONTH" });
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingState, setEditingState] = useState({ description: "", payUnit: "1", period: "MONTH" });
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    const nextPeriodFilter = searchParams.get("period") ?? "";
    const nextPayUnitFilter = searchParams.get("payUnit") ?? "";
    const nextSortBy =
      searchParams.get("sortBy") === "payUnit"
        ? "payUnit"
        : searchParams.get("sortBy") === "period"
          ? "period"
          : searchParams.get("sortBy") === "createdAt"
            ? "createdAt"
            : "description";
    const nextSortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

    setQuery(nextQuery);
    setAppliedQuery(nextQuery);
    setPeriodFilter(nextPeriodFilter);
    setAppliedPeriodFilter(nextPeriodFilter);
    setPayUnitFilter(nextPayUnitFilter);
    setAppliedPayUnitFilter(nextPayUnitFilter);
    setSortBy(nextSortBy);
    setAppliedSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setAppliedSortDir(nextSortDir);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    async function loadHeads() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
          sortBy: appliedSortBy,
          sortDir: appliedSortDir,
        });

        if (appliedQuery.trim()) {
          params.set("q", appliedQuery.trim());
        }

        if (appliedPeriodFilter) {
          params.set("period", appliedPeriodFilter);
        }

        if (appliedPayUnitFilter) {
          params.set("payUnit", appliedPayUnitFilter);
        }

        const data = await fetchJsonWithRetry<PaginatedResponse<ContributionHeadItem>>(
          `/api/contribution-heads?${params.toString()}`,
          "Unable to load contribution heads."
        );

        setItems(data.items);
        setTotalPages(Math.max(data.totalPages, 1));
        setTotalItems(data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load contribution heads.");
      } finally {
        setLoading(false);
      }
    }

    void loadHeads();
  }, [appliedPayUnitFilter, appliedPeriodFilter, appliedQuery, appliedSortBy, appliedSortDir, page]);

  async function createHead() {
    setCreateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/contribution-heads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          description: createState.description.trim(),
          payUnit: Number(createState.payUnit),
          period: createState.period,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<ContributionHeadItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to create contribution head."));
      }

      invalidateContributionHeadLookups();
      setCreateState({ description: "", payUnit: "1", period: "MONTH" });
      setSubmitSuccess(`Contribution head created: ${payload.data.description}`);
      setPage(1);
      setAppliedQuery("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create contribution head.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function updateHead(id: number) {
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/contribution-heads/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          description: editingState.description.trim(),
          payUnit: Number(editingState.payUnit),
          period: editingState.period,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<ContributionHeadItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update contribution head."));
      }

      invalidateContributionHeadLookups();
      setEditingId(null);
      setEditingState({ description: "", payUnit: "1", period: "MONTH" });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload.data } : item)));
      setSubmitSuccess(`Contribution head updated: ${payload.data.description}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update contribution head.");
    }
  }

  async function deleteHead(id: number) {
    setDeleteLoadingId(id);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/contribution-heads/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiEnvelope<null>;
        throw new Error(toErrorMessage(payload, "Unable to delete contribution head."));
      }

      invalidateContributionHeadLookups();
      const nextCount = items.length - 1;
      setSubmitSuccess("Contribution head deleted.");

      if (nextCount === 0 && page > 1) {
        setPage(page - 1);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setTotalItems((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to delete contribution head.");
    } finally {
      setDeleteLoadingId(null);
    }
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
          <div className="grid gap-2 sm:min-w-90">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search head description"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All periods</option>
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Yearly</option>
              </select>
              <select
                value={payUnitFilter}
                onChange={(event) => setPayUnitFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All pay units</option>
                {payUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="description">Sort by description</option>
                <option value="period">Sort by period</option>
                <option value="payUnit">Sort by pay unit</option>
                <option value="createdAt">Sort by created time</option>
              </select>
              <select
                value={sortDir}
                onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextQuery = query.trim();
                  setPage(1);
                  setAppliedQuery(nextQuery);
                  setAppliedPeriodFilter(periodFilter);
                  setAppliedPayUnitFilter(payUnitFilter);
                  setAppliedSortBy(sortBy);
                  setAppliedSortDir(sortDir);
                  pushQueryState(pathname, {
                    ...(nextQuery ? { q: nextQuery } : {}),
                    ...(periodFilter ? { period: periodFilter } : {}),
                    ...(payUnitFilter ? { payUnit: payUnitFilter } : {}),
                    sortBy,
                    sortDir,
                  });
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPeriodFilter("");
                  setPayUnitFilter("");
                  setAppliedQuery("");
                  setAppliedPeriodFilter("");
                  setAppliedPayUnitFilter("");
                  setSortBy("description");
                  setAppliedSortBy("description");
                  setSortDir("asc");
                  setAppliedSortDir("asc");
                  setPage(1);
                  pushQueryState(pathname, {});
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {submitError ? <InlineNotice className="mt-4" tone="danger" message={submitError} /> : null}
        {submitSuccess ? <InlineNotice className="mt-4" tone="success" message={submitSuccess} /> : null}
        {loadError ? <InlineNotice className="mt-4" tone="danger" message={loadError} /> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Contribution Head</p>
            <p className="mt-1 text-sm text-slate-600">Descriptions are unique and define the period type used during contribution posting.</p>
            <div className="mt-4 grid gap-3">
              <input
                value={createState.description}
                onChange={(event) => setCreateState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="e.g. Maintenance"
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <select
                value={createState.period}
                onChange={(event) => setCreateState((prev) => ({ ...prev, period: event.target.value }))}
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Yearly</option>
              </select>
              <select
                value={createState.payUnit}
                onChange={(event) => setCreateState((prev) => ({ ...prev, payUnit: event.target.value }))}
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {payUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!canMutate || createLoading || createState.description.trim().length === 0}
                onClick={() => {
                  void createHead();
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {createLoading ? "Creating..." : "Create Head"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />

            {loading ? (
              <StateSurface title="Loading heads" message="Fetching contribution heads with counts and filters." />
            ) : items.length === 0 ? (
              <StateSurface tone="warning" title="No heads found" message="Create a head or widen your filters to see matching records." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Description</th>
                      <th className="px-3 py-3 font-semibold">Period</th>
                      <th className="px-3 py-3 font-semibold">Pay Unit</th>
                      <th className="px-3 py-3 font-semibold">Usage</th>
                      <th className="px-3 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {items.map((item) => {
                      const isEditing = editingId === item.id;

                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-3 align-top">
                            {isEditing ? (
                              <input
                                value={editingState.description}
                                onChange={(event) => setEditingState((prev) => ({ ...prev, description: event.target.value }))}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                              />
                            ) : (
                              <div>
                                <p className="font-medium text-slate-900">{item.description}</p>
                                <p className="text-xs text-slate-500">Created {new Date(item.createdAt).toLocaleDateString()}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {isEditing ? (
                              <select
                                value={editingState.period}
                                onChange={(event) => setEditingState((prev) => ({ ...prev, period: event.target.value }))}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                              >
                                <option value="MONTH">Monthly</option>
                                <option value="YEAR">Yearly</option>
                              </select>
                            ) : item.period === "YEAR" ? (
                              "Yearly"
                            ) : (
                              "Monthly"
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {isEditing ? (
                              <select
                                value={editingState.payUnit}
                                onChange={(event) => setEditingState((prev) => ({ ...prev, payUnit: event.target.value }))}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                              >
                                {payUnitOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>{describePayUnit(item.payUnit)}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-600">
                            <div>Rates: {item._count?.rates ?? 0}</div>
                            <div>Posts: {item._count?.contributions ?? 0}</div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex flex-wrap gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void updateHead(item.id);
                                    }}
                                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditingState({ description: "", payUnit: "1", period: "MONTH" });
                                    }}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={!canMutate}
                                    onClick={() => {
                                      setEditingId(item.id);
                                      setEditingState({
                                        description: item.description,
                                        payUnit: String(item.payUnit),
                                        period: item.period,
                                      });
                                    }}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canMutate || deleteLoadingId === item.id}
                                    onClick={() => {
                                      void deleteHead(item.id);
                                    }}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                                  </button>
                                  <ContextLinkChips
                                    label="Go To"
                                    items={[
                                      {
                                        href: { pathname: "/contribution-rates", query: { contributionHeadId: String(item.id) } },
                                        label: "Rates",
                                      },
                                      {
                                        href: { pathname: "/contributions", query: { headId: String(item.id) } },
                                        label: "Contribution Capture",
                                      },
                                      {
                                        href: {
                                          pathname: "/reports/contributions/transactions",
                                          query: { refYear: String(currentYear), headId: String(item.id) },
                                        },
                                        label: "Transactions",
                                      },
                                      {
                                        href: {
                                          pathname: "/reports/contributions/paid-unpaid-matrix",
                                          query: { refYear: String(currentYear), headId: String(item.id) },
                                        },
                                        label: "Paid/Unpaid",
                                      },
                                    ]}
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}