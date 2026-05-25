"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BrowseFilterBar,
  BTN_SUBMIT,
  INPUT_CLASS,
  INPUT_DISABLED_CLASS,
} from "@/src/components/master-data/browse-filter-bar";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import {
  loadIndividualLookupsCached,
  loadUnitLookupsCached,
  type IndividualLookupOption,
  type UnitLookupOption,
} from "@/src/lib/master-data-lookups";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { formatUnitLabel } from "@/src/lib/unit-format";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComplaintCategory = { id: number; description: string };
type ComplaintPriority = { id: number; label: string; slaHours: number };

type ComplaintReporter = {
  id: string;
  fName: string;
  mName?: string | null;
  sName: string;
};

type ComplaintItem = {
  id: string;
  ticketId: string;
  title: string;
  isAnonymous: boolean;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  unit: { id: string; description: string; block: { description: string } };
  reporter: ComplaintReporter;
  category: { id: number; description: string };
  priority: { id: number; label: string; slaHours: number };
};

type SortOption = "createdAt" | "status" | "ticketId";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: "createdAt" as const, label: "Sort by created time" },
  { value: "status" as const, label: "Sort by status" },
  { value: "ticketId" as const, label: "Sort by ticket ID" },
];

const STATUS_OPTIONS = [
  "Open",
  "Assigned",
  "InProgress",
  "Resolved",
  "Closed",
  "Reopened",
] as const;

