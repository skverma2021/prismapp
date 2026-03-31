"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
      };
    };

type HeadOption = {
  id: number;
  description: string;
};

type BlockOption = {
  id: string;
  description: string;
};

type MatrixStatus = "Paid" | "Unpaid" | "N/A";

type MatrixRow = {
  unitId: string;
  unitDescription: string;
  blockId: string;
  blockDescription: string;
  ownerName: string | null;
  residentName: string | null;
  jan: MatrixStatus;
  feb: MatrixStatus;
  mar: MatrixStatus;
  apr: MatrixStatus;
  may: MatrixStatus;
  jun: MatrixStatus;
  jul: MatrixStatus;
  aug: MatrixStatus;
  sep: MatrixStatus;
  oct: MatrixStatus;
  nov: MatrixStatus;
  dec: MatrixStatus;
  paidMonthsCount: number;
  unpaidMonthsCount: number;
};

type MatrixResponse = {
  refYear: number;
  headId: number;
  headDescription: string;
  periodType: "MONTH" | "YEAR";
  rows: MatrixRow[];
  totals: {
    totalUnits: number;
    totalPaidCells: number;
    totalUnpaidCells: number;
    collectionAmount: number;
    expectedAmount: number;
    activeRate: number;
  };
};

type FiltersState = {
  refYear: number;
  headId: "" | number;
  blockId: string;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybeError = (payload as { error?: { message?: string } }).error;
  return maybeError?.message ?? fallback;
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <p className="font-semibold">Report request failed</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function statusClassName(status: MatrixStatus) {
  if (status === "Paid") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Unpaid") {
    return "bg-amber-50 text-amber-800";
  }

  return "bg-slate-100 text-slate-500";
}

