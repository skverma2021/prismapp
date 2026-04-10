"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
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

type ResidencyItem = {
  id: string;
  unitId: string;
  indId: string;
  fromDt: string;
  toDt: string | null;
  createdAt: string;
};

type ResidencyFormState = {
  unitId: string;
  indId: string;
  fromDt: string;
  toDt: string;
};

type SortOption = "fromDt" | "toDt" | "createdAt";

const emptyFormState: ResidencyFormState = {
  unitId: "",
  indId: "",
  fromDt: "",
  toDt: "",
};

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

function formatIndividualName(individual: IndividualOption) {
  return [individual.fName, individual.mName ?? "", individual.sName].filter(Boolean).join(" ");
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

async function fetchWithRetry<T>(url: string, fallbackMessage: string, maxAttempts = 2): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      const payload = (await response.json()) as ApiEnvelope<T>;

      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, fallbackMessage));
      }

      return payload.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(fallbackMessage);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw lastError ?? new Error(fallbackMessage);
}

export default function ResidenciesPage() {
  const { session } = useAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canMutate = session.role !== "READ_ONLY";

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [items, setItems] = useState<ResidencyItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [individualsLoading, setIndividualsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [appliedUnitFilter, setAppliedUnitFilter] = useState("");
  const [individualFilter, setIndividualFilter] = useState("");
  const [appliedIndividualFilter, setAppliedIndividualFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [appliedActiveOnly, setAppliedActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("fromDt");
  const [appliedSortBy, setAppliedSortBy] = useState<SortOption>("fromDt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [appliedSortDir, setAppliedSortDir] = useState<"asc" | "desc">("desc");
  const [reloadKey, setReloadKey] = useState(0);
  const [createState, setCreateState] = useState<ResidencyFormState>(emptyFormState);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingResidencyId, setEditingResidencyId] = useState("");
  const [editingToDt, setEditingToDt] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const unitMap = useMemo(() => new Map(units.map((item) => [item.id, item])), [units]);
  const individualMap = useMemo(() => new Map(individuals.map((item) => [item.id, item])), [individuals]);
  const deferredUnits = useDeferredValue(units);
  const deferredIndividuals = useDeferredValue(individuals);

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
        const data = await fetchWithRetry<UnitOption[]>("/api/units/lookups", "Unable to load units.");
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
        const data = await fetchWithRetry<IndividualOption[]>(
          "/api/individuals/lookups",
          "Unable to load individuals."
        );
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
    async function loadResidencies() {
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

        const response = await fetch(`/api/residencies?${params.toString()}`);
        const payload = (await response.json()) as ApiEnvelope<PaginatedResponse<ResidencyItem>>;

        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, "Unable to load residencies."));
        }

        setItems(payload.data.items);
        setTotalPages(Math.max(payload.data.totalPages, 1));
        setTotalItems(payload.data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load residencies.");
      } finally {
        setLoading(false);
      }
    }

    void loadResidencies();
  }, [appliedActiveOnly, appliedIndividualFilter, appliedUnitFilter, appliedSortBy, appliedSortDir, page, reloadKey]);

  async function createResidency() {
    setCreateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/residencies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unitId: createState.unitId,
          indId: createState.indId,
          fromDt: createState.fromDt,
          toDt: createState.toDt.trim() ? createState.toDt : null,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<ResidencyItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to create residency."));
      }

      setCreateState(emptyFormState);
      setReloadKey((value) => value + 1);
      setSubmitSuccess("Residency record created.");
      setPage(1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create residency.");
    } finally {
      setCreateLoading(false);
    }
  }

  function startEditingResidency(item: ResidencyItem) {
    setSubmitError("");
    setSubmitSuccess("");
    setEditingResidencyId(item.id);
    setEditingToDt(toDateInputValue(item.toDt));
  }

  function cancelEditingResidency() {
    setEditingResidencyId("");
    setEditingToDt("");
  }

  async function saveResidencyEndDate(id: string) {
    setSaveLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/residencies/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toDt: editingToDt.trim() ? editingToDt : null,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<ResidencyItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update residency."));
      }

      cancelEditingResidency();
      setReloadKey((value) => value + 1);
      setSubmitSuccess("Residency end date updated.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update residency.");
    } finally {
      setSaveLoading(false);
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Residencies</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage unit occupancy timelines, current active residents, and vacancy transitions while preserving no-overlap rules.
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
              Active residencies only
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
                    pathname: "/ownerships",
                    query: {
                      ...(appliedUnitFilter ? { unitId: appliedUnitFilter } : {}),
                      ...(appliedIndividualFilter ? { indId: appliedIndividualFilter } : {}),
                      activeOnly: String(appliedActiveOnly),
                    },
                  },
                  label: "Match Ownerships",
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Residency</p>
            <p className="mt-1 text-sm text-slate-600">Residencies may be active or historical, but they cannot start before the unit inception date. Existing rows keep unit, resident, and start date locked while still allowing `toDt` to be updated.</p>
            <div className="mt-4 grid gap-3">
              <select value={createState.unitId} onChange={(event) => startTransition(() => setCreateState((prev) => ({ ...prev, unitId: event.target.value })))} disabled={!canMutate || unitsLoading || createLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                <option value="">{unitsLoading ? "Loading units..." : "Select unit"}</option>
                {deferredUnits.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>)}
              </select>
              <select value={createState.indId} onChange={(event) => startTransition(() => setCreateState((prev) => ({ ...prev, indId: event.target.value })))} disabled={!canMutate || individualsLoading || createLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                <option value="">{individualsLoading ? "Loading individuals..." : "Select individual"}</option>
                {deferredIndividuals.map((individual) => <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>)}
              </select>
              <input type="date" value={createState.fromDt} onChange={(event) => setCreateState((prev) => ({ ...prev, fromDt: event.target.value }))} disabled={!canMutate || createLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <input type="date" value={createState.toDt} onChange={(event) => setCreateState((prev) => ({ ...prev, toDt: event.target.value }))} disabled={!canMutate || createLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <button type="button" disabled={!canMutate || createLoading || !createState.unitId || !createState.indId || !createState.fromDt} onClick={() => { void createResidency(); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">{createLoading ? "Creating..." : "Create Residency"}</button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Resident</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">To</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="px-3 py-4 text-slate-600" colSpan={5}>Loading residencies...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td className="px-3 py-4 text-slate-600" colSpan={5}>No residency records found for the current filter.</td></tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top text-slate-700">
                        <td className="px-3 py-3">{unitMap.get(item.unitId) ? formatUnitLabel(unitMap.get(item.unitId) as UnitOption) : item.unitId}</td>
                        <td className="px-3 py-3">{individualMap.get(item.indId) ? formatIndividualName(individualMap.get(item.indId) as IndividualOption) : item.indId}</td>
                        <td className="px-3 py-3">{toDateInputValue(item.fromDt)}</td>
                        <td className="px-3 py-3">
                          {editingResidencyId === item.id ? (
                            <input
                              type="date"
                              value={editingToDt}
                              onChange={(event) => setEditingToDt(event.target.value)}
                              disabled={saveLoading}
                              className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          ) : (
                            toDateInputValue(item.toDt) || getTimelineStatus(item)
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {canMutate ? (
                            editingResidencyId === item.id ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void saveResidencyEndDate(item.id);
                                  }}
                                  disabled={saveLoading}
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                                >
                                  {saveLoading ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingResidency}
                                  disabled={saveLoading}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingResidency(item)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
                                >
                                  Edit End
                                </button>
                                <ContextLinkChips
                                  label="Go To"
                                  items={[
                                    {
                                      href: { pathname: "/ownerships", query: { unitId: item.unitId, activeOnly: "true" } },
                                      label: "Ownerships",
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
                              </div>
                            )
                          ) : (
                            <div className="space-y-2">
                              <ContextLinkChips
                                label="Go To"
                                items={[
                                  {
                                    href: { pathname: "/ownerships", query: { unitId: item.unitId, activeOnly: "true" } },
                                    label: "Ownerships",
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
                              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Locked</span>
                            </div>
                          )}
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