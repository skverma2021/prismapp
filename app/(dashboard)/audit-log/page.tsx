"use client";

import { useState } from "react";

import { BrowseFilterBar, INPUT_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { DataTable } from "@/src/components/master-data/data-table";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useBrowseState } from "@/src/hooks/use-browse-state";

type AuditLogItem = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actorRole: string;
  actorUserId: string;
  payload: unknown;
};

type SortOption = "createdAt";

const SORT_OPTIONS = [{ value: "createdAt" as const, label: "Sort by time (newest first)" }];

const KNOWN_ACTIONS = [
  "BLOCK_CREATED",
  "BLOCK_UPDATED",
  "UNIT_CREATED",
  "UNIT_UPDATED",
  "INDIVIDUAL_CREATED",
  "INDIVIDUAL_UPDATED",
  "OWNERSHIP_CREATED",
  "OWNERSHIP_TRANSFERRED",
  "RESIDENCY_CREATED",
  "RESIDENCY_ENDED",
  "CONTRIBUTION_CREATED",
  "CONTRIBUTION_CORRECTION_CREATED",
  "CONTRIBUTION_HEAD_CREATED",
  "CONTRIBUTION_HEAD_UPDATED",
  "CONTRIBUTION_RATE_CREATED",
  "CONTRIBUTION_PERIOD_CREATED",
];

const KNOWN_ENTITY_TYPES = [
  "Block",
  "Unit",
  "Individual",
  "UnitOwner",
  "UnitResident",
  "ContributionHead",
  "ContributionRate",
  "ContributionPeriod",
  "Contribution",
];

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function PayloadCell({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>;
  }
  const text = JSON.stringify(value, null, 2);
  const preview = JSON.stringify(value).slice(0, 60);
  const truncated = preview.length >= 60;
  return (
    <span>
      {open ? (
        <span>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs text-slate-700">{text}</pre>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 text-xs text-slate-500 underline"
          >
            collapse
          </button>
        </span>
      ) : (
        <span>
          <span className="font-mono text-xs text-slate-600">
            {preview}
            {truncated && "…"}
          </span>
          {truncated && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ml-1 text-xs text-slate-500 underline"
            >
              expand
            </button>
          )}
        </span>
      )}
    </span>
  );
}

const COLUMNS = [
  {
    header: "Time",
    render: (item: AuditLogItem) => (
      <span className="whitespace-nowrap font-mono text-xs text-slate-700">
        {formatTimestamp(item.createdAt)}
      </span>
    ),
    className: "w-44",
  },
  {
    header: "Action",
    render: (item: AuditLogItem) => (
      <span className="font-mono text-xs font-medium text-slate-800">{item.action}</span>
    ),
  },
  {
    header: "Entity",
    render: (item: AuditLogItem) => (
      <span className="text-xs text-slate-700">
        {item.entityType}
        <span className="ml-1 text-slate-400">·</span>
        <span className="ml-1 font-mono text-slate-500">{item.entityId}</span>
      </span>
    ),
  },
  {
    header: "Actor",
    render: (item: AuditLogItem) => (
      <span className="text-xs text-slate-700">
        <span className="font-medium">{item.actorRole}</span>
        <span className="ml-1 text-slate-400">·</span>
        <span className="ml-1 font-mono text-slate-500">{item.actorUserId}</span>
      </span>
    ),
  },
  {
    header: "Payload",
    render: (item: AuditLogItem) => <PayloadCell value={item.payload} />,
    className: "max-w-xs",
  },
];

export default function AuditLogPage() {
  const browse = useBrowseState<AuditLogItem, SortOption>({
    endpoint: "/api/audit-log",
    errorMessage: "Unable to load audit log.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "createdAt",
    defaultSortDir: "desc",
    filters: [{ key: "action" }, { key: "entityType" }, { key: "actorUserId" }],
  });

  return (
    <div className="space-y-4">
      <SessionContextNotice mode="report" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Audit Log</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Read-only record of all mutations performed by operators.
          </p>
        </div>
      </div>

      {browse.loadError && (
        <InlineNotice tone="danger" title="Load error" message={browse.loadError} />
      )}

      <BrowseFilterBar browse={browse as Parameters<typeof BrowseFilterBar>[0]["browse"]} sortOptions={SORT_OPTIONS}>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={browse.filters.action ?? ""}
            onChange={(e) => browse.setFilter("action", e.target.value)}
            className={INPUT_CLASS}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={browse.filters.entityType ?? ""}
            onChange={(e) => browse.setFilter("entityType", e.target.value)}
            className={INPUT_CLASS}
            aria-label="Filter by entity type"
          >
            <option value="">All entity types</option>
            {KNOWN_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={browse.filters.actorUserId ?? ""}
            onChange={(e) => browse.setFilter("actorUserId", e.target.value)}
            placeholder="Filter by actor user ID"
            className={INPUT_CLASS}
            aria-label="Filter by actor user ID"
          />
        </div>
      </BrowseFilterBar>

      <DataTable
        columns={COLUMNS}
        items={browse.items}
        loading={browse.loading}
        loadingMessage="Loading audit log entries…"
        emptyMessage="No audit log entries match the current filters."
        rowKey={(item) => item.id}
      />

      <PaginationControls
        page={browse.page}
        totalPages={browse.totalPages}
        totalItems={browse.totalItems}
        onPageChange={browse.setPage}
      />
    </div>
  );
}
