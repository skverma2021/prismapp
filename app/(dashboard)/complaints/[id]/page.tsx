"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import {
  loadIndividualLookupsCached,
  type IndividualLookupOption,
} from "@/src/lib/master-data-lookups";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { formatUnitLabel } from "@/src/lib/unit-format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComplaintNote = {
  id: string;
  content: string;
  visibility: string; // Internal | Resident
  actorUserId: string;
  actorRole: string;
  createdAt: string;
};

type ComplaintDetail = {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  status: string;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  unit: { id: string; description: string; block: { description: string } };
  reporter: { id: string; fName: string; mName?: string | null; sName: string };
  assignee: { id: string; fName: string; mName?: string | null; sName: string } | null;
  category: { id: number; description: string };
  priority: { id: number; label: string; slaHours: number };
  notes: ComplaintNote[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  Open: "bg-amber-100 text-amber-800",
  Assigned: "bg-blue-100 text-blue-800",
  InProgress: "bg-indigo-100 text-indigo-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-100 text-slate-700",
  Reopened: "bg-rose-100 text-rose-800",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  Open: ["Assigned", "InProgress", "Closed"],
  Assigned: ["InProgress", "Closed"],
  InProgress: ["Resolved", "Closed"],
  Resolved: ["Closed", "Reopened"],
  Closed: [],
  Reopened: ["Assigned", "InProgress", "Closed"],
};

const TRANSITION_LABELS: Record<string, string> = {
  Assigned: "Mark Assigned",
  InProgress: "Start Work",
  Resolved: "Mark Resolved",
  Closed: "Close",
  Reopened: "Reopen",
};

const TRANSITION_STYLES: Record<string, string> = {
  Assigned: "bg-blue-600 hover:bg-blue-700 text-white",
  InProgress: "bg-indigo-600 hover:bg-indigo-700 text-white",
  Resolved: "bg-emerald-600 hover:bg-emerald-700 text-white",
  Closed: "bg-slate-500 hover:bg-slate-600 text-white",
  Reopened: "bg-rose-600 hover:bg-rose-700 text-white",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatName(
  ind: { fName: string; mName?: string | null; sName: string } | null | undefined
) {
  if (!ind) return "—";
  return [ind.fName, ind.mName ?? "", ind.sName].filter(Boolean).join(" ");
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function ageLabel(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuthSession();
  const isAdminOrManager =
    session.role === "SOCIETY_ADMIN" || session.role === "MANAGER";

  // ---------------------------------------------------------------------------
  // Complaint state
  // ---------------------------------------------------------------------------

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadComplaint = useCallback(() => {
    setLoading(true);
    fetchJsonWithRetry<ComplaintDetail>(
      `/api/complaints/${id}`,
      "Unable to load complaint."
    )
      .then(setComplaint)
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : "Unable to load complaint.")
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadComplaint(); }, [loadComplaint]);

  // ---------------------------------------------------------------------------
  // Individuals (for assignee picker)
  // ---------------------------------------------------------------------------

  const [individuals, setIndividuals] = useState<IndividualLookupOption[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  useEffect(() => {
    loadIndividualLookupsCached()
      .then(setIndividuals)
      .catch(() => {/* non-critical — assignee picker just shows empty */})
      .finally(() => setLookupsLoading(false));
  }, []);

  // ---------------------------------------------------------------------------
  // Reopen deadline check
  // ---------------------------------------------------------------------------

  const reopenAllowed =
    complaint?.status === "Resolved" &&
    complaint.reopenDeadline !== null &&
    new Date() < new Date(complaint.reopenDeadline);

  const reopenDeadlineLabel = complaint?.reopenDeadline
    ? `Reopen deadline: ${formatDate(complaint.reopenDeadline)}`
    : "";

  // ---------------------------------------------------------------------------
  // Status transitions
  // ---------------------------------------------------------------------------

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  function dismissActionNotice() {
    setActionError("");
    setActionSuccess("");
  }

  async function patchComplaint(body: Record<string, unknown>) {
    setActionLoading(true);
    dismissActionNotice();
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; data?: ComplaintDetail; message?: string };
      if (!json.ok) {
        setActionError(json.message ?? "Request failed.");
        return;
      }
      if (json.data) setComplaint(json.data);
      setActionSuccess("Updated successfully.");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleStatusTransition(toStatus: string) {
    void patchComplaint({ status: toStatus });
  }

  // ---------------------------------------------------------------------------
  // Assignee picker
  // ---------------------------------------------------------------------------

  const [assigneePickerValue, setAssigneePickerValue] = useState<string>("");
  const assigneeInitialised = useRef(false);

  useEffect(() => {
    if (complaint && !assigneeInitialised.current) {
      setAssigneePickerValue(complaint.assignee?.id ?? "");
      assigneeInitialised.current = true;
    }
  }, [complaint]);

  function handleAssigneeChange(newAssigneeId: string) {
    setAssigneePickerValue(newAssigneeId);
    void patchComplaint({ assignedToId: newAssigneeId === "" ? null : newAssigneeId });
  }

  // ---------------------------------------------------------------------------
  // Add note
  // ---------------------------------------------------------------------------

  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"Resident" | "Internal">("Resident");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [noteSuccess, setNoteSuccess] = useState("");

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setNoteLoading(true);
    setNoteError("");
    setNoteSuccess("");
    try {
      const res = await fetch("/api/complaints/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: id,
          content: noteContent.trim(),
          visibility: noteVisibility,
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: ComplaintNote; message?: string };
      if (!json.ok) {
        setNoteError(json.message ?? "Failed to add note.");
        return;
      }
      setNoteContent("");
      setNoteSuccess("Note added.");
      // Refresh complaint to get updated notes list
      loadComplaint();
    } catch {
      setNoteError("Network error. Please try again.");
    } finally {
      setNoteLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const INPUT_CLASS =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--accent)/20";

  const BTN_BASE =
    "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  // Filter notes by role: READ_ONLY sees only Resident notes
  const visibleNotes = complaint?.notes.filter(
    (n) => isAdminOrManager || n.visibility === "Resident"
  ) ?? [];

  // Determine which transition buttons to show (suppress Reopened if window closed)
  const availableTransitions = complaint
    ? (VALID_TRANSITIONS[complaint.status] ?? []).filter(
        (t) => t !== "Reopened" || reopenAllowed
      )
    : [];

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        <MasterDataNav />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading complaint…
        </div>
      </div>
    );
  }

  if (loadError || !complaint) {
    return (
      <div className="space-y-4">
        <MasterDataNav />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {loadError || "Complaint not found."}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice
        className="mt-4"
        mode="mutation"
        allowedRoles={["SOCIETY_ADMIN", "MANAGER"]}
      />

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Breadcrumb */}
        <nav className="mb-4 text-xs text-slate-500">
          <Link href="/complaints" className="hover:underline text-(--accent)">
            Complaints
          </Link>
          <span className="mx-1">›</span>
          <span className="font-mono font-semibold text-slate-700">{complaint.ticketId}</span>
        </nav>

        {/* Hero row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-semibold text-slate-500">
              {complaint.ticketId}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[complaint.status] ?? "bg-slate-100 text-slate-700"}`}
            >
              {complaint.status}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {complaint.priority.label} · {complaint.priority.slaHours}h SLA
            </span>
          </div>
          <span className="text-xs text-slate-400">{ageLabel(complaint.createdAt)}</span>
        </div>

        <h1 className="mt-3 text-xl font-semibold text-slate-900">{complaint.title}</h1>
        <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{complaint.description}</p>

        {/* Action / status notices */}
        {actionError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{actionError}</p>
        )}
        {actionSuccess && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {actionSuccess}
          </p>
        )}
        {reopenDeadlineLabel && complaint.status === "Resolved" && (
          <p className="mt-2 text-xs text-slate-400">{reopenDeadlineLabel}</p>
        )}

        {/* Status transition buttons (MANAGER/ADMIN only) */}
        {isAdminOrManager && availableTransitions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {availableTransitions.map((toStatus) => (
              <button
                key={toStatus}
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusTransition(toStatus)}
                className={`${BTN_BASE} ${TRANSITION_STYLES[toStatus] ?? "bg-slate-500 text-white"}`}
              >
                {TRANSITION_LABELS[toStatus] ?? toStatus}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Details + Notes two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left: Details card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Details</h2>

          <dl className="mt-4 grid gap-3 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <dt className="text-slate-500">Unit</dt>
              <dd className="font-medium text-slate-900">{formatUnitLabel(complaint.unit)}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <dt className="text-slate-500">Category</dt>
              <dd className="font-medium text-slate-900">{complaint.category.description}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <dt className="text-slate-500">Priority</dt>
              <dd className="font-medium text-slate-900">
                {complaint.priority.label} ({complaint.priority.slaHours}h)
              </dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <dt className="text-slate-500">Reporter</dt>
              <dd className="font-medium text-slate-900">
                {complaint.isAnonymous && !isAdminOrManager
                  ? "Anonymous"
                  : formatName(complaint.reporter)}
                {complaint.isAnonymous && isAdminOrManager && (
                  <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700">
                    Anon
                  </span>
                )}
              </dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <dt className="text-slate-500">Assignee</dt>
              {isAdminOrManager ? (
                <dd>
                  <select
                    value={assigneePickerValue}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    disabled={actionLoading || lookupsLoading || complaint.status === "Closed"}
                    className={`${INPUT_CLASS} py-1`}
                  >
                    <option value="">Unassigned</option>
                    {individuals.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {[ind.fName, ind.mName ?? "", ind.sName].filter(Boolean).join(" ")}
                      </option>
                    ))}
                  </select>
                </dd>
              ) : (
                <dd className="font-medium text-slate-900">{formatName(complaint.assignee)}</dd>
              )}
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <dt className="text-slate-500">Submitted</dt>
              <dd className="font-medium text-slate-900">{formatDate(complaint.createdAt)}</dd>
            </div>
            {complaint.resolvedAt && (
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <dt className="text-slate-500">Resolved</dt>
                <dd className="font-medium text-slate-900">{formatDate(complaint.resolvedAt)}</dd>
              </div>
            )}
            {complaint.closedAt && (
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <dt className="text-slate-500">Closed</dt>
                <dd className="font-medium text-slate-900">{formatDate(complaint.closedAt)}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Right: Notes thread */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Notes{visibleNotes.length > 0 ? ` (${visibleNotes.length})` : ""}
          </h2>

          {/* Notes list */}
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {visibleNotes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes yet.</p>
            ) : (
              visibleNotes.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-xl border p-3 text-sm ${
                    note.visibility === "Internal"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-500">
                      {note.actorRole} · {new Date(note.createdAt).toLocaleString()}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        note.visibility === "Internal"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {note.visibility}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-700">{note.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Add note form — all roles can add Resident notes; only MANAGER/ADMIN can add Internal */}
          {complaint.status !== "Closed" && (
            <form onSubmit={(e) => void handleAddNote(e)} className="mt-4 space-y-2">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write a note…"
                rows={3}
                disabled={noteLoading}
                className={`${INPUT_CLASS} resize-none`}
              />
              <div className="flex items-center gap-2">
                {isAdminOrManager && (
                  <select
                    value={noteVisibility}
                    onChange={(e) =>
                      setNoteVisibility(e.target.value as "Resident" | "Internal")
                    }
                    disabled={noteLoading}
                    className={`${INPUT_CLASS} w-36`}
                  >
                    <option value="Resident">Resident</option>
                    <option value="Internal">Internal</option>
                  </select>
                )}
                <button
                  type="submit"
                  disabled={noteLoading || !noteContent.trim()}
                  className="rounded-lg bg-(--accent) px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  {noteLoading ? "Adding…" : "Add Note"}
                </button>
              </div>
              {noteError && (
                <p className="text-xs text-red-600">{noteError}</p>
              )}
              {noteSuccess && (
                <p className="text-xs text-emerald-600">{noteSuccess}</p>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
