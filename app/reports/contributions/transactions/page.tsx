"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { pushQueryState } from "@/src/lib/url-query-state";
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

type OptionItem = {
  id: string;
  blockId: string;
  description: string;
  block?: {
    description: string;
  };
};

type HeadOption = {
  id: number;
  description: string;
};

type IndividualOption = {
  id: string;
  fName: string;
  sName: string;
};

type TransactionsItem = {
  contributionId: number;
  transactionId: string;
  transactionDateTime: string;
  block: string;
  blockId: string;
  unit: string;
  unitId: string;
  head: string;
  headId: number;
  period: string;
  refYear: number;
  refMonth: number;
  quantity: number;
  contributionRateId: number | null;
  appliedRate: number | null;
  appliedRateReference: string | null;
  amount: number;
  depositedBy: string;
  depositedById: string;
  recordedBy: string | null;
  recordedRole: string | null;
  recordedAt: string;
  correctionOfContributionId: number | null;
  correctionReasonCode: string | null;
  correctionReasonText: string | null;
};

type TransactionsResponse = {
  items: TransactionsItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  totals: {
    rowCount: number;
    sumAmount: number;
    distinctUnitsCount: number;
    distinctPayersCount: number;
  };
};

type SortField = "transactionDateTime" | "createdAt" | "amount" | "id";
type SortDir = "asc" | "desc";

type FiltersState = {
  refYear: number;
  refMonth: "" | number;
  headId: "" | number;
  unitId: string;
  blockId: string;
  depositedBy: string;
  transactionDateFrom: string;
  transactionDateTo: string;
  pageSize: number;
  sortBy: SortField;
  sortDir: SortDir;
};

