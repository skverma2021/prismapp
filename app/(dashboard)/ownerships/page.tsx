"use client";

import { useEffect, useMemo, useState } from "react";

import { BrowseFilterBar, INPUT_CLASS, INPUT_DISABLED_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import {
  invalidateOwnershipDependentLookups,
  loadIndividualLookupsCached,
  loadUnitLookupsCached,
} from "@/src/lib/master-data-lookups";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { IndividualLookupOption, UnitLookupOption } from "@/src/lib/master-data-lookups";
import { compareUnitsByBlockAndDescription, formatUnitLabel } from "@/src/lib/unit-format";
import { toErrorMessage } from "@/src/types/api";
import type { ApiEnvelope } from "@/src/types/api";
import type { BrowseState } from "@/src/hooks/use-browse-state";

type UnitOption = UnitLookupOption;
type IndividualOption = IndividualLookupOption;

type OwnershipItem = {
  id: string;
  unitId: string;
  indId: string;
  fromDt: string;
  toDt: string | null;
  createdAt: string;
  individual?: {
    id: string;
    fName: string;
    mName?: string | null;
    sName: string;
  };
};

type SortOption = "fromDt" | "toDt" | "createdAt";

const SORT_OPTIONS = [
  { value: "fromDt" as const, label: "Sort by start date" },
  { value: "toDt" as const, label: "Sort by end date" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

function formatIndividualName(individual: IndividualOption) {
  return [individual.fName, individual.mName ?? "", individual.sName].filter(Boolean).join(" ");
}

function formatOwnershipOwner(item: OwnershipItem, individualMap: Map<string, IndividualOption>) {
  const lookup = individualMap.get(item.indId);
  if (lookup) return formatIndividualName(lookup);
  if (item.individual) return [item.individual.fName, item.individual.mName ?? "", item.individual.sName].filter(Boolean).join(" ");
  return item.indId;
}

function toDateInputValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function getTimelineStatus(item: { fromDt: string; toDt: string | null }) {
  const now = new Date();
  const fromDt = new Date(item.fromDt);
  const toDt = item.toDt ? new Date(item.toDt) : null;
  if (fromDt.getTime() > now.getTime()) return "Scheduled";
  if (toDt && toDt.getTime() < now.getTime()) return "Historical";
  return "Active";
}

export default function OwnershipsPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [individualsLoading, setIndividualsLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [transferState, setTransferState] = useState({ unitId: "", indId: "", fromDt: "" });
  const [transferLoading, setTransferLoading] = useState(false);

  const browse = useBrowseState<OwnershipItem, SortOption>({
    endpoint: "/api/ownerships",
    errorMessage: "Unable to load ownerships.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "fromDt",
    defaultSortDir: "desc",
    filters: [
      { key: "unitId" },
      { key: "indId" },
      { key: "activeOnly" },
    ],
    buildParams: (filters) => {
      const params: Record<string, string> = {};
      if (filters["unitId"]) params["unitId"] = filters["unitId"];
      if (filters["indId"]) params["indId"] = filters["indId"];
      if (filters["activeOnly"] === "true") params["activeOnly"] = "true";
      return params;
    },
  });

  const unitMap = useMemo(() => new Map(units.map((item) => [item.id, item])), [units]);
  const individualMap = useMemo(() => new Map(individuals.map((item) => [item.id, item])), [individuals]);

  useEffect(() => {
    async function loadUnits() {
      setUnitsLoading(true);
      try {
        setUnits((await loadUnitLookupsCached()).sort(compareUnitsByBlockAndDescription));
      } catch { setUnits([]); }
      finally { setUnitsLoading(false); }
    }
    void loadUnits();
  }, []);

  useEffect(() => {
    async function loadIndividuals() {
      setIndividualsLoading(true);
      try {
        setIndividuals(await loadIndividualLookupsCached());
      } catch { setIndividuals([]); }
      finally { setIndividualsLoading(false); }
    }
    void loadIndividuals();
  }, []);

  async function transferOwnership() {
    setTransferLoading(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const response = await fetch("/api/ownerships/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ unitId: transferState.unitId, indId: transferState.indId, fromDt: transferState.fromDt }),
      });
      const payload = (await response.json()) as ApiEnvelope<OwnershipItem>;
      if (!response.ok || !payload.ok) throw new Error(toErrorMessage(payload, "Unable to transfer ownership."));
      invalidateOwnershipDependentLookups();
      setTransferState({ unitId: "", indId: "", fromDt: "" });
      setSubmitSuccess("Ownership transferred.");
      browse.setFilter("activeOnly", "");
      browse.setPage(1);
      browse.reload();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to transfer ownership.");
    } finally {
      setTransferLoading(false);
    }
  }

  const appliedUnitFilter = browse.appliedFilters["unitId"] ?? "";
  const appliedIndividualFilter = browse.appliedFilters["indId"] ?? "";
  const appliedActiveOnly = browse.appliedFilters["activeOnly"] === "true";

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice className="mt-4" mode="mutation" allowedRoles={["SOCIETY_ADMIN", "MANAGER"]} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">Timeline Management</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Ownerships</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review builder-backed ownership history per unit and use transfer to hand over the active owner without breaking continuity.
            </p>
          </div>
          <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS} minWidth="sm:min-w-85">
            <select
              value={browse.filters["unitId"] ?? ""}
              onChange={(e) => browse.setFilter("unitId", e.target.value)}
              className={INPUT_CLASS}
              disabled={unitsLoading}
            >
              <option value="">{unitsLoading ? "Loading units..." : "All units"}</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>
              ))}
            </select>
            <select
              value={browse.filters["indId"] ?? ""}
              onChange={(e) => browse.setFilter("indId", e.target.value)}
              className={INPUT_CLASS}
              disabled={individualsLoading}
            >
              <option value="">{individualsLoading ? "Loading individuals..." : "All individuals"}</option>
              {individuals.map((individual) => (
                <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={browse.filters["activeOnly"] === "true"} onChange={(e) => browse.setFilter("activeOnly", e.target.checked ? "true" : "")} />
              Active ownerships only
            </label>
          </BrowseFilterBar>
        </div>

        <NoticeStack submitError={submitError} submitSuccess={submitSuccess} loadError={browse.loadError} />

        {appliedUnitFilter || appliedIndividualFilter ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <ContextLinkChips
              label="Filtered Context"
              items={[
                {
                  href: {
                    pathname: "/residencies",
                    query: {
                      ...(appliedUnitFilter ? { unitId: appliedUnitFilter } : {}),
                      ...(appliedIndividualFilter ? { indId: appliedIndividualFilter } : {}),
                      activeOnly: String(appliedActiveOnly),
                    },
                  },
                  label: "Match Residencies",
                },
                {
                  href: {
                    pathname: "/reports/contributions/transactions",
                    query: {
                      refYear: String(new Date().getUTCFullYear()),
                      ...(appliedUnitFilter ? { unitId: appliedUnitFilter } : {}),
                    },
                  },
                  label: "Transactions",
                },
              ]}
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Continuity Rule</p>
              <p className="mt-1 text-sm text-slate-600">
                Every unit now starts in Builder Inventory on its inception date. Normal operator workflow should use transfer to move from the current active owner to the next one while keeping the timeline contiguous.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Transfer Active Ownership</p>
              <p className="mt-1 text-sm text-slate-600">Use the dedicated transfer flow when one active owner should hand over a unit to another individual.</p>
              <div className="mt-4 grid gap-3">
                <select
                  value={transferState.unitId}
                  onChange={(e) => setTransferState((prev) => ({ ...prev, unitId: e.target.value }))}
                  disabled={!canMutate || unitsLoading || transferLoading}
                  className={!canMutate || unitsLoading || transferLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
                >
                  <option value="">{unitsLoading ? "Loading units..." : "Select unit"}</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>)}
                </select>
                <select
                  value={transferState.indId}
                  onChange={(e) => setTransferState((prev) => ({ ...prev, indId: e.target.value }))}
                  disabled={!canMutate || individualsLoading || transferLoading}
                  className={!canMutate || individualsLoading || transferLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
                >
                  <option value="">{individualsLoading ? "Loading individuals..." : "Transfer to individual"}</option>
                  {individuals.map((individual) => <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>)}
                </select>
                <input
                  type="date"
                  value={transferState.fromDt}
                  onChange={(e) => setTransferState((prev) => ({ ...prev, fromDt: e.target.value }))}
                  disabled={!canMutate || transferLoading}
                  className={!canMutate || transferLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
                />
                <button
                  type="button"
                  disabled={!canMutate || transferLoading || !transferState.unitId || !transferState.indId || !transferState.fromDt}
                  onClick={() => { void transferOwnership(); }}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transferLoading ? "Transferring..." : "Transfer Ownership"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<OwnershipItem>
              columns={[
                { header: "Unit", render: (item) => unitMap.get(item.unitId) ? formatUnitLabel(unitMap.get(item.unitId) as UnitOption) : item.unitId },
                { header: "Owner", render: (item) => formatOwnershipOwner(item, individualMap) },
                { header: "From", render: (item) => toDateInputValue(item.fromDt) },
                { header: "To", render: (item) => toDateInputValue(item.toDt) || getTimelineStatus(item) },
                {
                  header: "Actions",
                  render: (item) => (
                    <div className="space-y-2">
                      <ContextLinkChips
                        label="Go To"
                        items={[
                          { href: { pathname: "/residencies", query: { unitId: item.unitId, activeOnly: "true" } }, label: "Residencies" },
                          { href: { pathname: "/contributions", query: { unitId: item.unitId, depositedBy: item.indId } }, label: "Contribution Capture" },
                          { href: { pathname: "/reports/contributions/transactions", query: { refYear: String(new Date().getUTCFullYear()), unitId: item.unitId } }, label: "Transactions" },
                        ]}
                      />
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Locked</p>
                    </div>
                  ),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
              loadingMessage="Loading ownerships..."
              emptyMessage="No ownership records found for the current filter."
              rowKey={(item) => item.id}
            />
          </div>
        </div>
      </section>
    </div>
  );
}