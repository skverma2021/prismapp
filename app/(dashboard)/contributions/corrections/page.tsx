"use client";

import { useEffect, useState } from "react";

import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useSafeAuthSession } from "@/src/lib/auth-session";

type CorrectionPeriod = {
  amt: string | number;
  contributionPeriod: { refYear: number; refMonth: number | null };
};

type PendingCorrection = {
  id: number;
  correctionOfContributionId: number;
  correctionReasonCode: string | null;
  correctionReasonText: string | null;
  correctionStatus: string;
  transactionId: string;
  transactionDateTime: string;
  actorUserId: string | null;
  actorRole: string | null;
  createdAt: string;
  unit: {
    id: string;
    description: string;
    block: { description: string };
  };
  contributionHead: { id: number; description: string };
  details: CorrectionPeriod[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function periodLabel(p: CorrectionPeriod["contributionPeriod"]) {
  if (p.refMonth) {
    const d = new Date(p.refYear, p.refMonth - 1);
    return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
  }
  return String(p.refYear);
}

function netAmt(details: CorrectionPeriod[]) {
  return details.reduce((s, d) => s + Number(d.amt), 0);
}

export default function PendingCorrectionsPage() {
  const { session } = useSafeAuthSession();
  const [corrections, setCorrections] = useState<PendingCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectionText, setRejectionText] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/contributions/corrections/pending")
      .then((r) => r.json() as Promise<{ data?: PendingCorrection[]; error?: { message: string } }>)
      .then((j) => {
        if (j.data) setCorrections(j.data);
        else setLoadError(j.error?.message ?? "Failed to load pending corrections.");
      })
      .catch(() => setLoadError("Network error loading pending corrections."))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: number) {
    setActionError(null);
    setActionSuccess(null);
    setPendingAction(id);
    try {
      const r = await fetch(`/api/contributions/corrections/${id}/approve`, { method: "POST" });
      const j = await r.json() as { data?: unknown; error?: { message: string } };
      if (!r.ok) {
        setActionError(j.error?.message ?? "Approval failed.");
      } else {
        setCorrections((prev) => prev.filter((c) => c.id !== id));
        setActionSuccess(`Correction #${id} approved and posted.`);
      }
    } catch {
      setActionError("Network error during approval.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReject(id: number) {
    const reason = (rejectionText[id] ?? "").trim();
    if (!reason) {
      setActionError("Please enter a rejection reason before rejecting.");
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    setPendingAction(id);
    try {
      const r = await fetch(`/api/contributions/corrections/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const j = await r.json() as { data?: unknown; error?: { message: string } };
      if (!r.ok) {
        setActionError(j.error?.message ?? "Rejection failed.");
      } else {
        setCorrections((prev) => prev.filter((c) => c.id !== id));
        setRejectionText((prev) => { const n = { ...prev }; delete n[id]; return n; });
        setActionSuccess(`Correction #${id} rejected.`);
      }
    } catch {
      setActionError("Network error during rejection.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice className="mt-4" mode="mutation" allowedRoles={["SOCIETY_ADMIN"]} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">
          Audit &amp; Immutability
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Pending Corrections</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Corrections submitted by another operator and awaiting your approval. You cannot approve your own submissions.
          Approving posts the correction and counts it in reports. Rejecting removes it from the queue; the original
          contribution becomes correctable again.
        </p>

        {actionError && (
          <InlineNotice tone="danger" message={actionError} className="mt-4" />
        )}
        {actionSuccess && (
          <InlineNotice tone="success" message={actionSuccess} className="mt-4" />
        )}

        {loadError && (
          <InlineNotice tone="danger" message={loadError} className="mt-4" />
        )}

        {loading && (
          <p className="mt-6 text-sm text-slate-500">Loading&hellip;</p>
        )}

        {!loading && !loadError && corrections.length === 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No corrections are pending approval.
          </div>
        )}

        {corrections.length > 0 && (
          <div className="mt-6 space-y-4">
            {corrections.map((c) => {
              const isSelf = session?.userId === c.actorUserId;
              const isActing = pendingAction === c.id;
              const net = netAmt(c.details);

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-5"
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        PENDING
                      </span>
                      <span className="ml-2 text-xs text-slate-500">Correction #{c.id}</span>
                      <span className="mx-1 text-xs text-slate-400">&middot;</span>
                      <span className="text-xs text-slate-500">of #{c.correctionOfContributionId}</span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
                  </div>

                  {/* Details grid */}
                  <div className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Unit</p>
                      <p className="text-slate-800">
                      {c.unit.block.description} {"\u2014"} {c.unit.description}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Head</p>
                      <p className="text-slate-800">{c.contributionHead.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Net amount</p>
                      <p className={`font-semibold ${net < 0 ? "text-red-600" : "text-green-700"}`}>
                        {net < 0 ? "\u2212" : "+"}{Math.abs(net).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Reason</p>
                      <p className="text-slate-800">
                        {c.correctionReasonCode ?? "—"}
                        {c.correctionReasonText ? ` — ${c.correctionReasonText}` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Submitted by</p>
                      <p className="text-slate-800">
                        {c.actorUserId ?? "unknown"}
                        {isSelf && (
                          <span className="ml-1 rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-600">you</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Periods affected</p>
                      <p className="text-slate-800 text-xs">
                        {c.details.map((d) => periodLabel(d.contributionPeriod)).join(", ") || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Self-submission warning */}
                  {isSelf && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      You submitted this correction. A different user must approve or reject it.
                    </div>
                  )}

                  {/* Actions */}
                  {!isSelf && (
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => void handleApprove(c.id)}
                        className="rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {isActing ? "Processing…" : "Approve"}
                      </button>

                      <div className="flex flex-1 items-end gap-2">
                        <input
                          type="text"
                          value={rejectionText[c.id] ?? ""}
                          onChange={(e) =>
                            setRejectionText((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          placeholder="Rejection reason (required)"
                          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={isActing || !(rejectionText[c.id] ?? "").trim()}
                          onClick={() => void handleReject(c.id)}
                          className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {isActing ? "Processing…" : "Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