export default function ContributionPaidUnpaidMatrixPage() {
  const currentYear = new Date().getUTCFullYear();

  const [actorUserId, setActorUserId] = useState("ui-readonly-1");
  const [actorRole, setActorRole] = useState<"SOCIETY_ADMIN" | "MANAGER" | "READ_ONLY">("READ_ONLY");

  const [heads, setHeads] = useState<HeadOption[]>([]);
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [filters, setFilters] = useState<FiltersState>({
    refYear: currentYear,
    headId: "",
    blockId: "",
  });

  const [report, setReport] = useState<MatrixResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      setOptionsLoading(true);
      setRequestError("");

      try {
        const [headsRes, blocksRes] = await Promise.all([
          fetch("/api/contribution-heads?page=1&pageSize=100&sortBy=description&sortDir=asc"),
          fetch("/api/blocks?page=1&pageSize=100&sortBy=description&sortDir=asc"),
        ]);

        const [headsJson, blocksJson] = await Promise.all([headsRes.json(), blocksRes.json()]);

        const headItems = (headsJson?.data?.items ?? []) as HeadOption[];
        setHeads(headItems);
        setBlocks((blocksJson?.data?.items ?? []) as BlockOption[]);

        if (headItems.length > 0) {
          setFilters((prev) => ({
            ...prev,
            headId: prev.headId === "" ? headItems[0].id : prev.headId,
          }));
        }
      } catch {
        setRequestError("Unable to load report filter options.");
      } finally {
        setOptionsLoading(false);
      }
    }

    void loadOptions();
  }, []);

  const canRun = useMemo(() => filters.headId !== "" && actorUserId.trim().length > 0, [filters.headId, actorUserId]);

  async function runReport() {
    if (!canRun) {
      return;
    }

    setReportLoading(true);
    setRequestError("");

    try {
      const params = new URLSearchParams();
      params.set("refYear", String(filters.refYear));
      params.set("headId", String(filters.headId));

      if (filters.blockId.trim().length > 0) {
        params.set("blockId", filters.blockId.trim());
      }

      const response = await fetch(`/api/reports/contributions/paid-unpaid-matrix?${params.toString()}`, {
        headers: {
          "x-user-id": actorUserId.trim(),
          "x-user-role": actorRole,
        },
      });

      const payload = (await response.json()) as ApiEnvelope<MatrixResponse>;

      if (!response.ok || !payload.ok) {
        throw new Error(getErrorMessage(payload, "Unable to load paid/unpaid matrix."));
      }

      setReport(payload.data);
    } catch (error) {
      setReport(null);
      setRequestError(error instanceof Error ? error.message : "Unable to load paid/unpaid matrix.");
    } finally {
      setReportLoading(false);
    }
  }

  async function exportCsv() {
    if (!canRun) {
      return;
    }

    setCsvLoading(true);
    setRequestError("");

    try {
      const params = new URLSearchParams();
      params.set("refYear", String(filters.refYear));
      params.set("headId", String(filters.headId));

      if (filters.blockId.trim().length > 0) {
        params.set("blockId", filters.blockId.trim());
      }

      const response = await fetch(`/api/reports/contributions/paid-unpaid-matrix.csv?${params.toString()}`, {
        headers: {
          "x-user-id": actorUserId.trim(),
          "x-user-role": actorRole,
        },
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(getErrorMessage(payload, "Unable to export CSV."));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contribution-paid-unpaid-matrix-${filters.refYear}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to export CSV.");
    } finally {
      setCsvLoading(false);
    }
  }

  useEffect(() => {
    if (!canRun) {
      return;
    }

    void runReport();
    // Intentionally run only on filter and auth context updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, filters, actorUserId, actorRole]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Day 8</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Paid/Unpaid Matrix Report</h1>
              <p className="mt-2 text-sm text-slate-600">
                Unit-level payment coverage by period for a selected year and contribution head.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runReport()}
                disabled={!canRun || reportLoading || optionsLoading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {reportLoading ? "Loading..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void exportCsv()}
                disabled={!canRun || csvLoading || reportLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {csvLoading ? "Exporting..." : "Export CSV"}
              </button>
              <Link
                href="/reports/contributions/transactions"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Transactions Report
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Home
              </Link>
            </div>
          </div>
        </section>

        <ErrorBanner message={requestError} />

        {optionsLoading && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            Loading filter options...
          </section>
        )}

        {!optionsLoading && heads.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            No contribution heads found. Create a head before running the paid/unpaid matrix.
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Report Access Context</h2>
          <p className="mt-1 text-sm text-slate-600">Headers are sent as x-user-id and x-user-role.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Actor User ID</span>
              <input
                value={actorUserId}
                onChange={(event) => setActorUserId(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="ui-readonly-1"
              />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Role</span>
              <select
                value={actorRole}
                onChange={(event) =>
                  setActorRole(event.target.value as "SOCIETY_ADMIN" | "MANAGER" | "READ_ONLY")
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="READ_ONLY">READ_ONLY</option>
                <option value="MANAGER">MANAGER</option>
                <option value="SOCIETY_ADMIN">SOCIETY_ADMIN</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Year (required)</span>
              <input
                type="number"
                value={filters.refYear}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, refYear: Number(event.target.value || currentYear) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Head (required)</span>
              <select
                value={String(filters.headId)}
                onChange={(event) => {
                  const value = event.target.value;
                  setFilters((prev) => ({ ...prev, headId: value === "" ? "" : Number(value) }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={optionsLoading}
              >
                <option value="">Select head</option>
                {heads.map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.description}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Block (optional)</span>
              <select
                value={filters.blockId}
                onChange={(event) => setFilters((prev) => ({ ...prev, blockId: event.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={optionsLoading}
              >
                <option value="">All blocks</option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.description}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Units</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{report?.totals.totalUnits ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Paid Cells</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{report?.totals.totalPaidCells ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unpaid Cells</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{report?.totals.totalUnpaidCells ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Collection</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{(report?.totals.collectionAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Expected</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{(report?.totals.expectedAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Active Rate</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{(report?.totals.activeRate ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2">Block</th>
                  <th className="border-b border-slate-200 px-3 py-2">Unit</th>
                  <th className="border-b border-slate-200 px-3 py-2">Owner</th>
                  <th className="border-b border-slate-200 px-3 py-2">Resident</th>
                  <th className="border-b border-slate-200 px-3 py-2">Jan</th>
                  <th className="border-b border-slate-200 px-3 py-2">Feb</th>
                  <th className="border-b border-slate-200 px-3 py-2">Mar</th>
                  <th className="border-b border-slate-200 px-3 py-2">Apr</th>
                  <th className="border-b border-slate-200 px-3 py-2">May</th>
                  <th className="border-b border-slate-200 px-3 py-2">Jun</th>
                  <th className="border-b border-slate-200 px-3 py-2">Jul</th>
                  <th className="border-b border-slate-200 px-3 py-2">Aug</th>
                  <th className="border-b border-slate-200 px-3 py-2">Sep</th>
                  <th className="border-b border-slate-200 px-3 py-2">Oct</th>
                  <th className="border-b border-slate-200 px-3 py-2">Nov</th>
                  <th className="border-b border-slate-200 px-3 py-2">Dec</th>
                  <th className="border-b border-slate-200 px-3 py-2">Paid</th>
                  <th className="border-b border-slate-200 px-3 py-2">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {reportLoading ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={18}>
                      Loading matrix...
                    </td>
                  </tr>
                ) : report && report.rows.length > 0 ? (
                  report.rows.map((row) => (
                    <tr key={row.unitId} className="odd:bg-white even:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2">{row.blockDescription}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.unitDescription}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.ownerName ?? "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.residentName ?? "-"}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.jan)}`}>{row.jan}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.feb)}`}>{row.feb}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.mar)}`}>{row.mar}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.apr)}`}>{row.apr}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.may)}`}>{row.may}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.jun)}`}>{row.jun}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.jul)}`}>{row.jul}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.aug)}`}>{row.aug}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.sep)}`}>{row.sep}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.oct)}`}>{row.oct}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.nov)}`}>{row.nov}</td>
                      <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.dec)}`}>{row.dec}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.paidMonthsCount}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.unpaidMonthsCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={18}>
                      No matrix rows found for the selected filter context.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {report && (
            <p className="mt-3 text-sm text-slate-600">
              Head: <span className="font-medium text-slate-900">{report.headDescription}</span> | Period type:{" "}
              <span className="font-medium text-slate-900">{report.periodType}</span>
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
