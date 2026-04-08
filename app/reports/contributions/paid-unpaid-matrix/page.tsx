"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { pushQueryState } from "@/src/lib/url-query-state";

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
  annualStatus: MatrixStatus;
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

const MONTH_COLUMN_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
const MONTH_COLUMN_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type MatrixResponse = {
  refYear: number;
  headId: number;
  headDescription: string;
  periodType: "MONTH" | "YEAR";
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
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

type SearchParamsReader = {
  get(key: string): string | null;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybeError = (payload as { error?: { message?: string } }).error;
  return maybeError?.message ?? fallback;
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseHeadFilter(value: string | null): "" | number {
  if (!value) {
    return "";
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "";
}

function parseMatrixState(searchParams: SearchParamsReader, currentYear: number) {
  return {
    page: parsePositiveInteger(searchParams.get("page"), 1),
    filters: {
      refYear: parsePositiveInteger(searchParams.get("refYear"), currentYear),
      headId: parseHeadFilter(searchParams.get("headId")),
      blockId: searchParams.get("blockId") ?? "",
    } satisfies FiltersState,
  };
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
  const { session } = useAuthSession();
  const currentYear = new Date().getUTCFullYear();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [hasHydratedQuery, setHasHydratedQuery] = useState(false);

  const [heads, setHeads] = useState<HeadOption[]>([]);
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [filters, setFilters] = useState<FiltersState>({
    refYear: currentYear,
    headId: "",
    blockId: "",
  });

  useEffect(() => {
    const nextState = parseMatrixState(searchParams, currentYear);
    setFilters(nextState.filters);
    setPage(nextState.page);
    setHasHydratedQuery(true);
  }, [currentYear, searchParams]);

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

  const canRun = useMemo(() => filters.headId !== "" && session.userId.trim().length > 0, [filters.headId, session.userId]);

  useEffect(() => {
    if (!hasHydratedQuery) {
      return;
    }

    pushQueryState(pathname, {
      refYear: filters.refYear,
      headId: filters.headId === "" ? undefined : filters.headId,
      blockId: filters.blockId || undefined,
      page: page > 1 ? page : undefined,
    });
  }, [filters, hasHydratedQuery, page, pathname]);

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
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (filters.blockId.trim().length > 0) {
        params.set("blockId", filters.blockId.trim());
      }

      const response = await fetch(`/api/reports/contributions/paid-unpaid-matrix?${params.toString()}`);

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

      const response = await fetch(`/api/reports/contributions/paid-unpaid-matrix.csv?${params.toString()}`);

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
    if (!hasHydratedQuery || !canRun) {
      return;
    }

    void runReport();
    // Intentionally run only on filter and auth context updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, filters, hasHydratedQuery, page, session.role, session.userId]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Unit-level payment coverage by period for a selected year and contribution head.
            </p>
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
            </div>
          </div>
        </section>

        {requestError && <InlineNotice tone="danger" title="Report request failed" message={requestError} />}

        <SessionContextNotice className="shadow-sm" mode="report" />

        {optionsLoading && (
          <InlineNotice message="Loading filter options..." />
        )}

        {!optionsLoading && heads.length === 0 && (
          <InlineNotice
            tone="warning"
            message="No contribution heads found. Create a head before running the paid/unpaid matrix."
          />
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Year (required)</span>
              <input
                type="number"
                value={filters.refYear}
                onChange={(event) =>
                  setFilters((prev) => {
                    setPage(1);
                    return { ...prev, refYear: Number(event.target.value || currentYear) };
                  })
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
                  setPage(1);
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
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, blockId: event.target.value }));
                }}
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

          <div className="mt-4">
            <PaginationControls
              page={report?.page ?? page}
              totalPages={report?.totalPages ?? 0}
              totalItems={report?.totalItems ?? 0}
              onPageChange={setPage}
            />
          </div>

          <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2">Block</th>
                  <th className="border-b border-slate-200 px-3 py-2">Unit</th>
                  <th className="border-b border-slate-200 px-3 py-2">Owner</th>
                  <th className="border-b border-slate-200 px-3 py-2">Resident</th>
                  {report?.periodType === "YEAR" ? (
                    <th className="border-b border-slate-200 px-3 py-2">Year</th>
                  ) : (
                    MONTH_COLUMN_LABELS.map((label) => (
                      <th key={label} className="border-b border-slate-200 px-3 py-2">{label}</th>
                    ))
                  )}
                  <th className="border-b border-slate-200 px-3 py-2">Paid</th>
                  <th className="border-b border-slate-200 px-3 py-2">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {reportLoading ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={report?.periodType === "YEAR" ? 7 : 18}>
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
                      {report.periodType === "YEAR" ? (
                        <td className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row.annualStatus)}`}>{row.annualStatus}</td>
                      ) : (
                        MONTH_COLUMN_KEYS.map((key) => (
                          <td key={`${row.unitId}-${key}`} className={`border-b border-slate-100 px-3 py-2 ${statusClassName(row[key])}`}>
                            {row[key]}
                          </td>
                        ))
                      )}
                      <td className="border-b border-slate-100 px-3 py-2">{row.paidMonthsCount}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.unpaidMonthsCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={report?.periodType === "YEAR" ? 7 : 18}>
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
              <span className="font-medium text-slate-900">{report.periodType}</span> | Showing{" "}
              <span className="font-medium text-slate-900">{report.rows.length}</span> of{" "}
              <span className="font-medium text-slate-900">{report.totalItems}</span> units
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
