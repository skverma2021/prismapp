"use client";

import { useEffect, useMemo, useState } from "react";

import { BrowseFilterBar, INPUT_CLASS, INPUT_DISABLED_CLASS, BTN_SUBMIT } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import {
  invalidateResidencyDependentLookups,
  loadIndividualLookupsCached,
  loadResidencyCreatableUnitIdsCached,
  loadUnitLookupsCached,
} from "@/src/lib/master-data-lookups";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";
import type { IndividualLookupOption, UnitLookupOption } from "@/src/lib/master-data-lookups";
import { compareUnitsByBlockAndDescription, formatUnitLabel } from "@/src/lib/unit-format";
import { toErrorMessage } from "@/src/types/api";
import type { ApiEnvelope } from "@/src/types/api";
import type { BrowseState } from "@/src/hooks/use-browse-state";

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

type ResidencyFormState = { unitId: string; indId: string; fromDt: string; toDt: string };
type SortOption = "fromDt" | "toDt" | "createdAt";

const SORT_OPTIONS = [
  { value: "fromDt" as const, label: "Sort by start date" },
  { value: "toDt" as const, label: "Sort by end date" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

const emptyFormState: ResidencyFormState = { unitId: "", indId: "", fromDt: "", toDt: "" };

function formatIndividualName(individual: IndividualOption) {
  return [individual.fName, individual.mName ?? "", individual.sName].filter(Boolean).join(" ");
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

export default function ResidenciesPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [creatableUnitIds, setCreatableUnitIds] = useState<string[]>([]);
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [creatableUnitsLoading, setCreatableUnitsLoading] = useState(true);
  const [individualsLoading, setIndividualsLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [createState, setCreateState] = useState<ResidencyFormState>(emptyFormState);
  const [editingResidencyId, setEditingResidencyId] = useState("");
  const [editingToDt, setEditingToDt] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const browse = useBrowseState<ResidencyItem, SortOption>({
    endpoint: "/api/residencies",
    errorMessage: "Unable to load residencies.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "fromDt",
    defaultSortDir: "desc",
    filters: [{ key: "unitId" }, { key: "indId" }, { key: "activeOnly" }],
    buildParams: (filters) => {
      const params: Record<string, string> = {};
      if (filters["unitId"]) params["unitId"] = filters["unitId"];
      if (filters["indId"]) params["indId"] = filters["indId"];
      if (filters["activeOnly"] === "true") params["activeOnly"] = "true";
      return params;
    },
  });

  const crud = useCrudActions({ setSubmitError, setSubmitSuccess });
  const unitMap = useMemo(() => new Map(units.map((item) => [item.id, item])), [units]);
  const individualMap = useMemo(() => new Map(individuals.map((item) => [item.id, item])), [individuals]);
  const creatableUnits = useMemo(() => units.filter((unit) => creatableUnitIds.includes(unit.id)), [creatableUnitIds, units]);

  useEffect(() => { async function load() { setUnitsLoading(true); try { setUnits((await loadUnitLookupsCached()).sort(compareUnitsByBlockAndDescription)); } catch { setUnits([]); } finally { setUnitsLoading(false); } } void load(); }, []);
  useEffect(() => { async function load() { setCreatableUnitsLoading(true); try { setCreatableUnitIds(await loadResidencyCreatableUnitIdsCached()); } catch { setCreatableUnitIds([]); } finally { setCreatableUnitsLoading(false); } } void load(); }, []);
  useEffect(() => { async function load() { setIndividualsLoading(true); try { setIndividuals(await loadIndividualLookupsCached()); } catch { setIndividuals([]); } finally { setIndividualsLoading(false); } } void load(); }, []);

  function startEditingResidency(item: ResidencyItem) {
    setSubmitError(""); setSubmitSuccess("");
    setEditingResidencyId(item.id);
    setEditingToDt(toDateInputValue(item.toDt));
  }

  function cancelEditingResidency() { setEditingResidencyId(""); setEditingToDt(""); }

  async function saveResidencyEndDate(id: string) {
    setSaveLoading(true); setSubmitError(""); setSubmitSuccess("");
    try {
      const response = await fetch(`/api/residencies/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toDt: editingToDt.trim() ? editingToDt : null }),
      });
      const payload = (await response.json()) as ApiEnvelope<ResidencyItem>;
      if (!response.ok || !payload.ok) throw new Error(toErrorMessage(payload, "Unable to update residency."));
      invalidateResidencyDependentLookups();
      cancelEditingResidency();
      browse.reload();
      setSubmitSuccess("Residency end date updated.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update residency.");
    } finally { setSaveLoading(false); }
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Residencies</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage unit occupancy timelines, current active residents, and vacancy transitions while preserving no-overlap rules.
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
              {units.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>)}
            </select>
            <select
              value={browse.filters["indId"] ?? ""}
              onChange={(e) => browse.setFilter("indId", e.target.value)}
              className={INPUT_CLASS}
              disabled={individualsLoading}
            >
              <option value="">{individualsLoading ? "Loading individuals..." : "All individuals"}</option>
              {individuals.map((ind) => <option key={ind.id} value={ind.id}>{formatIndividualName(ind)}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={browse.filters["activeOnly"] === "true"} onChange={(e) => browse.setFilter("activeOnly", e.target.checked ? "true" : "")} />
              Active residencies only
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
                  href: { pathname: "/ownerships", query: { ...(appliedUnitFilter ? { unitId: appliedUnitFilter } : {}), ...(appliedIndividualFilter ? { indId: appliedIndividualFilter } : {}), activeOnly: String(appliedActiveOnly) } },
                  label: "Match Ownerships",
                },
                {
                  href: { pathname: "/reports/contributions/transactions", query: { refYear: String(new Date().getUTCFullYear()), ...(appliedUnitFilter ? { unitId: appliedUnitFilter } : {}) } },
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
            {!creatableUnitsLoading && creatableUnits.length === 0 ? (
              <InlineNotice className="mt-4" tone="warning" message="No units are currently eligible for residency creation. Transfer ownership from builder inventory to a real individual first." />
            ) : null}
            <div className="mt-4 grid gap-3">
              <select
                value={createState.unitId}
                onChange={(e) => setCreateState((prev) => ({ ...prev, unitId: e.target.value }))}
                disabled={!canMutate || unitsLoading || creatableUnitsLoading || crud.createLoading}
                className={!canMutate || unitsLoading || creatableUnitsLoading || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
              >
                <option value="">{unitsLoading || creatableUnitsLoading ? "Loading units..." : "Select unit"}</option>
                {creatableUnits.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitLabel(unit)}</option>)}
              </select>
              <select
                value={createState.indId}
                onChange={(e) => setCreateState((prev) => ({ ...prev, indId: e.target.value }))}
                disabled={!canMutate || individualsLoading || crud.createLoading}
                className={!canMutate || individualsLoading || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS}
              >
                <option value="">{individualsLoading ? "Loading individuals..." : "Select individual"}</option>
                {individuals.map((ind) => <option key={ind.id} value={ind.id}>{formatIndividualName(ind)}</option>)}
              </select>
              <input type="date" value={createState.fromDt} onChange={(e) => setCreateState((prev) => ({ ...prev, fromDt: e.target.value }))} disabled={!canMutate || crud.createLoading} className={!canMutate || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS} />
              <input type="date" value={createState.toDt} onChange={(e) => setCreateState((prev) => ({ ...prev, toDt: e.target.value }))} disabled={!canMutate || crud.createLoading} className={!canMutate || crud.createLoading ? INPUT_DISABLED_CLASS : INPUT_CLASS} />
              <button
                type="button"
                disabled={!canMutate || crud.createLoading || creatableUnitsLoading || !createState.unitId || !createState.indId || !createState.fromDt}
                onClick={() => {
                  void crud.create<ResidencyItem>({
                    endpoint: "/api/residencies",
                    body: { unitId: createState.unitId, indId: createState.indId, fromDt: createState.fromDt, toDt: createState.toDt.trim() ? createState.toDt : null },
                    errorMessage: "Unable to create residency.",
                    onSuccess: () => {
                      invalidateResidencyDependentLookups();
                      setCreateState(emptyFormState);
                      setSubmitSuccess("Residency record created.");
                      browse.setPage(1);
                      browse.reload();
                    },
                  });
                }}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Creating..." : "Create Residency"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<ResidencyItem>
              columns={[
                { header: "Unit", render: (item) => unitMap.get(item.unitId) ? formatUnitLabel(unitMap.get(item.unitId) as UnitOption) : item.unitId },
                { header: "Resident", render: (item) => individualMap.get(item.indId) ? formatIndividualName(individualMap.get(item.indId) as IndividualOption) : item.indId },
                { header: "From", render: (item) => toDateInputValue(item.fromDt) },
                {
                  header: "To",
                  render: (item) =>
                    editingResidencyId === item.id ? (
                      <input type="date" value={editingToDt} onChange={(e) => setEditingToDt(e.target.value)} disabled={saveLoading} className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
                    ) : (
                      toDateInputValue(item.toDt) || getTimelineStatus(item)
                    ),
                },
                {
                  header: "Actions",
                  render: (item) =>
                    canMutate ? (
                      editingResidencyId === item.id ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { void saveResidencyEndDate(item.id); }} disabled={saveLoading} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">{saveLoading ? "Saving..." : "Save"}</button>
                          <button type="button" onClick={cancelEditingResidency} disabled={saveLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => startEditingResidency(item)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Edit End</button>
                          <ContextLinkChips label="Go To" items={[
                            { href: { pathname: "/ownerships", query: { unitId: item.unitId, activeOnly: "true" } }, label: "Ownerships" },
                            { href: { pathname: "/contributions", query: { unitId: item.unitId, depositedBy: item.indId } }, label: "Contribution Capture" },
                            { href: { pathname: "/reports/contributions/transactions", query: { refYear: String(new Date().getUTCFullYear()), unitId: item.unitId } }, label: "Transactions" },
                          ]} />
                        </div>
                      )
                    ) : (
                      <div className="space-y-2">
                        <ContextLinkChips label="Go To" items={[
                          { href: { pathname: "/ownerships", query: { unitId: item.unitId, activeOnly: "true" } }, label: "Ownerships" },
                          { href: { pathname: "/contributions", query: { unitId: item.unitId, depositedBy: item.indId } }, label: "Contribution Capture" },
                          { href: { pathname: "/reports/contributions/transactions", query: { refYear: String(new Date().getUTCFullYear()), unitId: item.unitId } }, label: "Transactions" },
                        ]} />
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Locked</span>
                      </div>
                    ),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
              loadingMessage="Loading residencies..."
              emptyMessage="No residency records found for the current filter."
              rowKey={(item) => item.id}
            />
          </div>
        </div>
      </section>
    </div>
  );
}