type PaginatedItemsResponse<T> = {
  items: T[];
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

function parseMonthFilter(value: string | null): "" | number {
  if (!value) {
    return "";
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 12 ? parsed : "";
}

function parseHeadFilter(value: string | null): "" | number {
  if (!value) {
    return "";
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "";
}

function parsePageSize(value: string | null) {
  return value === "50" ? 50 : value === "100" ? 100 : 20;
}

function parseSortField(value: string | null): SortField {
  return value === "createdAt" || value === "amount" || value === "id" ? value : "transactionDateTime";
}

function parseSortDir(value: string | null): SortDir {
  return value === "asc" ? "asc" : "desc";
}

function parseTransactionsState(searchParams: SearchParamsReader, currentYear: number) {
  return {
    page: parsePositiveInteger(searchParams.get("page"), 1),
    filters: {
      refYear: parsePositiveInteger(searchParams.get("refYear"), currentYear),
      refMonth: parseMonthFilter(searchParams.get("refMonth")),
      headId: parseHeadFilter(searchParams.get("headId")),
      unitId: searchParams.get("unitId") ?? "",
      blockId: searchParams.get("blockId") ?? "",
      depositedBy: searchParams.get("depositedBy") ?? "",
      transactionDateFrom: searchParams.get("transactionDateFrom") ?? "",
      transactionDateTo: searchParams.get("transactionDateTo") ?? "",
      pageSize: parsePageSize(searchParams.get("pageSize")),
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortDir: parseSortDir(searchParams.get("sortDir")),
    } satisfies FiltersState,
  };
}

function buildQuery(filters: FiltersState, page: number) {
  const params = new URLSearchParams();
  params.set("refYear", String(filters.refYear));

  if (filters.refMonth !== "") {
    params.set("refMonth", String(filters.refMonth));
  }

  if (filters.headId !== "") {
    params.set("headId", String(filters.headId));
  }

  if (filters.unitId.trim().length > 0) {
    params.set("unitId", filters.unitId.trim());
  }

  if (filters.blockId.trim().length > 0) {
    params.set("blockId", filters.blockId.trim());
  }

  if (filters.depositedBy.trim().length > 0) {
    params.set("depositedBy", filters.depositedBy.trim());
  }

  if (filters.transactionDateFrom.trim().length > 0) {
    params.set("transactionDateFrom", filters.transactionDateFrom.trim());
  }

  if (filters.transactionDateTo.trim().length > 0) {
    params.set("transactionDateTo", filters.transactionDateTo.trim());
  }

  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize));
  params.set("sortBy", filters.sortBy);
  params.set("sortDir", filters.sortDir);

  return params;
}

export default function ContributionTransactionsReportPage() {
  const { session } = useAuthSession();
  const currentYear = new Date().getUTCFullYear();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [hasHydratedQuery, setHasHydratedQuery] = useState(false);

  const [filters, setFilters] = useState<FiltersState>({
    refYear: currentYear,
    refMonth: "",
    headId: "",
    unitId: "",
    blockId: "",
    depositedBy: "",
    transactionDateFrom: "",
    transactionDateTo: "",
    pageSize: 20,
    sortBy: "transactionDateTime",
    sortDir: "desc",
  });

  useEffect(() => {
    const nextState = parseTransactionsState(searchParams, currentYear);
    setFilters(nextState.filters);
    setPage(nextState.page);
    setHasHydratedQuery(true);
  }, [currentYear, searchParams]);

  const [heads, setHeads] = useState<HeadOption[]>([]);
  const [blocks, setBlocks] = useState<OptionItem[]>([]);
  const [units, setUnits] = useState<OptionItem[]>([]);
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [report, setReport] = useState<TransactionsResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => {
    async function loadFiltersData() {
      setOptionsLoading(true);
      setRequestError("");

      try {
        const [headsRes, blocksRes, unitsRes, individualsRes] = await Promise.all([
          fetch("/api/contribution-heads?page=1&pageSize=100&sortBy=description&sortDir=asc"),
          fetch("/api/blocks?page=1&pageSize=100&sortBy=description&sortDir=asc"),
          fetch("/api/units/lookups"),
          fetch("/api/individuals/lookups"),
        ]);

        const [headsPayload, blocksPayload, unitsPayload, individualsPayload] = (await Promise.all([
          headsRes.json(),
          blocksRes.json(),
          unitsRes.json(),
          individualsRes.json(),
        ])) as [
          ApiEnvelope<PaginatedItemsResponse<HeadOption>>,
          ApiEnvelope<PaginatedItemsResponse<OptionItem>>,
          ApiEnvelope<OptionItem[]>,
          ApiEnvelope<IndividualOption[]>
        ];

        if (!headsRes.ok || !headsPayload.ok) {
          throw new Error(getErrorMessage(headsPayload, "Unable to load contribution heads."));
        }

        if (!blocksRes.ok || !blocksPayload.ok) {
          throw new Error(getErrorMessage(blocksPayload, "Unable to load blocks."));
        }

        if (!unitsRes.ok || !unitsPayload.ok) {
          throw new Error(getErrorMessage(unitsPayload, "Unable to load units."));
        }

        if (!individualsRes.ok || !individualsPayload.ok) {
          throw new Error(getErrorMessage(individualsPayload, "Unable to load individuals."));
        }

        setHeads(headsPayload.data.items ?? []);
        setBlocks(blocksPayload.data.items ?? []);
        setUnits((unitsPayload.data ?? []).sort(compareUnitsByBlockAndDescription));
        setIndividuals(individualsPayload.data ?? []);
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : "Unable to load report filter options.");
      } finally {
        setOptionsLoading(false);
      }
    }

    void loadFiltersData();
  }, []);

  const payableIndividuals = useMemo(
    () => individuals.map((row) => ({ id: row.id, label: `${row.fName} ${row.sName}` })),
    [individuals]
  );
  const visibleUnits = useMemo(
    () => (filters.blockId ? units.filter((unit) => unit.blockId === filters.blockId) : units),
    [filters.blockId, units]
  );

  useEffect(() => {
    if (!filters.blockId || !filters.unitId) {
      return;
    }

    const unitStillVisible = units.some((unit) => unit.id === filters.unitId && unit.blockId === filters.blockId);
    if (!unitStillVisible) {
      setFilters((prev) => ({ ...prev, unitId: "" }));
    }
  }, [filters.blockId, filters.unitId, units]);

  useEffect(() => {
    if (!hasHydratedQuery) {
      return;
    }

    pushQueryState(pathname, {
      refYear: filters.refYear,
      refMonth: filters.refMonth === "" ? undefined : filters.refMonth,
      headId: filters.headId === "" ? undefined : filters.headId,
      unitId: filters.unitId || undefined,
      blockId: filters.blockId || undefined,
      depositedBy: filters.depositedBy || undefined,
      transactionDateFrom: filters.transactionDateFrom || undefined,
      transactionDateTo: filters.transactionDateTo || undefined,
      page: page > 1 ? page : undefined,
      pageSize: filters.pageSize === 20 ? undefined : filters.pageSize,
      sortBy: filters.sortBy === "transactionDateTime" ? undefined : filters.sortBy,
      sortDir: filters.sortDir === "desc" ? undefined : filters.sortDir,
    });
  }, [filters, hasHydratedQuery, page, pathname]);

  async function runReport(page: number) {
    setReportLoading(true);
    setRequestError("");

    try {
      const params = buildQuery(filters, page);
      const response = await fetch(`/api/reports/contributions/transactions?${params.toString()}`);

      const payload = (await response.json()) as ApiEnvelope<TransactionsResponse>;

      if (!response.ok || !payload.ok) {
        throw new Error(getErrorMessage(payload, "Unable to load contribution transactions report."));
      }

      setReport(payload.data);
    } catch (error) {
      setReport(null);
      setRequestError(error instanceof Error ? error.message : "Unable to load report data.");
    } finally {
      setReportLoading(false);
    }
  }

  async function exportCsv() {
    setCsvLoading(true);
    setRequestError("");

    try {
      const params = buildQuery(filters, 1);
      const response = await fetch(`/api/reports/contributions/transactions.csv?${params.toString()}`);

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(getErrorMessage(payload, "Unable to export CSV."));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contribution-transactions-${filters.refYear}.csv`;
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
    if (!hasHydratedQuery) {
      return;
    }

    void runReport(page);
    // Intentionally run only on explicit filter, page, and auth context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, hasHydratedQuery, page, session.role, session.userId]);

  const pageLabel = report ? `Page ${report.page} of ${Math.max(report.totalPages, 1)}` : `Page ${page} of 1`;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Filter, sort, paginate, and export period-level contribution transactions.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runReport(page)}
                disabled={reportLoading || optionsLoading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {reportLoading ? "Loading..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void exportCsv()}
                disabled={csvLoading || reportLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {csvLoading ? "Exporting..." : "Export CSV"}
              </button>
              <Link
                href="/reports/contributions/paid-unpaid-matrix"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Paid/Unpaid Matrix
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
            message="No contribution heads found. Add at least one head to use report filters effectively."
          />
        )}

        {!optionsLoading && units.length === 0 && (
          <InlineNotice
            tone="warning"
            message="No units found. Transaction report rows may remain empty until units and contributions exist."
          />
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Year</span>
              <input
                type="number"
                value={filters.refYear}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, refYear: Number(event.target.value || currentYear) }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Month</span>
              <select
                value={String(filters.refMonth)}
                onChange={(event) => {
                  const value = event.target.value;
                  setPage(1);
                  setFilters((prev) => ({ ...prev, refMonth: value === "" ? "" : Number(value) }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={optionsLoading}
              >
                <option value="">All</option>
                <option value="0">Yearly (refMonth 0)</option>
                <option value="1">Jan</option>
                <option value="2">Feb</option>
                <option value="3">Mar</option>
                <option value="4">Apr</option>
                <option value="5">May</option>
                <option value="6">Jun</option>
                <option value="7">Jul</option>
                <option value="8">Aug</option>
                <option value="9">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Head</span>
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
                <option value="">All heads</option>
                {heads.map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.description}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Block</span>
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

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Unit</span>
              <select
                value={filters.unitId}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, unitId: event.target.value }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={optionsLoading}
              >
                <option value="">All units</option>
                {visibleUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {formatUnitLabel(unit)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Depositor</span>
              <select
                value={filters.depositedBy}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, depositedBy: event.target.value }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={optionsLoading}
              >
                <option value="">All depositors</option>
                {payableIndividuals.map((individual) => (
                  <option key={individual.id} value={individual.id}>
                    {individual.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Date from</span>
              <input
                type="date"
                value={filters.transactionDateFrom}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, transactionDateFrom: event.target.value }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Date to</span>
              <input
                type="date"
                value={filters.transactionDateTo}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, transactionDateTo: event.target.value }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Sort by</span>
              <select
                value={filters.sortBy}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, sortBy: event.target.value as SortField }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="transactionDateTime">transactionDateTime</option>
                <option value="createdAt">createdAt</option>
                <option value="amount">amount</option>
                <option value="id">id</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Sort direction</span>
              <select
                value={filters.sortDir}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, sortDir: event.target.value as SortDir }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Page size</span>
              <select
                value={String(filters.pageSize)}
                onChange={(event) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, pageSize: Number(event.target.value) }));
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rows</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{report?.totals.rowCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Sum Amount</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {(report?.totals.sumAmount ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Distinct Units</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{report?.totals.distinctUnitsCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Distinct Payers</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{report?.totals.distinctPayersCount ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2">Contribution</th>
                  <th className="border-b border-slate-200 px-3 py-2">Transaction</th>
                  <th className="border-b border-slate-200 px-3 py-2">Date</th>
                  <th className="border-b border-slate-200 px-3 py-2">Block</th>
                  <th className="border-b border-slate-200 px-3 py-2">Unit</th>
                  <th className="border-b border-slate-200 px-3 py-2">Head</th>
                  <th className="border-b border-slate-200 px-3 py-2">Period</th>
                  <th className="border-b border-slate-200 px-3 py-2">Qty</th>
                  <th className="border-b border-slate-200 px-3 py-2">Rate</th>
                  <th className="border-b border-slate-200 px-3 py-2">Amount</th>
                  <th className="border-b border-slate-200 px-3 py-2">Deposited By</th>
                  <th className="border-b border-slate-200 px-3 py-2">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {reportLoading ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={12}>
                      Loading report...
                    </td>
                  </tr>
                ) : report && report.items.length > 0 ? (
                  report.items.map((row) => (
                    <tr key={`${row.contributionId}:${row.refMonth}:${row.period}`} className="odd:bg-white even:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2">{row.contributionId}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.transactionId}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {new Date(row.transactionDateTime).toLocaleString()}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.block}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.unit}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.head}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.period}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.quantity}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.appliedRate === null ? "-" : Number(row.appliedRate).toFixed(2)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">{Number(row.amount).toFixed(2)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.depositedBy}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.recordedBy ?? "-"} ({row.recordedRole ?? "-"})
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={12}>
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{pageLabel}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!report?.hasPrev || reportLoading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!report?.hasNext || reportLoading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
