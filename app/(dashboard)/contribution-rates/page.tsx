"use client";

import { useEffect, useMemo, useState } from "react";

import { BrowseFilterBar, INPUT_CLASS, INPUT_DISABLED_CLASS, BTN_SUBMIT } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { loadContributionHeadLookupsCached } from "@/src/lib/master-data-lookups";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";
import { toErrorMessage } from "@/src/types/api";
import type { ApiEnvelope } from "@/src/types/api";
import type { BrowseState } from "@/src/hooks/use-browse-state";

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

type SortOption = "fromDt" | "toDt" | "amt" | "createdAt";

const SORT_OPTIONS = [
  { value: "fromDt" as const, label: "Sort by start date" },
  { value: "toDt" as const, label: "Sort by end date" },
  { value: "amt" as const, label: "Sort by amount" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

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

function getLatestCurrentRateIds(rates: ContributionRateItem[]) {
  const latestByHead = new Map<number, number>();
  for (const rate of rates) {
    if (!isCurrentRate(rate)) continue;
    const previousId = latestByHead.get(rate.contributionHeadId);
    if (previousId === undefined) { latestByHead.set(rate.contributionHeadId, rate.id); continue; }
    const previousRate = rates.find((item) => item.id === previousId);
    if (!previousRate) { latestByHead.set(rate.contributionHeadId, rate.id); continue; }
    const previousFromDt = new Date(previousRate.fromDt).getTime();
    const currentFromDt = new Date(rate.fromDt).getTime();
    if (currentFromDt > previousFromDt || (currentFromDt === previousFromDt && rate.id > previousRate.id)) {
      latestByHead.set(rate.contributionHeadId, rate.id);
    }
  }
  return latestByHead;
}

function isScheduledRate(rate: ContributionRateItem) {
  return new Date(rate.fromDt).getTime() > new Date().getTime();
}

export default function ContributionRatesPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";
  const currentYear = new Date().getUTCFullYear();

  const [heads, setHeads] = useState<ContributionHeadOption[]>([]);
  const [headsLoading, setHeadsLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
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

  const browse = useBrowseState<ContributionRateItem, SortOption>({
    endpoint: "/api/contribution-rates",
    errorMessage: "Unable to load contribution rates.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "fromDt",
    defaultSortDir: "desc",
    filters: [
      { key: "contributionHeadId", parse: (raw) => raw ?? "" },
      { key: "activeOn" },
    ],
    buildParams: (filters) => {
      const params: Record<string, string> = {};
      if (filters["contributionHeadId"]) params["contributionHeadId"] = filters["contributionHeadId"];
      if (filters["activeOn"]) params["activeOn"] = filters["activeOn"];
      return params;
    },
  });

  const crud = useCrudActions({ setSubmitError, setSubmitSuccess });
  const latestCurrentRateIds = useMemo(() => getLatestCurrentRateIds(browse.items), [browse.items]);

  useEffect(() => {
    async function loadHeads() {
      setHeadsLoading(true);
      try {
        setHeads(await loadContributionHeadLookupsCached());
      } catch {
        setHeads([]);
      } finally {
        setHeadsLoading(false);
      }
    }
    void loadHeads();
  }, []);

  async function updateRate(id: number) {
    setUpdateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const response = await fetch(`/api/contribution-rates/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reference: editingState.reference,
          toDt: editingState.toDt.trim() ? editingState.toDt : null,
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<ContributionRateItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update contribution rate."));
      }
      browse.setItems((prev) => prev.map((item) => (item.id === id ? payload.data : item)));
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
          <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS} minWidth="sm:min-w-90">
            <select
              value={browse.filters["contributionHeadId"] ?? ""}
              onChange={(e) => browse.setFilter("contributionHeadId", e.target.value)}
              className={INPUT_CLASS}
              disabled={headsLoading}
            >
              <option value="">All heads</option>
              {heads.map((head) => (
                <option key={head.id} value={String(head.id)}>{head.description}</option>
              ))}
            </select>
            <input
              type="date"
              value={browse.filters["activeOn"] ?? ""}
              onChange={(e) => browse.setFilter("activeOn", e.target.value)}
              className={INPUT_CLASS}
            />
          </BrowseFilterBar>
        </div>

        <NoticeStack submitError={submitError} submitSuccess={submitSuccess} loadError={browse.loadError} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Add Rate Window</p>
            <p className="mt-1 text-sm text-slate-600">Rate windows may not overlap for the same head. Leave end date empty to create the active open-ended rate.</p>
            <div className="mt-4 grid gap-3">
              <select
                value={createState.contributionHeadId}
                onChange={(e) => setCreateState((prev) => ({ ...prev, contributionHeadId: e.target.value }))}
                disabled={!canMutate || headsLoading || crud.createLoading}
                className={!canMutate || headsLoading || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
              >
                <option value="">Select contribution head</option>
                {heads.map((head) => (
                  <option key={head.id} value={String(head.id)}>{head.description} ({head.period === "YEAR" ? "Yearly" : "Monthly"})</option>
                ))}
              </select>
              <input
                value={createState.reference}
                onChange={(e) => setCreateState((prev) => ({ ...prev, reference: e.target.value }))}
                placeholder="Reference or approval note"
                disabled={!canMutate || crud.createLoading}
                className={!canMutate || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
              />
              <input
                type="date"
                value={createState.fromDt}
                onChange={(e) => setCreateState((prev) => ({ ...prev, fromDt: e.target.value }))}
                disabled={!canMutate || crud.createLoading}
                className={!canMutate || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
              />
              <input
                type="date"
                value={createState.toDt}
                onChange={(e) => setCreateState((prev) => ({ ...prev, toDt: e.target.value }))}
                disabled={!canMutate || crud.createLoading}
                className={!canMutate || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
              />
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={createState.amt}
                onChange={(e) => setCreateState((prev) => ({ ...prev, amt: e.target.value }))}
                placeholder="Amount"
                disabled={!canMutate || crud.createLoading}
                className={!canMutate || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
              />
              <button
                type="button"
                disabled={!canMutate || crud.createLoading || !createState.contributionHeadId || !createState.fromDt || Number(createState.amt) <= 0}
                onClick={() => {
                  void crud.create<ContributionRateItem>({
                    endpoint: "/api/contribution-rates",
                    body: {
                      contributionHeadId: Number(createState.contributionHeadId),
                      reference: createState.reference.trim() || undefined,
                      fromDt: createState.fromDt,
                      toDt: createState.toDt.trim() ? createState.toDt : null,
                      amt: Number(createState.amt),
                    },
                    errorMessage: "Unable to create contribution rate.",
                    onSuccess: (data) => {
                      setCreateState({ contributionHeadId: "", reference: "", fromDt: "", toDt: "", amt: "" });
                      setSubmitSuccess(`Contribution rate added for ${data.contributionHead?.description ?? `head ${data.contributionHeadId}`}.`);
                      browse.setPage(1);
                      browse.reload();
                    },
                  });
                }}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Creating..." : "Add Rate"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<ContributionRateItem>
              columns={[
                {
                  header: "Head",
                  render: (item) => (
                    <div>
                      <p className="font-medium text-slate-900">{item.contributionHead?.description ?? `Head ${item.contributionHeadId}`}</p>
                      <p className="text-xs text-slate-500">{item.contributionHead?.period === "YEAR" ? "Yearly" : "Monthly"}</p>
                    </div>
                  ),
                },
                { header: "Amount", render: (item) => <span className="font-medium text-slate-900">{formatAmount(item.amt)}</span> },
                {
                  header: "Effective Window",
                  render: (item) => (
                    <div className="text-slate-600">
                      <div>From {new Date(item.fromDt).toLocaleDateString()}</div>
                      {editingId === item.id ? (
                        <label className="mt-2 grid gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                          <span>Retire On (toDt)</span>
                          <input
                            type="date"
                            value={editingState.toDt}
                            onChange={(e) => setEditingState((prev) => ({ ...prev, toDt: e.target.value }))}
                            disabled={updateLoading}
                            className="w-full min-w-36 rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal normal-case tracking-normal text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </label>
                      ) : (
                        <div>{item.toDt ? `To ${new Date(item.toDt).toLocaleDateString()}` : "Open-ended"}</div>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Reference",
                  render: (item) =>
                    editingId === item.id ? (
                      <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        <span>Reference</span>
                        <input
                          value={editingState.reference}
                          onChange={(e) => setEditingState((prev) => ({ ...prev, reference: e.target.value }))}
                          disabled={updateLoading}
                          className="w-full min-w-44 rounded border border-slate-300 bg-white px-2 py-1 text-sm font-normal normal-case tracking-normal text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                          placeholder="Reference or approval note"
                        />
                      </label>
                    ) : (
                      <span className="text-slate-600">{item.reference || "-"}</span>
                    ),
                },
                {
                  header: "Status",
                  render: (item) => (
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                        isCurrentRate(item) && latestCurrentRateIds.get(item.contributionHeadId) === item.id
                          ? "bg-emerald-100 text-emerald-700"
                          : isScheduledRate(item)
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700",
                      ].join(" ")}
                    >
                      {isCurrentRate(item) && latestCurrentRateIds.get(item.contributionHeadId) === item.id
                        ? "Current"
                        : isScheduledRate(item)
                          ? "Scheduled"
                          : "Historical"}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  render: (item) =>
                    editingId === item.id ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => { void updateRate(item.id); }}
                          disabled={updateLoading}
                          className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updateLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingId(null); setEditingState({ reference: "", toDt: "" }); }}
                          disabled={updateLoading}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <ContextLinkChips
                          label="Go To"
                          items={[
                            { href: { pathname: "/contributions", query: { headId: String(item.contributionHeadId) } }, label: "Contribution Capture" },
                            { href: { pathname: "/reports/contributions/transactions", query: { refYear: String(currentYear), headId: String(item.contributionHeadId) } }, label: "Transactions" },
                            { href: { pathname: "/reports/contributions/paid-unpaid-matrix", query: { refYear: String(currentYear), headId: String(item.contributionHeadId) } }, label: "Paid/Unpaid" },
                          ]}
                        />
                        {isCurrentRate(item) ? (
                          <button
                            type="button"
                            disabled={!canMutate}
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingState({ reference: item.reference ?? "", toDt: item.toDt ? new Date(item.toDt).toISOString().slice(0, 10) : "" });
                            }}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Locked</span>
                        )}
                      </div>
                    ),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
              loadingMessage="Loading contribution rates..."
              emptyMessage="Add a rate window or widen your filters to see existing history."
              rowKey={(item) => item.id}
            />
          </div>
        </div>
      </section>
    </div>
  );
}