const STATUS_BADGE: Record<string, string> = {
  Open: "bg-amber-100 text-amber-800",
  Assigned: "bg-blue-100 text-blue-800",
  InProgress: "bg-indigo-100 text-indigo-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-100 text-slate-700",
  Reopened: "bg-rose-100 text-rose-800",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatName(ind: ComplaintReporter | null | undefined) {
  if (!ind) return "—";
  return [ind.fName, ind.mName ?? "", ind.sName].filter(Boolean).join(" ");
}

type SlaStatus = { label: string; className: string };

function computeSlaStatus(item: ComplaintItem): SlaStatus {
  const slaMs = item.priority.slaHours * 3_600_000;
  const createdMs = new Date(item.createdAt).getTime();
  const endMs = item.resolvedAt
    ? new Date(item.resolvedAt).getTime()
    : item.closedAt
      ? new Date(item.closedAt).getTime()
      : Date.now();
  const pct = (endMs - createdMs) / slaMs;

  if (item.status === "Resolved" || item.status === "Closed") {
    return pct > 1
      ? { label: "Breached", className: "bg-rose-50 text-rose-700" }
      : { label: "Met", className: "bg-emerald-50 text-emerald-700" };
  }
  if (pct >= 1) return { label: "Breached", className: "bg-rose-100 text-rose-700" };
  if (pct >= 0.8) return { label: "At Risk", className: "bg-amber-100 text-amber-700" };
  return { label: "On Track", className: "bg-emerald-100 text-emerald-700" };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ComplaintsPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";
  const isAdminOrManager =
    session.role === "SOCIETY_ADMIN" || session.role === "MANAGER";

  // Lookup data
  const [units, setUnits] = useState<UnitLookupOption[]>([]);
  const [individuals, setIndividuals] = useState<IndividualLookupOption[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [priorities, setPriorities] = useState<ComplaintPriority[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupsError, setLookupsError] = useState("");

  useEffect(() => {
    Promise.all([
      loadUnitLookupsCached(),
      loadIndividualLookupsCached(),
      fetchJsonWithRetry<ComplaintCategory[]>(
        "/api/complaints/categories",
        "Unable to load complaint categories."
      ),
      fetchJsonWithRetry<ComplaintPriority[]>(
        "/api/complaints/priorities",
        "Unable to load complaint priorities."
      ),
    ])
      .then(([u, inds, cats, pris]) => {
        setUnits(u);
        setIndividuals(inds);
        setCategories(cats);
        setPriorities(pris);
      })
      .catch((err: unknown) => {
        setLookupsError(err instanceof Error ? err.message : "Unable to load form options.");
      })
      .finally(() => setLookupsLoading(false));
  }, []);

  // Browse state
  const browse = useBrowseState<ComplaintItem, SortOption>({
    endpoint: "/api/complaints",
    errorMessage: "Unable to load complaints.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "createdAt",
    defaultSortDir: "desc",
    filters: [
      { key: "status" },
      { key: "unitId" },
      { key: "categoryId" },
      { key: "priorityId" },
    ],
  });

  const crud = useCrudActions({
    setSubmitError: browse.setSubmitError,
    setSubmitSuccess: browse.setSubmitSuccess,
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    unitId: "",
    reportedById: "",
    categoryId: "",
    priorityId: "",
    title: "",
    description: "",
    isAnonymous: false,
  });

  function resetCreateForm() {
    setCreateForm({
      unitId: "",
      reportedById: "",
      categoryId: "",
      priorityId: "",
      title: "",
      description: "",
      isAnonymous: false,
    });
  }

  function handleCreate() {
    void crud.create<ComplaintItem>({
      endpoint: "/api/complaints",
      body: {
        unitId: createForm.unitId,
        reportedById: createForm.reportedById,
        categoryId: Number(createForm.categoryId),
        priorityId: Number(createForm.priorityId),
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        isAnonymous: createForm.isAnonymous,
      },
      errorMessage: "Unable to submit complaint.",
      onSuccess: (data) => {
        resetCreateForm();
        browse.setSubmitSuccess(
          `Complaint submitted: ${data.ticketId} — ${data.title}`
        );
        browse.setPage(1);
      },
    });
  }

  const createDisabled =
    !canMutate ||
    crud.createLoading ||
    !createForm.unitId ||
    !createForm.reportedById ||
    !createForm.categoryId ||
    !createForm.priorityId ||
    createForm.title.trim().length === 0 ||
    createForm.description.trim().length === 0;

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice
        className="mt-4"
        mode="mutation"
        allowedRoles={["SOCIETY_ADMIN", "MANAGER"]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">
              CMM
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Complaints</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Submit and track resident complaints. Filter by status, category, or priority. Anonymous
              complaints mask reporter identity for read-only sessions.
            </p>
          </div>

          <BrowseFilterBar
            browse={browse as BrowseState<unknown, SortOption>}
            sortOptions={SORT_OPTIONS}
          >
            <select
              value={browse.filters["status"] ?? ""}
              onChange={(e) => browse.setFilter("status", e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={browse.filters["categoryId"] ?? ""}
              onChange={(e) => browse.setFilter("categoryId", e.target.value)}
              className={INPUT_CLASS}
              disabled={lookupsLoading}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.description}
                </option>
              ))}
            </select>

            <select
              value={browse.filters["unitId"] ?? ""}
              onChange={(e) => browse.setFilter("unitId", e.target.value)}
              className={INPUT_CLASS}
              disabled={lookupsLoading}
            >
              <option value="">All units</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatUnitLabel(u)}
                </option>
              ))}
            </select>

            <select
              value={browse.filters["priorityId"] ?? ""}
              onChange={(e) => browse.setFilter("priorityId", e.target.value)}
              className={INPUT_CLASS}
              disabled={lookupsLoading}
            >
              <option value="">All priorities</option>
              {priorities.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.label} ({p.slaHours}h SLA)
                </option>
              ))}
            </select>
          </BrowseFilterBar>
        </div>

        <NoticeStack
          submitError={browse.submitError}
          submitSuccess={browse.submitSuccess}
          loadError={browse.loadError || lookupsError}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Create form */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Submit Complaint</p>
            <p className="mt-1 text-sm text-slate-600">
              All fields are required. Anonymous complaints hide reporter identity from read-only
              sessions.
            </p>

            <div className="mt-4 grid gap-3">
              <select
                value={createForm.unitId}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, unitId: e.target.value }))
                }
                disabled={!canMutate || lookupsLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="">Select unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatUnitLabel(u)}
                  </option>
                ))}
              </select>

              <select
                value={createForm.reportedById}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, reportedById: e.target.value }))
                }
                disabled={!canMutate || lookupsLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="">Select reporter</option>
                {individuals.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {formatName(ind)}
                  </option>
                ))}
              </select>

              <select
                value={createForm.categoryId}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, categoryId: e.target.value }))
                }
                disabled={!canMutate || lookupsLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.description}
                  </option>
                ))}
              </select>

              <select
                value={createForm.priorityId}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, priorityId: e.target.value }))
                }
                disabled={!canMutate || lookupsLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="">Select priority</option>
                {priorities.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.label} ({p.slaHours}h SLA)
                  </option>
                ))}
              </select>

              <input
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Title (brief summary)"
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              />

              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description (full details)"
                rows={3}
                disabled={!canMutate || crud.createLoading}
                className={`${INPUT_DISABLED_CLASS} resize-none`}
              />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.isAnonymous}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, isAnonymous: e.target.checked }))
                  }
                  disabled={!canMutate || crud.createLoading}
                  className="h-4 w-4 rounded border-slate-300 accent-(--accent)"
                />
                Submit anonymously
              </label>

              <button
                type="button"
                disabled={createDisabled}
                onClick={handleCreate}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls
              page={browse.page}
              totalPages={browse.totalPages}
              totalItems={browse.totalItems}
              onPageChange={browse.setPage}
            />

            <DataTable<ComplaintItem>
              rowKey={(item) => item.id}
              columns={[
                {
                  header: "Ticket",
                  render: (item) => (
                    <Link
                      href={`/complaints/${item.id}`}
                      className="font-mono text-xs font-semibold text-(--accent) underline-offset-2 hover:underline"
                    >
                      {item.ticketId}
                    </Link>
                  ),
                },
                {
                  header: "Unit",
                  render: (item) => formatUnitLabel(item.unit),
                },
                {
                  header: "Title",
                  render: (item) => (
                    <span className="line-clamp-2 text-sm">{item.title}</span>
                  ),
                },
                {
                  header: "Category",
                  render: (item) => item.category.description,
                },
                {
                  header: "Priority",
                  render: (item) => (
                    <span className="text-xs font-semibold">
                      {item.priority.label}
                      <span className="ml-1 font-normal text-slate-500">
                        ({item.priority.slaHours}h)
                      </span>
                    </span>
                  ),
                },
                {
                  header: "SLA",
                  render: (item) => {
                    const sla = computeSlaStatus(item);
                    return (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sla.className}`}
                      >
                        {sla.label}
                      </span>
                    );
                  },
                },
                {
                  header: "Status",
                  render: (item) => (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[item.status] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {item.status}
                    </span>
                  ),
                },
                {
                  header: "Reporter",
                  render: (item) =>
                    item.isAnonymous && !isAdminOrManager
                      ? "Anonymous"
                      : formatName(item.reporter),
                },
                {
                  header: "Submitted",
                  render: (item) =>
                    new Date(item.createdAt).toLocaleDateString(),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
