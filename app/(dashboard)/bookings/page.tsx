"use client";

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
  type IndividualLookupOption,
} from "@/src/lib/master-data-lookups";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Resource = { id: number; name: string; capacity: number | null };

type BookingItem = {
  id: string;
  title: string;
  purpose: string | null;
  startDt: string;
  endDt: string;
  guestCount: number;
  status: string;
  createdAt: string;
  resource: { id: number; name: string };
  requestedBy: { id: string; fName: string; sName: string };
};

type SortOption = "startDt" | "createdAt" | "status";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: "startDt" as const, label: "Sort by start time" },
  { value: "createdAt" as const, label: "Sort by submitted" },
  { value: "status" as const, label: "Sort by status" },
];

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Cancelled"] as const;

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatName(ind: IndividualLookupOption | null | undefined) {
  if (!ind) return "—";
  const parts = [ind.fName, ind.mName ?? "", ind.sName].filter(Boolean);
  return parts.join(" ");
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BookingsPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  // Lookup data
  const [resources, setResources] = useState<Resource[]>([]);
  const [individuals, setIndividuals] = useState<IndividualLookupOption[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupsError, setLookupsError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJsonWithRetry<Resource[]>("/api/resources", "Unable to load resources."),
      loadIndividualLookupsCached(),
    ])
      .then(([res, inds]) => {
        setResources(res);
        setIndividuals(inds);
      })
      .catch((err: unknown) => {
        setLookupsError(err instanceof Error ? err.message : "Unable to load form options.");
      })
      .finally(() => setLookupsLoading(false));
  }, []);

  // Browse state
  const browse = useBrowseState<BookingItem, SortOption>({
    endpoint: "/api/bookings",
    errorMessage: "Unable to load bookings.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "startDt",
    defaultSortDir: "asc",
    filters: [{ key: "status" }, { key: "resourceId" }],
  });

  const crud = useCrudActions({
    setSubmitError: browse.setSubmitError,
    setSubmitSuccess: browse.setSubmitSuccess,
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    resourceId: "",
    requestedById: "",
    title: "",
    purpose: "",
    startDt: "",
    endDt: "",
    guestCount: "0",
  });

  function resetCreateForm() {
    setCreateForm({
      resourceId: "",
      requestedById: "",
      title: "",
      purpose: "",
      startDt: "",
      endDt: "",
      guestCount: "0",
    });
  }

  function handleCreate() {
    void crud.create<BookingItem>({
      endpoint: "/api/bookings",
      body: {
        resourceId: Number(createForm.resourceId),
        requestedById: createForm.requestedById,
        title: createForm.title.trim(),
        purpose: createForm.purpose.trim() || undefined,
        startDt: createForm.startDt,
        endDt: createForm.endDt,
        guestCount: Number(createForm.guestCount),
      },
      errorMessage: "Unable to submit booking request.",
      onSuccess: (data) => {
        resetCreateForm();
        browse.setSubmitSuccess(`Booking submitted: "${data.title}" — ${data.status}`);
        browse.setPage(1);
      },
    });
  }

  const createDisabled =
    !canMutate ||
    crud.createLoading ||
    !createForm.resourceId ||
    !createForm.requestedById ||
    !createForm.title.trim() ||
    !createForm.startDt ||
    !createForm.endDt;

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
              Events
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Bookings</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Request use of shared resources — Common Hall, Gym, Swimming Pool, Yoga Room.
              Admins and Managers can approve, reject, or cancel bookings.
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
              value={browse.filters["resourceId"] ?? ""}
              onChange={(e) => browse.setFilter("resourceId", e.target.value)}
              className={INPUT_CLASS}
              disabled={lookupsLoading}
            >
              <option value="">All resources</option>
              {resources.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                  {r.capacity !== null ? ` (max ${r.capacity})` : ""}
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
            <p className="text-sm font-semibold text-slate-900">New Booking Request</p>
            <p className="mt-1 text-sm text-slate-600">
              Bookings start as Pending and must be approved before the slot is confirmed.
            </p>

            <div className="mt-4 grid gap-3">
              <select
                value={createForm.resourceId}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, resourceId: e.target.value }))
                }
                disabled={!canMutate || lookupsLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="">Select resource</option>
                {resources.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                    {r.capacity !== null ? ` (max ${r.capacity})` : ""}
                  </option>
                ))}
              </select>

              <select
                value={createForm.requestedById}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, requestedById: e.target.value }))
                }
                disabled={!canMutate || lookupsLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="">Select resident / owner</option>
                {individuals.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {formatName(ind)}
                  </option>
                ))}
              </select>

              <input
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Event title"
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              />

              <textarea
                value={createForm.purpose}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, purpose: e.target.value }))
                }
                placeholder="Purpose / description (optional)"
                rows={2}
                disabled={!canMutate || crud.createLoading}
                className={`${INPUT_DISABLED_CLASS} resize-none`}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Start</label>
                  <input
                    type="datetime-local"
                    value={createForm.startDt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, startDt: e.target.value }))
                    }
                    disabled={!canMutate || crud.createLoading}
                    className={INPUT_DISABLED_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">End</label>
                  <input
                    type="datetime-local"
                    value={createForm.endDt}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, endDt: e.target.value }))
                    }
                    disabled={!canMutate || crud.createLoading}
                    className={INPUT_DISABLED_CLASS}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Expected guests
                </label>
                <input
                  type="number"
                  min="0"
                  value={createForm.guestCount}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, guestCount: e.target.value }))
                  }
                  disabled={!canMutate || crud.createLoading}
                  className={INPUT_DISABLED_CLASS}
                />
              </div>

              <button
                type="button"
                disabled={createDisabled}
                onClick={handleCreate}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Submitting..." : "Request Booking"}
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

            <DataTable<BookingItem>
              rowKey={(item) => item.id}
              columns={[
                {
                  header: "Title",
                  render: (item) => (
                    <span className="line-clamp-1 text-sm font-medium">{item.title}</span>
                  ),
                },
                {
                  header: "Resource",
                  render: (item) => item.resource.name,
                },
                {
                  header: "When",
                  render: (item) => (
                    <span className="whitespace-nowrap text-xs text-slate-600">
                      {formatDt(item.startDt)}
                      <br />→ {formatDt(item.endDt)}
                    </span>
                  ),
                },
                {
                  header: "Requested by",
                  render: (item) =>
                    [item.requestedBy.fName, item.requestedBy.sName]
                      .filter(Boolean)
                      .join(" "),
                },
                {
                  header: "Guests",
                  render: (item) => item.guestCount,
                },
                {
                  header: "Status",
                  render: (item) => (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[item.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {item.status}
                    </span>
                  ),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
              emptyMessage="No bookings found."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
