"use client";

import { useEffect, useState } from "react";

import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { StateSurface } from "@/src/components/ui/state-surface";
import { useAuthSession } from "@/src/lib/auth-session";
import { fetchAllPages } from "@/src/lib/paginated-client";

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

type ContributionHeadOption = {
  id: number;
  description: string;
  payUnit: number;
  period: "MONTH" | "YEAR";
};

type ContributionRateItem = {
  id: number;
  contributionHeadId: number;
  reference: string | null;
  fromDt: string;
  toDt: string | null;
  amt: string | number;
  createdAt: string;
  contributionHead?: ContributionHeadOption;
};

type RateEditState = {
  reference: string;
  toDt: string;
};

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

function formatAmount(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : String(value);
}

function isCurrentRate(rate: ContributionRateItem) {
  const now = new Date();
  const fromDt = new Date(rate.fromDt);
  const toDt = rate.toDt ? new Date(rate.toDt) : null;

  return fromDt.getTime() <= now.getTime() && (!toDt || toDt.getTime() >= now.getTime());
}

function isScheduledRate(rate: ContributionRateItem) {
  return new Date(rate.fromDt).getTime() > new Date().getTime();
}

export default function ContributionRatesPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  const [items, setItems] = useState<ContributionRateItem[]>([]);
  const [heads, setHeads] = useState<ContributionHeadOption[]>([]);
  const [headsLoading, setHeadsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [headFilter, setHeadFilter] = useState("");
  const [activeOnFilter, setActiveOnFilter] = useState("");
  const [appliedHeadFilter, setAppliedHeadFilter] = useState("");
  const [appliedActiveOnFilter, setAppliedActiveOnFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingState, setEditingState] = useState<RateEditState>({ reference: "", toDt: "" });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [createState, setCreateState] = useState({
    contributionHeadId: "",
    reference: "",
    fromDt: "",
    toDt: "",
    amt: "",
  });

  useEffect(() => {
    async function loadHeads() {
      setHeadsLoading(true);

      try {
        const loadedHeads = await fetchAllPages<ContributionHeadOption>(
          (currentPage) =>
            `/api/contribution-heads?page=${currentPage}&pageSize=100&sortBy=description&sortDir=asc`,
          "Unable to load contribution heads."
        );

        setHeads(loadedHeads);
      } catch (error) {
        setHeads([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load contribution heads.");
      } finally {
        setHeadsLoading(false);
      }
    }

    void loadHeads();
  }, []);

  useEffect(() => {
    async function loadRates() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
          sortBy: "fromDt",
          sortDir: "desc",
        });

        if (appliedHeadFilter) {
          params.set("contributionHeadId", appliedHeadFilter);
        }

        if (appliedActiveOnFilter) {
          params.set("activeOn", appliedActiveOnFilter);
        }

        const response = await fetch(`/api/contribution-rates?${params.toString()}`);
        const payload = (await response.json()) as ApiEnvelope<PaginatedResponse<ContributionRateItem>>;

        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, "Unable to load contribution rates."));
        }

        setItems(payload.data.items);
        setTotalPages(Math.max(payload.data.totalPages, 1));
        setTotalItems(payload.data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load contribution rates.");
      } finally {
        setLoading(false);
      }
    }

    void loadRates();
  }, [appliedActiveOnFilter, appliedHeadFilter, page]);

  async function createRate() {
    setCreateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/contribution-rates", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contributionHeadId: Number(createState.contributionHeadId),
          reference: createState.reference.trim() || undefined,
          fromDt: createState.fromDt,
          toDt: createState.toDt.trim() ? createState.toDt : null,
          amt: Number(createState.amt),
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<ContributionRateItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to create contribution rate."));
      }

      setCreateState({ contributionHeadId: "", reference: "", fromDt: "", toDt: "", amt: "" });
      setSubmitSuccess(`Contribution rate added for ${payload.data.contributionHead?.description ?? `head ${payload.data.contributionHeadId}`}.`);
      setPage(1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create contribution rate.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function updateRate(id: number) {
    setUpdateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/contribution-rates/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reference: editingState.reference,
          toDt: editingState.toDt.trim() ? editingState.toDt : null,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<ContributionRateItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update contribution rate."));
      }

      setItems((prev) => prev.map((item) => (item.id === id ? payload.data : item)));
      setEditingId(null);
      setEditingState({ reference: "", toDt: "" });
      setSubmitSuccess(`Contribution rate updated for ${payload.data.contributionHead?.description ?? `head ${payload.data.contributionHeadId}`}.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update contribution rate.");
    } finally {
      setUpdateLoading(false);
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Contribution Rates</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Rates remain historical records. Close an active window by setting its end date, then add the successor rate as a new row.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-90">
            <select
              value={headFilter}
              onChange={(event) => setHeadFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={headsLoading}
            >
              <option value="">All heads</option>
              {heads.map((head) => (
                <option key={head.id} value={String(head.id)}>
                  {head.description}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={activeOnFilter}
              onChange={(event) => setActiveOnFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setAppliedHeadFilter(headFilter);
                  setAppliedActiveOnFilter(activeOnFilter);
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeadFilter("");
                  setActiveOnFilter("");
                  setAppliedHeadFilter("");
                  setAppliedActiveOnFilter("");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {submitError ? <InlineNotice className="mt-4" tone="danger" message={submitError} /> : null}
        {submitSuccess ? <InlineNotice className="mt-4" tone="success" message={submitSuccess} /> : null}
        {loadError ? <InlineNotice className="mt-4" tone="danger" message={loadError} /> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Add Rate Window</p>
            <p className="mt-1 text-sm text-slate-600">Rate windows may not overlap for the same head. Leave end date empty to create the active open-ended rate.</p>
            <div className="mt-4 grid gap-3">
              <select
                value={createState.contributionHeadId}
                onChange={(event) => setCreateState((prev) => ({ ...prev, contributionHeadId: event.target.value }))}
                disabled={!canMutate || headsLoading || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select contribution head</option>
                {heads.map((head) => (
                  <option key={head.id} value={String(head.id)}>
                    {head.description} ({head.period === "YEAR" ? "Yearly" : "Monthly"})
                  </option>
                ))}
              </select>
              <input
                value={createState.reference}
                onChange={(event) => setCreateState((prev) => ({ ...prev, reference: event.target.value }))}
                placeholder="Reference or approval note"
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <input
                type="date"
                value={createState.fromDt}
                onChange={(event) => setCreateState((prev) => ({ ...prev, fromDt: event.target.value }))}
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <input
                type="date"
                value={createState.toDt}
                onChange={(event) => setCreateState((prev) => ({ ...prev, toDt: event.target.value }))}
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={createState.amt}
                onChange={(event) => setCreateState((prev) => ({ ...prev, amt: event.target.value }))}
                placeholder="Amount"
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="button"
                disabled={
                  !canMutate ||
                  createLoading ||
                  createState.contributionHeadId.length === 0 ||
                  createState.fromDt.length === 0 ||
                  Number(createState.amt) <= 0
                }
                onClick={() => {
                  void createRate();
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {createLoading ? "Creating..." : "Add Rate"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />

            {loading ? (
              <StateSurface title="Loading rates" message="Fetching immutable rate history with the selected filters." />
            ) : items.length === 0 ? (
              <StateSurface tone="warning" title="No rates found" message="Add a rate window or widen your filters to see existing history." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Head</th>
                      <th className="px-3 py-3 font-semibold">Amount</th>
                      <th className="px-3 py-3 font-semibold">Effective Window</th>
                      <th className="px-3 py-3 font-semibold">Reference</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 align-top">
                          <div>
                            <p className="font-medium text-slate-900">{item.contributionHead?.description ?? `Head ${item.contributionHeadId}`}</p>
                            <p className="text-xs text-slate-500">{item.contributionHead?.period === "YEAR" ? "Yearly" : "Monthly"}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top font-medium text-slate-900">{formatAmount(item.amt)}</td>
                        <td className="px-3 py-3 align-top text-slate-600">
                          <div>From {new Date(item.fromDt).toLocaleDateString()}</div>
                          {editingId === item.id ? (
                            <label className="mt-2 grid gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                              <span>Retire On (toDt)</span>
                              <input
                                type="date"
                                value={editingState.toDt}
                                onChange={(event) => setEditingState((prev) => ({ ...prev, toDt: event.target.value }))}
                                disabled={updateLoading}
                                className="w-full min-w-36 rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal normal-case tracking-normal text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                            </label>
                          ) : (
                            <div>{item.toDt ? `To ${new Date(item.toDt).toLocaleDateString()}` : "Open-ended"}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top text-slate-600">
                          {editingId === item.id ? (
                            <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                              <span>Reference</span>
                              <input
                                value={editingState.reference}
                                onChange={(event) => setEditingState((prev) => ({ ...prev, reference: event.target.value }))}
                                disabled={updateLoading}
                                className="w-full min-w-44 rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal normal-case tracking-normal text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                                placeholder="Reference or approval note"
                              />
                            </label>
                          ) : (
                            item.reference || "-"
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                              isCurrentRate(item)
                                ? "bg-emerald-100 text-emerald-700"
                                : isScheduledRate(item)
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-700",
                            ].join(" ")}
                          >
                            {isCurrentRate(item) ? "Current" : isScheduledRate(item) ? "Scheduled" : "Historical"}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          {editingId === item.id ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void updateRate(item.id);
                                }}
                                disabled={updateLoading}
                                className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updateLoading ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingState({ reference: "", toDt: "" });
                                }}
                                disabled={updateLoading}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : isCurrentRate(item) ? (
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => {
                                setEditingId(item.id);
                                setEditingState({
                                  reference: item.reference ?? "",
                                  toDt: item.toDt ? new Date(item.toDt).toISOString().slice(0, 10) : "",
                                });
                              }}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Locked</span>
                          )}
                        </td>
                      </tr>
                    ))}
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