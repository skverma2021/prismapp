"use client";

import { useEffect, useMemo, useState } from "react";

import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { fetchAllPages } from "@/src/lib/paginated-client";
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

type UnitOption = {
  id: string;
  description: string;
  blockId: string;
  block?: {
    description: string;
  };
};

type IndividualOption = {
  id: string;
  fName: string;
  mName?: string | null;
  sName: string;
};

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

export default function ResidenciesPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [items, setItems] = useState<ResidencyItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [appliedUnitFilter, setAppliedUnitFilter] = useState("");
  const [individualFilter, setIndividualFilter] = useState("");
  const [appliedIndividualFilter, setAppliedIndividualFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [appliedActiveOnly, setAppliedActiveOnly] = useState(false);
  const [createState, setCreateState] = useState<ResidencyFormState>(emptyFormState);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<ResidencyFormState>(emptyFormState);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const unitMap = useMemo(() => new Map(units.map((item) => [item.id, item])), [units]);
  const individualMap = useMemo(() => new Map(individuals.map((item) => [item.id, item])), [individuals]);

  useEffect(() => {
    async function loadLookups() {
      setLookupLoading(true);

      try {
        const [allUnits, allIndividuals] = await Promise.all([
          fetchAllPages<UnitOption>(
            (currentPage) => `/api/units?page=${currentPage}&pageSize=500&sortBy=description&sortDir=asc`,
            "Unable to load units."
          ),
          fetchAllPages<IndividualOption>(
            (currentPage) => `/api/individuals?page=${currentPage}&pageSize=100&sortBy=sName&sortDir=asc`,
            "Unable to load individuals."
          ),
        ]);

        setUnits(allUnits.sort(compareUnitsByBlockAndDescription));
        setIndividuals(allIndividuals);
      } catch (error) {
        setUnits([]);
        setIndividuals([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load residency lookups.");
      } finally {
        setLookupLoading(false);
      }
    }

    void loadLookups();
  }, []);

  useEffect(() => {
    async function loadResidencies() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
          sortBy: "fromDt",
          sortDir: "desc",
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
  }, [appliedActiveOnly, appliedIndividualFilter, appliedUnitFilter, page]);

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
      setSubmitSuccess("Residency record created.");
      setPage(1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create residency.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function updateResidency(id: string) {
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/residencies/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unitId: editingState.unitId,
          indId: editingState.indId,
          fromDt: editingState.fromDt,
          toDt: editingState.toDt.trim() ? editingState.toDt : null,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<ResidencyItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update residency."));
      }

      setEditingId(null);
      setEditingState(emptyFormState);
      setItems((prev) => prev.map((item) => (item.id === id ? payload.data : item)));
      setSubmitSuccess("Residency record updated.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update residency.");
    }
  }

  async function deleteResidency(id: string) {
    setDeleteLoadingId(id);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/residencies/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as ApiEnvelope<null>;
        throw new Error(toErrorMessage(payload, "Unable to delete residency."));
      }

      const nextCount = items.length - 1;
      setSubmitSuccess("Residency record deleted.");

      if (nextCount === 0 && page > 1) {
        setPage(page - 1);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setTotalItems((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to delete residency.");
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">Timeline Management</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Residencies</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage unit occupancy timelines, current active residents, and vacancy transitions while preserving no-overlap rules.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-85">
            <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" disabled={lookupLoading}>
              <option value="">All units</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>
              ))}
            </select>
            <select value={individualFilter} onChange={(event) => setIndividualFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" disabled={lookupLoading}>
              <option value="">All individuals</option>
              {individuals.map((individual) => (
                <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
              Active residencies only
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setPage(1); setAppliedUnitFilter(unitFilter); setAppliedIndividualFilter(individualFilter); setAppliedActiveOnly(activeOnly); }} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">Apply Filters</button>
              <button type="button" onClick={() => { setUnitFilter(""); setIndividualFilter(""); setActiveOnly(false); setAppliedUnitFilter(""); setAppliedIndividualFilter(""); setAppliedActiveOnly(false); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Reset</button>
            </div>
          </div>
        </div>

        {submitError ? <InlineNotice className="mt-4" tone="danger" message={submitError} /> : null}
        {submitSuccess ? <InlineNotice className="mt-4" tone="success" message={submitSuccess} /> : null}
        {loadError ? <InlineNotice className="mt-4" tone="danger" message={loadError} /> : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Residency</p>
            <p className="mt-1 text-sm text-slate-600">Residencies may be active or historical, but each unit can have at most one active resident at a time.</p>
            <div className="mt-4 grid gap-3">
              <select value={createState.unitId} onChange={(event) => setCreateState((prev) => ({ ...prev, unitId: event.target.value }))} disabled={!canMutate || lookupLoading || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                <option value="">Select unit</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>)}
              </select>
              <select value={createState.indId} onChange={(event) => setCreateState((prev) => ({ ...prev, indId: event.target.value }))} disabled={!canMutate || lookupLoading || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                <option value="">Select individual</option>
                {individuals.map((individual) => <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>)}
              </select>
              <input type="date" value={createState.fromDt} onChange={(event) => setCreateState((prev) => ({ ...prev, fromDt: event.target.value }))} disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <input type="date" value={createState.toDt} onChange={(event) => setCreateState((prev) => ({ ...prev, toDt: event.target.value }))} disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
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
                        <td className="px-3 py-3">{editingId === item.id ? (
                          <select value={editingState.unitId} onChange={(event) => setEditingState((prev) => ({ ...prev, unitId: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                            <option value="">Select unit</option>
                            {units.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>)}
                          </select>
                        ) : (unitMap.get(item.unitId) ? formatUnitLabel(unitMap.get(item.unitId) as UnitOption) : item.unitId)}</td>
                        <td className="px-3 py-3">{editingId === item.id ? (
                          <select value={editingState.indId} onChange={(event) => setEditingState((prev) => ({ ...prev, indId: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                            <option value="">Select individual</option>
                            {individuals.map((individual) => <option key={individual.id} value={individual.id}>{formatIndividualName(individual)}</option>)}
                          </select>
                        ) : (individualMap.get(item.indId) ? formatIndividualName(individualMap.get(item.indId) as IndividualOption) : item.indId)}</td>
                        <td className="px-3 py-3">{editingId === item.id ? <input type="date" value={editingState.fromDt} onChange={(event) => setEditingState((prev) => ({ ...prev, fromDt: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" /> : toDateInputValue(item.fromDt)}</td>
                        <td className="px-3 py-3">{editingId === item.id ? <input type="date" value={editingState.toDt} onChange={(event) => setEditingState((prev) => ({ ...prev, toDt: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" /> : (toDateInputValue(item.toDt) || "Active")}</td>
                        <td className="px-3 py-3"><div className="flex flex-wrap gap-2">{editingId === item.id ? (
                          <>
                            <button type="button" disabled={!editingState.unitId || !editingState.indId || !editingState.fromDt} onClick={() => { void updateResidency(item.id); }} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">Save</button>
                            <button type="button" onClick={() => { setEditingId(null); setEditingState(emptyFormState); }} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" disabled={!canMutate} onClick={() => { setEditingId(item.id); setEditingState({ unitId: item.unitId, indId: item.indId, fromDt: toDateInputValue(item.fromDt), toDt: toDateInputValue(item.toDt) }); }} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
                            <button type="button" disabled={!canMutate || deleteLoadingId === item.id} onClick={() => { void deleteResidency(item.id); }} className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{deleteLoadingId === item.id ? "Deleting..." : "Delete"}</button>
                          </>
                        )}</div></td>
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