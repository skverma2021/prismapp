"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { loadIndividualLookupsCached, loadUnitLookupsCached } from "@/src/lib/master-data-lookups";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { pushQueryState } from "@/src/lib/url-query-state";
import type { IndividualLookupOption, UnitLookupOption } from "@/src/lib/master-data-lookups";
import { compareUnitsByBlockAndDescription, formatUnitLabel } from "@/src/lib/unit-format";

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        code?: string;
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

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

function formatIndividualName(individual: IndividualOption) {
  return [individual.fName, individual.mName ?? "", individual.sName].filter(Boolean).join(" ");
}

function formatOwnershipOwner(item: OwnershipItem, individualMap: Map<string, IndividualOption>) {
  const lookup = individualMap.get(item.indId);
  if (lookup) {
    return formatIndividualName(lookup);
  }

  if (item.individual) {
    return [item.individual.fName, item.individual.mName ?? "", item.individual.sName].filter(Boolean).join(" ");
  }

  return item.indId;
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getTimelineStatus(item: { fromDt: string; toDt: string | null }) {
  const now = new Date();
  const fromDt = new Date(item.fromDt);
  const toDt = item.toDt ? new Date(item.toDt) : null;

  if (fromDt.getTime() > now.getTime()) {
    return "Scheduled";
  }

  if (toDt && toDt.getTime() < now.getTime()) {
    return "Historical";
  }

  return "Active";
}

export default function OwnershipsPage() {
  const { session } = useAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canMutate = session.role !== "READ_ONLY";
  const initialUnitFilter = searchParams.get("unitId") ?? "";
  const initialIndividualFilter = searchParams.get("indId") ?? "";
  const initialActiveOnly = searchParams.get("activeOnly") === "true";
  const initialSortBy =
    searchParams.get("sortBy") === "toDt"
      ? "toDt"
      : searchParams.get("sortBy") === "createdAt"
        ? "createdAt"
        : "fromDt";
  const initialSortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [items, setItems] = useState<OwnershipItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [individualsLoading, setIndividualsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [unitFilter, setUnitFilter] = useState(initialUnitFilter);
  const [appliedUnitFilter, setAppliedUnitFilter] = useState(initialUnitFilter);
  const [individualFilter, setIndividualFilter] = useState(initialIndividualFilter);
  const [appliedIndividualFilter, setAppliedIndividualFilter] = useState(initialIndividualFilter);
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly);
  const [appliedActiveOnly, setAppliedActiveOnly] = useState(initialActiveOnly);
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy);
  const [appliedSortBy, setAppliedSortBy] = useState<SortOption>(initialSortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);
  const [appliedSortDir, setAppliedSortDir] = useState<"asc" | "desc">(initialSortDir);
  const [transferState, setTransferState] = useState({ unitId: "", indId: "", fromDt: "" });
  const [transferLoading, setTransferLoading] = useState(false);
  const unitMap = useMemo(() => new Map(units.map((item) => [item.id, item])), [units]);
  const individualMap = useMemo(() => new Map(individuals.map((item) => [item.id, item])), [individuals]);

  useEffect(() => {
    const nextUnitFilter = searchParams.get("unitId") ?? "";
    const nextIndividualFilter = searchParams.get("indId") ?? "";
    const nextActiveOnly = searchParams.get("activeOnly") === "true";
    const nextSortBy =
      searchParams.get("sortBy") === "toDt"
        ? "toDt"
        : searchParams.get("sortBy") === "createdAt"
          ? "createdAt"
          : "fromDt";
    const nextSortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    setUnitFilter(nextUnitFilter);
    setAppliedUnitFilter(nextUnitFilter);
    setIndividualFilter(nextIndividualFilter);
    setAppliedIndividualFilter(nextIndividualFilter);
    setActiveOnly(nextActiveOnly);
    setAppliedActiveOnly(nextActiveOnly);
    setSortBy(nextSortBy);
    setAppliedSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setAppliedSortDir(nextSortDir);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    async function loadUnits() {
      setUnitsLoading(true);
      setLoadError("");

      try {
        const data = await loadUnitLookupsCached();
        setUnits(data.sort(compareUnitsByBlockAndDescription));
      } catch (error) {
        setUnits([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load units.");
      } finally {
        setUnitsLoading(false);
      }
    }

    void loadUnits();
  }, []);

  useEffect(() => {
    async function loadIndividuals() {
      setIndividualsLoading(true);

      try {
        const data = await loadIndividualLookupsCached();
        setIndividuals(data);
      } catch (error) {
        setIndividuals([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load individuals.");
      } finally {
        setIndividualsLoading(false);
      }
    }

    void loadIndividuals();
  }, []);

  useEffect(() => {
    async function loadOwnerships() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
          sortBy: appliedSortBy,
          sortDir: appliedSortDir,
        });

        if (appliedUnitFilter) {
          params.set("unitId", appliedUnitFilter);
        }

        if (appliedIndividualFilter) {
          params.set("indId", appliedIndividualFilter);
        }

        if (appliedActiveOnly) {
          params.set("activeOnly", "true");
        }

        const data = await fetchJsonWithRetry<PaginatedResponse<OwnershipItem>>(
          `/api/ownerships?${params.toString()}`,
          "Unable to load ownerships."
        );

        setItems(data.items);
        setTotalPages(Math.max(data.totalPages, 1));
        setTotalItems(data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load ownerships.");
      } finally {
        setLoading(false);
      }
    }

    void loadOwnerships();
  }, [appliedActiveOnly, appliedIndividualFilter, appliedUnitFilter, appliedSortBy, appliedSortDir, page]);

  async function transferOwnership() {
    setTransferLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/ownerships/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unitId: transferState.unitId,
          indId: transferState.indId,
          fromDt: transferState.fromDt,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<OwnershipItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to transfer ownership."));
      }

      setTransferState({ unitId: "", indId: "", fromDt: "" });
      setSubmitSuccess("Ownership transferred.");
      setPage(1);
      setAppliedActiveOnly(false);
      setActiveOnly(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to transfer ownership.");
    } finally {
      setTransferLoading(false);
    }
  }

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
          <div className="grid gap-2 sm:min-w-85">
            <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" disabled={unitsLoading}>
              <option value="">{unitsLoading ? "Loading units..." : "All units"}</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>
              ))}
            </select>
            <select value={individualFilter} onChange={(event) => setIndividualFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" disabled={individualsLoading}>
              <option value="">{individualsLoading ? "Loading individuals..." : "All individuals"}</option>
              {individuals.map((individual) => (
                <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>
              ))}
            </select>
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="fromDt">Sort by start date</option>
                <option value="toDt">Sort by end date</option>
                <option value="createdAt">Sort by created time</option>
              </select>
              <select value={sortDir} onChange={(event) => setSortDir(event.target.value as "asc" | "desc")} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
              Active ownerships only
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setPage(1); setAppliedUnitFilter(unitFilter); setAppliedIndividualFilter(individualFilter); setAppliedActiveOnly(activeOnly); setAppliedSortBy(sortBy); setAppliedSortDir(sortDir); pushQueryState(pathname, { ...(unitFilter ? { unitId: unitFilter } : {}), ...(individualFilter ? { indId: individualFilter } : {}), activeOnly, sortBy, sortDir }); }} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">Apply Filters</button>
              <button type="button" onClick={() => { setUnitFilter(""); setIndividualFilter(""); setActiveOnly(false); setAppliedUnitFilter(""); setAppliedIndividualFilter(""); setAppliedActiveOnly(false); setSortBy("fromDt"); setAppliedSortBy("fromDt"); setSortDir("desc"); setAppliedSortDir("desc"); setPage(1); pushQueryState(pathname, {}); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Reset Filters</button>
            </div>
          </div>
        </div>

        {submitError ? <InlineNotice className="mt-4" tone="danger" message={submitError} /> : null}
        {submitSuccess ? <InlineNotice className="mt-4" tone="success" message={submitSuccess} /> : null}
        {loadError ? <InlineNotice className="mt-4" tone="danger" message={loadError} /> : null}

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
                <select value={transferState.unitId} onChange={(event) => setTransferState((prev) => ({ ...prev, unitId: event.target.value }))} disabled={!canMutate || unitsLoading || transferLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                  <option value="">{unitsLoading ? "Loading units..." : "Select unit"}</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>)}
                </select>
                <select value={transferState.indId} onChange={(event) => setTransferState((prev) => ({ ...prev, indId: event.target.value }))} disabled={!canMutate || individualsLoading || transferLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                  <option value="">{individualsLoading ? "Loading individuals..." : "Transfer to individual"}</option>
                  {individuals.map((individual) => <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>)}
                </select>
                <input type="date" value={transferState.fromDt} onChange={(event) => setTransferState((prev) => ({ ...prev, fromDt: event.target.value }))} disabled={!canMutate || transferLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
                <button type="button" disabled={!canMutate || transferLoading || !transferState.unitId || !transferState.indId || !transferState.fromDt} onClick={() => { void transferOwnership(); }} className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{transferLoading ? "Transferring..." : "Transfer Ownership"}</button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Owner</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">To</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="px-3 py-4 text-slate-600" colSpan={5}>Loading ownerships...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td className="px-3 py-4 text-slate-600" colSpan={5}>No ownership records found for the current filter.</td></tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top text-slate-700">
                        <td className="px-3 py-3">{unitMap.get(item.unitId) ? formatUnitLabel(unitMap.get(item.unitId) as UnitOption) : item.unitId}</td>
                        <td className="px-3 py-3">{formatOwnershipOwner(item, individualMap)}</td>
                        <td className="px-3 py-3">{toDateInputValue(item.fromDt)}</td>
                        <td className="px-3 py-3">{toDateInputValue(item.toDt) || getTimelineStatus(item)}</td>
                        <td className="px-3 py-3">
                          <div className="space-y-2">
                            <ContextLinkChips
                              label="Go To"
                              items={[
                                {
                                  href: { pathname: "/residencies", query: { unitId: item.unitId, activeOnly: "true" } },
                                  label: "Residencies",
                                },
                                {
                                  href: {
                                    pathname: "/contributions",
                                    query: { unitId: item.unitId, depositedBy: item.indId },
                                  },
                                  label: "Contribution Capture",
                                },
                                {
                                  href: {
                                    pathname: "/reports/contributions/transactions",
                                    query: { refYear: String(new Date().getUTCFullYear()), unitId: item.unitId },
                                  },
                                  label: "Transactions",
                                },
                              ]}
                            />
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Locked</p>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}