"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJsonWithRetry } from "@/src/lib/paginated-client";

type ComplaintSummary = {
  openCount: number;
  breachedCount: number;
  oldestOpenAgeHours: number;
};

function ageLabel(hours: number): string {
  if (hours === 0) return "—";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function ComplaintSummaryCard() {
  const [summary, setSummary] = useState<ComplaintSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJsonWithRetry<ComplaintSummary>(
      "/api/complaints/summary",
      "Unable to load complaint summary."
    )
      .then(setSummary)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unable to load complaint summary.")
      );
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--accent-strong)">
          CMM
        </p>
        <Link
          href="/complaints"
          className="text-xs font-medium text-(--accent) hover:underline underline-offset-2"
        >
          View all →
        </Link>
      </div>

      <h3 className="mt-2 text-base font-semibold text-slate-900">Complaints</h3>

      {error ? (
        <p className="mt-3 text-xs text-red-600">{error}</p>
      ) : !summary ? (
        <p className="mt-3 text-xs text-slate-400">Loading…</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-slate-900">{summary.openCount}</p>
            <p className="mt-0.5 text-xs text-slate-500">Open</p>
          </div>
          <div
            className={`rounded-xl px-3 py-2 text-center ${
              summary.breachedCount > 0 ? "bg-rose-50" : "bg-slate-50"
            }`}
          >
            <p
              className={`text-xl font-bold ${
                summary.breachedCount > 0 ? "text-rose-700" : "text-slate-900"
              }`}
            >
              {summary.breachedCount}
            </p>
            <p
              className={`mt-0.5 text-xs ${
                summary.breachedCount > 0 ? "text-rose-500" : "text-slate-500"
              }`}
            >
              Breached
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-slate-900">
              {ageLabel(summary.oldestOpenAgeHours)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Oldest open</p>
          </div>
        </div>
      )}
    </div>
  );
}
