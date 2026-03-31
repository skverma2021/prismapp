"use client";

import { useEffect, useMemo, useState } from "react";

type Head = {
  id: number;
  description: string;
  payUnit: number;
  period: "MONTH" | "YEAR" | string;
};

type Unit = {
  id: string;
  description: string;
  blockId: string;
};

type ActiveResidency = {
  id: string;
  indId: string;
  individual?: {
    id: string;
    fName: string;
    sName: string;
  };
};

type MonthState = {
  month: number;
  label: string;
  selected: boolean;
  status: "Unknown" | "Paid" | "Unpaid";
  amount: number;
  transactionRefs: Array<{
    contributionId: number;
    transactionId: string;
    transactionDateTime: string;
    amount: number;
  }>;
};

type MonthLedgerResponse = {
  latestPaidMonth: number | null;
  rows: Array<{
    refYear: number;
    refMonth: number;
    monthLabel: string;
    status: "Paid" | "Unpaid";
    amount: number;
    transactionRefs: Array<{
      contributionId: number;
      transactionId: string;
      transactionDateTime: string;
      amount: number;
    }>;
  }>;
};

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
        details?: unknown;
      };
    };

type ContributionPeriod = {
  id: number;
  refYear: number;
  refMonth: number;
};

type ContributionLookup = {
  id: number;
  unitId: string;
  contributionHeadId: number;
  quantity: number;
  periodCount: number;
  transactionId: string;
  transactionDateTime: string;
  depositedBy: string;
  correctionOfContributionId: number | null;
  correctionReasonCode?: string | null;
  correctionReasonText?: string | null;
  unit?: {
    id: string;
    description: string;
  };
  contributionHead?: {
    id: number;
    description: string;
    payUnit: number;
    period: string;
  };
  details: Array<{
    id: number;
    amt: string | number;
    contributionPeriod: {
      refYear: number;
      refMonth: number;
    };
  }>;
  correctionOf?: {
    id: number;
  } | null;
  correctedBy?: Array<{
    id: number;
    createdAt: string;
    transactionId: string;
  }>;
};

type ActionHint = {
  title: string;
  detail: string;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const TEST_HEAD_PREFIXES = ["CONTR-HEAD-", "RPT-HEAD-", "IT-RATE-HEAD-"];

function isLikelyTestHead(head: Head) {
  const normalized = head.description.trim().toUpperCase();
  return TEST_HEAD_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function defaultMonths(): MonthState[] {
  return MONTHS.map((label, index) => ({
    month: index + 1,
    label,
    selected: false,
    status: "Unknown",
    amount: 0,
    transactionRefs: [],
  }));
}

function payUnitLabel(payUnit: number) {
  if (payUnit === 1) return "Per Sq Ft";
  if (payUnit === 2) return "Per Person";
  if (payUnit === 3) return "Lumpsum";
  return "Unknown";
}

function getContributionActionHint(
  code: string | undefined,
  message: string,
  context: { payUnit?: number; isMonthly: boolean }
): ActionHint | null {
  const normalizedMessage = message.toLowerCase();

  if (code === "CONFLICT" || normalizedMessage.includes("duplicate")) {
    return {
      title: "Duplicate payment detected",
      detail:
        "This unit/head/period appears to be already posted. Use transactions report to verify and use correction flow if rollback is needed.",
    };
  }

  if (code === "PRECONDITION_FAILED" || normalizedMessage.includes("precondition")) {
    if (context.payUnit === 2) {
      return {
        title: "Per-person precondition failed",
        detail:
          "Confirm the unit has an active resident and availing person count is a positive integer before retrying.",
      };
    }

    if (context.isMonthly) {
      return {
        title: "Monthly period precondition failed",
        detail: "Check that selected months are unpaid and in the valid current-year period set.",
      };
    }

    return {
      title: "Posting precondition failed",
      detail: "Verify head rate/period setup and selected unit context, then retry.",
    };
  }

  return null;
}

function getCorrectionActionHint(code: string | undefined, message: string): ActionHint | null {
  const normalizedMessage = message.toLowerCase();

  if (code === "CONFLICT" || normalizedMessage.includes("already") || normalizedMessage.includes("duplicate")) {
    return {
      title: "Correction conflict",
      detail:
        "This original contribution may already be corrected or conflicts with correction rules. Reload contribution details and verify correction chain.",
    };
  }

  if (code === "PRECONDITION_FAILED" || normalizedMessage.includes("precondition")) {
    return {
      title: "Correction precondition failed",
      detail:
        "Ensure you selected an original (non-correction) contribution and provided valid reason code/text and transaction details.",
    };
  }

  return null;
}

export default function ContributionCapturePage() {
  const currentYear = new Date().getUTCFullYear();
  const [heads, setHeads] = useState<Head[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState("");

  const [headId, setHeadId] = useState<number | "">("");
  const [unitId, setUnitId] = useState<string>("");
  const [year] = useState(currentYear);
  const [depositedBy, setDepositedBy] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionDateTime, setTransactionDateTime] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [availingPersonCount, setAvailingPersonCount] = useState("");
  const [comment, setComment] = useState("");
  const [months, setMonths] = useState<MonthState[]>(defaultMonths);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [latestPaidMonth, setLatestPaidMonth] = useState<number | null>(null);
  const [actorUserId, setActorUserId] = useState("ui-manager-1");
  const [actorRole, setActorRole] = useState<"SOCIETY_ADMIN" | "MANAGER">("MANAGER");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitHint, setSubmitHint] = useState<ActionHint | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [showTestHeads, setShowTestHeads] = useState(false);
  const [activeResidents, setActiveResidents] = useState<ActiveResidency[]>([]);
  const [activeResidentsLoading, setActiveResidentsLoading] = useState(false);
  const [activeResidentsError, setActiveResidentsError] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [correctionLookupId, setCorrectionLookupId] = useState("");
  const [correctionLookupLoading, setCorrectionLookupLoading] = useState(false);
  const [correctionLookupError, setCorrectionLookupError] = useState("");
  const [correctionBase, setCorrectionBase] = useState<ContributionLookup | null>(null);
  const [correctionTransactionId, setCorrectionTransactionId] = useState("");
  const [correctionTransactionDateTime, setCorrectionTransactionDateTime] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [correctionReasonCode, setCorrectionReasonCode] = useState("");
  const [correctionReasonText, setCorrectionReasonText] = useState("");
  const [correctionDepositedBy, setCorrectionDepositedBy] = useState("");
  const [correctionSubmitLoading, setCorrectionSubmitLoading] = useState(false);
  const [correctionSubmitError, setCorrectionSubmitError] = useState("");
  const [correctionSubmitHint, setCorrectionSubmitHint] = useState<ActionHint | null>(null);
  const [correctionSubmitSuccess, setCorrectionSubmitSuccess] = useState("");

  async function loadInitialData() {
    setLoading(true);
    setInitialLoadError("");

    try {
      const [headsRes, unitsRes] = await Promise.all([
        fetch("/api/contribution-heads?page=1&pageSize=100&sortBy=description&sortDir=asc"),
        fetch("/api/units?page=1&pageSize=100&sortBy=description&sortDir=asc"),
      ]);

      const [headsJson, unitsJson] = await Promise.all([headsRes.json(), unitsRes.json()]);

      if (!headsRes.ok || !headsJson?.ok) {
        throw new Error(headsJson?.error?.message ?? "Unable to load contribution heads.");
      }

      if (!unitsRes.ok || !unitsJson?.ok) {
        throw new Error(unitsJson?.error?.message ?? "Unable to load units.");
      }

      setHeads(headsJson?.data?.items ?? []);
      setUnits(unitsJson?.data?.items ?? []);
    } catch (error) {
      setHeads([]);
      setUnits([]);
      setInitialLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load contribution setup data. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  const selectedHead = useMemo(
    () => heads.find((head) => head.id === Number(headId)),
    [heads, headId]
  );

  const visibleHeads = useMemo(() => {
    if (showTestHeads) {
      return heads;
    }

    return heads.filter((head) => !isLikelyTestHead(head));
  }, [heads, showTestHeads]);

  const periodType = (selectedHead?.period ?? "").toUpperCase();
  const isMonthly = periodType === "MONTH";
  const isYearly = periodType === "YEAR";
  const payUnit = selectedHead?.payUnit;

  const selectedMonths = months.filter((m) => m.selected).map((m) => m.month);
  const selectedMonthLabels = months.filter((m) => m.selected).map((m) => m.label);
  const selectedUnit = units.find((unit) => unit.id === unitId);
  const selectedResident = activeResidents.find((row) => row.indId === selectedResidentId);
  const isCorrectionOfCorrection =
    correctionBase?.correctionOfContributionId !== null || Boolean(correctionBase?.correctionOf);
  const canSubmitCorrection =
    correctionBase !== null &&
    !isCorrectionOfCorrection &&
    correctionTransactionId.trim().length > 0 &&
    correctionTransactionDateTime.trim().length > 0 &&
    correctionReasonCode.trim().length > 0 &&
    correctionReasonText.trim().length > 0 &&
    actorUserId.trim().length > 0;
  const canSubmit =
    Boolean(headId) &&
    Boolean(unitId) &&
    Boolean(depositedBy.trim()) &&
    Boolean(transactionId.trim()) &&
    Boolean(transactionDateTime.trim()) &&
    actorUserId.trim().length > 0 &&
    (isYearly || selectedMonths.length > 0) &&
    (payUnit !== 2 || Number.isInteger(Number(availingPersonCount)));
  const parsedPersons = Number(availingPersonCount);
  const captureGuardChecks: Array<{ label: string; ok: boolean }> = [
    { label: "Contribution head selected", ok: Boolean(headId) },
    { label: "Unit selected", ok: Boolean(unitId) },
    {
      label: "Depositor, transaction id, and datetime provided",
      ok: Boolean(depositedBy.trim()) && Boolean(transactionId.trim()) && Boolean(transactionDateTime.trim()),
    },
    { label: "Actor user id provided", ok: Boolean(actorUserId.trim()) },
  ];

  if (isMonthly) {
    captureGuardChecks.push({ label: "At least one unpaid month selected", ok: selectedMonths.length > 0 });
  }

  if (isYearly) {
    captureGuardChecks.push({ label: "Yearly head resolves to refMonth = 0", ok: true });
  }

  if (payUnit === 2) {
    captureGuardChecks.push({
      label: "Availing person count is positive integer",
      ok: Number.isInteger(parsedPersons) && parsedPersons > 0,
    });
  }

  if (payUnit === 1) {
    captureGuardChecks.push({ label: "Quantity derived from unit sq ft", ok: Boolean(unitId) });
  }

  if (payUnit === 3) {
    captureGuardChecks.push({ label: "Lumpsum quantity fixed to 1", ok: true });
  }

  function toggleMonth(month: number) {
    setMonths((prev) =>
      prev.map((row) => {
        if (row.month !== month) {
          return row;
        }

        if (row.status === "Paid") {
          return row;
        }

        return { ...row, selected: !row.selected };
      })
    );
  }

  useEffect(() => {
    if (!isMonthly || !headId || !unitId) {
      setLedgerError("");
      setLatestPaidMonth(null);
      setMonths(defaultMonths());
      return;
    }

    const controller = new AbortController();

    async function loadMonthLedger() {
      setLedgerLoading(true);
      setLedgerError("");

      try {
        const params = new URLSearchParams({
          unitId,
          headId: String(headId),
          refYear: String(year),
        });

        const response = await fetch(`/api/contributions/month-ledger?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok || !payload?.ok) {
          const message = payload?.error?.message ?? "Unable to load month ledger.";
          throw new Error(message);
        }

        const data = payload.data as MonthLedgerResponse;
        const monthByNumber = new Map(data.rows.map((row) => [row.refMonth, row]));

        setLatestPaidMonth(data.latestPaidMonth);
        setMonths(
          defaultMonths().map((month) => {
            const row = monthByNumber.get(month.month);

            if (!row) {
              return month;
            }

            return {
              ...month,
              status: row.status,
              amount: Number(row.amount ?? 0),
              transactionRefs: row.transactionRefs ?? [],
            };
          })
        );
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setLatestPaidMonth(null);
        setMonths(defaultMonths());
        setLedgerError(error instanceof Error ? error.message : "Unable to load month ledger.");
      } finally {
        setLedgerLoading(false);
      }
    }

    void loadMonthLedger();

    return () => {
      controller.abort();
    };
  }, [headId, isMonthly, unitId, year]);

  useEffect(() => {
    if (!unitId) {
      setActiveResidents([]);
      setSelectedResidentId("");
      setActiveResidentsError("");
      return;
    }

    const controller = new AbortController();

    async function loadActiveResidents() {
      setActiveResidentsLoading(true);
      setActiveResidentsError("");

      try {
        const params = new URLSearchParams({
          unitId,
          activeOnly: "true",
          page: "1",
          pageSize: "100",
          sortBy: "fromDt",
          sortDir: "desc",
        });

        const response = await fetch(`/api/residencies?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as ApiEnvelope<{ items: ActiveResidency[] }>;

        if (!response.ok || !payload.ok) {
          const message = payload.ok ? "Unable to load active residents." : payload.error?.message;
          throw new Error(message ?? "Unable to load active residents.");
        }

        setActiveResidents(payload.data.items ?? []);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setActiveResidents([]);
        setSelectedResidentId("");
        setActiveResidentsError(
          error instanceof Error ? error.message : "Unable to load active residents."
        );
      } finally {
        setActiveResidentsLoading(false);
      }
    }

    void loadActiveResidents();

    return () => {
      controller.abort();
    };
  }, [unitId]);

  async function resolveContributionPeriodIds(): Promise<number[]> {
    const params = new URLSearchParams({
      refYear: String(year),
      page: "1",
      pageSize: "100",
      sortBy: "refMonth",
      sortDir: "asc",
    });

    const response = await fetch(`/api/contribution-periods?${params.toString()}`);
    const payload = (await response.json()) as ApiEnvelope<{ items: ContributionPeriod[] }>;

    if (!response.ok || !payload.ok) {
      const message = payload.ok ? "Unable to resolve contribution periods." : payload.error?.message;
      throw new Error(message ?? "Unable to resolve contribution periods.");
    }

    const byMonth = new Map(payload.data.items.map((period) => [period.refMonth, period.id]));

    if (isYearly) {
      const yearlyPeriodId = byMonth.get(0);
      if (!yearlyPeriodId) {
        throw new Error("Yearly contribution period not found for current year.");
      }

      return [yearlyPeriodId];
    }

    const resolved = selectedMonths.map((month) => byMonth.get(month));
    if (resolved.some((periodId) => periodId === undefined)) {
      throw new Error("One or more selected monthly periods could not be resolved.");
    }

    return resolved as number[];
  }

  async function onSubmitContribution() {
    setSubmitError("");
    setSubmitHint(null);
    setSubmitSuccess("");

    if (!selectedHead || !headId) {
      setSubmitError("Select a contribution head before submitting.");
      return;
    }

    if (!unitId) {
      setSubmitError("Select a unit before submitting.");
      return;
    }

    if (!depositedBy.trim() || !transactionId.trim() || !transactionDateTime.trim()) {
      setSubmitError("Deposited by, transaction id, and transaction date/time are required.");
      return;
    }

    if (isMonthly && selectedMonths.length === 0) {
      setSubmitError("Select at least one unpaid month.");
      return;
    }

    if (payUnit === 2 && (!Number.isInteger(parsedPersons) || parsedPersons <= 0)) {
      setSubmitError("Enter a valid availing person count (positive integer).");
      return;
    }

    setSubmitLoading(true);

    try {
      const contributionPeriodIds = await resolveContributionPeriodIds();
      const payload: Record<string, unknown> = {
        unitId,
        contributionHeadId: Number(headId),
        contributionPeriodIds,
        transactionId: transactionId.trim(),
        transactionDateTime: new Date(transactionDateTime).toISOString(),
        depositedBy: depositedBy.trim(),
      };

      if (payUnit === 2) {
        payload.availingPersonCount = parsedPersons;
      }

      if (comment.trim().length > 0) {
        payload.comment = comment.trim();
      }

      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": actorUserId.trim(),
          "x-user-role": actorRole,
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiEnvelope<{ id: number }>;
      if (!response.ok || !result.ok) {
        const code = result.ok ? undefined : result.error?.code;
        const message = result.ok ? "Contribution post failed." : result.error?.message;
        const normalized = message ?? "Contribution post failed.";
        setSubmitError(normalized);
        setSubmitHint(getContributionActionHint(code, normalized, { payUnit, isMonthly }));
        return;
      }

      setSubmitSuccess(`Contribution recorded successfully (id: ${result.data.id}).`);

      if (isMonthly) {
        setMonths((prev) => prev.map((row) => ({ ...row, selected: false })));
      }
      setTransactionId("");
      setComment("");
      setAvailingPersonCount("");
      setTransactionDateTime(new Date().toISOString().slice(0, 16));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record contribution.";
      setSubmitError(message);
      setSubmitHint(getContributionActionHint(undefined, message, { payUnit, isMonthly }));
    } finally {
      setSubmitLoading(false);
    }
  }

  async function copyValue(value: string, key: string) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? "" : prev));
      }, 1500);
    } catch {
      setSubmitError("Could not copy to clipboard in this browser context.");
    }
  }

  async function lookupCorrectionBase() {
    setCorrectionLookupError("");
    setCorrectionSubmitError("");
    setCorrectionSubmitSuccess("");

    const parsedId = Number(correctionLookupId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setCorrectionLookupError("Enter a valid positive contribution ID.");
      setCorrectionBase(null);
      return;
    }

    setCorrectionLookupLoading(true);
    try {
      const response = await fetch(`/api/contributions/${parsedId}`);
      const payload = (await response.json()) as ApiEnvelope<ContributionLookup>;

      if (!response.ok || !payload.ok) {
        const message = payload.ok ? "Failed to load contribution." : payload.error?.message;
        throw new Error(message ?? "Failed to load contribution.");
      }

      setCorrectionBase(payload.data);
      setCorrectionDepositedBy(payload.data.depositedBy ?? "");
    } catch (error) {
      setCorrectionBase(null);
      setCorrectionLookupError(error instanceof Error ? error.message : "Failed to load contribution.");
    } finally {
      setCorrectionLookupLoading(false);
    }
  }

  async function submitCorrection() {
    setCorrectionSubmitError("");
    setCorrectionSubmitHint(null);
    setCorrectionSubmitSuccess("");

    if (!correctionBase) {
      setCorrectionSubmitError("Lookup an original contribution first.");
      return;
    }

    if (isCorrectionOfCorrection) {
      setCorrectionSubmitError("Selected contribution is itself a correction. Choose an original posted contribution.");
      return;
    }

    if (
      !correctionTransactionId.trim() ||
      !correctionTransactionDateTime.trim() ||
      !correctionReasonCode.trim() ||
      !correctionReasonText.trim()
    ) {
      setCorrectionSubmitError("Transaction fields and reason code/text are required.");
      return;
    }

    setCorrectionSubmitLoading(true);
    try {
      const payload: Record<string, unknown> = {
        originalContributionId: correctionBase.id,
        transactionId: correctionTransactionId.trim(),
        transactionDateTime: new Date(correctionTransactionDateTime).toISOString(),
        reasonCode: correctionReasonCode.trim(),
        reasonText: correctionReasonText.trim(),
      };

      if (correctionDepositedBy.trim()) {
        payload.depositedBy = correctionDepositedBy.trim();
      }

      const response = await fetch("/api/contributions/corrections", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": actorUserId.trim(),
          "x-user-role": actorRole,
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as ApiEnvelope<{ id: number }>;
      if (!response.ok || !result.ok) {
        const code = result.ok ? undefined : result.error?.code;
        const message = result.ok ? "Correction post failed." : result.error?.message;
        const normalized = message ?? "Correction post failed.";
        setCorrectionSubmitError(normalized);
        setCorrectionSubmitHint(getCorrectionActionHint(code, normalized));
        return;
      }

      setCorrectionSubmitSuccess(`Correction recorded successfully (id: ${result.data.id}).`);
      setCorrectionTransactionId("");
      setCorrectionReasonCode("");
      setCorrectionReasonText("");
      setCorrectionTransactionDateTime(new Date().toISOString().slice(0, 16));
      await lookupCorrectionBase();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit correction.";
      setCorrectionSubmitError(message);
      setCorrectionSubmitHint(getCorrectionActionHint(undefined, message));
    } finally {
      setCorrectionSubmitLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-8">
      <main className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Day 3 Progress</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Record Contribution</h1>
          <p className="mt-2 text-sm text-slate-600">
            Capture form with payUnit-aware fields, ledger-backed period statuses, and direct API submission.
          </p>

          {loading && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Loading contribution heads and units...
            </div>
          )}

          {initialLoadError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              <p>{initialLoadError}</p>
              <button
                type="button"
                onClick={() => {
                  void loadInitialData();
                }}
                className="mt-2 rounded border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                Retry load
              </button>
            </div>
          )}

          {!loading && !initialLoadError && heads.length === 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No contribution heads available. Add heads before posting contributions.
            </div>
          )}

          {!loading && !initialLoadError && units.length === 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No units available. Create units before posting contributions.
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Contribution Head</span>
              <select
                value={headId}
                onChange={(event) => {
                  setHeadId(event.target.value ? Number(event.target.value) : "");
                  setMonths(defaultMonths());
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="">Select head</option>
                {visibleHeads.map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.description} ({payUnitLabel(head.payUnit)} | {head.period})
                  </option>
                ))}
              </select>
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={showTestHeads}
                  onChange={(event) => setShowTestHeads(event.target.checked)}
                />
                Show test/generated heads
              </label>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Unit</span>
              <select
                value={unitId}
                onChange={(event) => setUnitId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.description} (Unit ID: {unit.id})
                  </option>
                ))}
              </select>
              {selectedUnit && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <span>Selected Unit ID: {selectedUnit.id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void copyValue(selectedUnit.id, "unit-id");
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    {copiedKey === "unit-id" ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference Year</span>
              <input
                value={year}
                disabled
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Deposited By (Individual ID)</span>
              <input
                value={depositedBy}
                onChange={(event) => setDepositedBy(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="UUID of depositor"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Transaction ID</span>
              <input
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="UPI/Bank reference"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Transaction Date/Time</span>
              <input
                type="datetime-local"
                value={transactionDateTime}
                onChange={(event) => setTransactionDateTime(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Actor User ID</span>
              <input
                value={actorUserId}
                onChange={(event) => setActorUserId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Required auth header value"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Actor Role</span>
              <select
                value={actorRole}
                onChange={(event) =>
                  setActorRole(event.target.value === "SOCIETY_ADMIN" ? "SOCIETY_ADMIN" : "MANAGER")
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="MANAGER">MANAGER</option>
                <option value="SOCIETY_ADMIN">SOCIETY_ADMIN</option>
              </select>
            </label>
          </div>

          {payUnit === 2 && (
            <div className="mt-4 grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Active Resident (Gym Eligibility Helper)
                </span>
                <select
                  value={selectedResidentId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedResidentId(nextId);
                    if (nextId) {
                      setDepositedBy(nextId);
                    }
                  }}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                  disabled={!unitId || activeResidentsLoading}
                >
                  <option value="">Select active resident (optional helper)</option>
                  {activeResidents.map((resident) => {
                    const displayName = resident.individual
                      ? `${resident.individual.fName} ${resident.individual.sName}`
                      : "Resident";

                    return (
                      <option key={resident.id} value={resident.indId}>
                        {displayName} (Individual ID: {resident.indId})
                      </option>
                    );
                  })}
                </select>
                {activeResidentsLoading && (
                  <span className="text-xs text-amber-700">Loading active residents...</span>
                )}
                {activeResidentsError && (
                  <span className="text-xs text-rose-700">{activeResidentsError}</span>
                )}
                {!activeResidentsLoading && !activeResidentsError && unitId && activeResidents.length === 0 && (
                  <span className="text-xs text-amber-700">
                    No active resident found for selected unit. Per-person posting will fail precondition.
                  </span>
                )}
                {selectedResident && (
                  <span className="text-xs text-amber-700">
                    Selected resident individual ID: {selectedResident.indId}
                    <button
                      type="button"
                      onClick={() => {
                        void copyValue(selectedResident.indId, "resident-id");
                      }}
                      className="ml-2 rounded border border-amber-300 bg-white px-2 py-1 text-xs hover:bg-amber-100"
                    >
                      {copiedKey === "resident-id" ? "Copied" : "Copy"}
                    </button>
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Availing Person Count
                </span>
                <input
                  type="number"
                  min={1}
                  value={availingPersonCount}
                  onChange={(event) => setAvailingPersonCount(event.target.value)}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                  placeholder="Required for per-person heads"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-amber-700">Capture Comment</span>
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                  placeholder="Optional accountability note"
                />
              </label>
            </div>
          )}

          {payUnit === 1 && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Quantity mode: auto-derived from selected unit sq ft.
            </div>
          )}

          {payUnit === 3 && (
            <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
              Quantity mode: fixed lumpsum per unit (quantity = 1).
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Period Selection</h2>
          <p className="mt-2 text-sm text-slate-600">
            Explicit selection only. Paid months are locked and unpaid months are selectable.
          </p>

          {isMonthly && unitId && headId && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Latest paid month: {latestPaidMonth ?? "None"}
            </div>
          )}

          {isMonthly && ledgerLoading && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Loading month ledger...
            </div>
          )}

          {isMonthly && ledgerError && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {ledgerError}
            </div>
          )}

          {isMonthly && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {months.map((row) => (
                <button
                  key={row.month}
                  type="button"
                  onClick={() => toggleMonth(row.month)}
                  disabled={row.status === "Paid"}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    row.status === "Paid"
                      ? "cursor-not-allowed border-emerald-300 bg-emerald-50 text-emerald-800"
                      :
                    row.selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{row.label}</span>
                    <span className="text-[10px] uppercase tracking-wide">
                      {row.status === "Unknown" ? "-" : row.status}
                    </span>
                  </div>
                  {row.status === "Paid" && (
                    <div className="mt-1 text-left text-[11px] font-normal">Amount: {row.amount}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {isYearly && (
            <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
              Yearly head selected: one yearly period row (refMonth = 0) will be posted.
            </div>
          )}

          {!selectedHead && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Select contribution head to unlock period controls.
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              Selected months: {selectedMonthLabels.length > 0 ? selectedMonthLabels.join(", ") : "None"}
            </p>
            <p className="mt-2">Day 3 rule: paid months cannot be selected for posting.</p>
            <p className="mt-2">Posting formula: CurrentRate x Quantity x PeriodCount.</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-semibold text-slate-900">Capture Guard Checklist</p>
            <div className="mt-2 grid gap-1">
              {captureGuardChecks.map((item) => (
                <p key={item.label} className={item.ok ? "text-emerald-700" : "text-amber-800"}>
                  {item.ok ? "PASS" : "WAIT"} - {item.label}
                </p>
              ))}
            </div>
          </div>

          {submitError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </div>
          )}

          {submitHint && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="font-semibold">{submitHint.title}</p>
              <p className="mt-1">{submitHint.detail}</p>
            </div>
          )}

          {submitSuccess && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {submitSuccess}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              void onSubmitContribution();
            }}
            disabled={submitLoading || !canSubmit}
            className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium ${
              submitLoading || !canSubmit
                ? "cursor-not-allowed bg-slate-300 text-slate-600"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {submitLoading ? "Recording..." : "Record Contribution"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Day 6 Core</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Contribution Correction</h2>
          <p className="mt-2 text-sm text-slate-600">
            Lookup original contribution, review details, capture reason code/text, and submit compensating
            correction.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Original Contribution ID</span>
              <input
                value={correctionLookupId}
                onChange={(event) => setCorrectionLookupId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Numeric contribution id"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                void lookupCorrectionBase();
              }}
              disabled={correctionLookupLoading}
              className={`self-end rounded-lg px-4 py-2 text-sm font-medium ${
                correctionLookupLoading
                  ? "cursor-not-allowed bg-slate-300 text-slate-600"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {correctionLookupLoading ? "Looking up..." : "Lookup Contribution"}
            </button>
          </div>

          {correctionLookupError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {correctionLookupError}
            </div>
          )}

          {!correctionLookupLoading && !correctionLookupError && !correctionBase && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Lookup an original contribution ID to load correction details and enable submission.
            </div>
          )}

          {correctionBase && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <p>
                  <span className="font-semibold">Contribution ID:</span> {correctionBase.id}
                </p>
                <p>
                  <span className="font-semibold">Unit:</span> {correctionBase.unit?.description ?? "-"} ({correctionBase.unitId})
                </p>
                <p>
                  <span className="font-semibold">Head:</span> {correctionBase.contributionHead?.description ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Original Txn:</span> {correctionBase.transactionId}
                </p>
                <p>
                  <span className="font-semibold">Quantity:</span> {correctionBase.quantity}
                </p>
                <p>
                  <span className="font-semibold">PeriodCount:</span> {correctionBase.periodCount}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detail Rows</p>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Period</th>
                        <th className="px-3 py-2 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {correctionBase.details.map((detail) => (
                        <tr key={detail.id} className="border-t border-slate-100 text-slate-700">
                          <td className="px-3 py-2">
                            {detail.contributionPeriod.refYear}-{String(detail.contributionPeriod.refMonth).padStart(2, "0")}
                          </td>
                          <td className="px-3 py-2">{detail.amt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {isCorrectionOfCorrection && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Selected entry is already a correction. Correction-of-correction is not allowed.
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Correction Transaction ID</span>
                  <input
                    value={correctionTransactionId}
                    onChange={(event) => setCorrectionTransactionId(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Correction transaction reference"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Correction Transaction Date/Time</span>
                  <input
                    type="datetime-local"
                    value={correctionTransactionDateTime}
                    onChange={(event) => setCorrectionTransactionDateTime(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Reason Code</span>
                  <input
                    value={correctionReasonCode}
                    onChange={(event) => setCorrectionReasonCode(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="e.g. DUPLICATE, REVERSAL, WRONG_HEAD"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Deposited By (optional override)</span>
                  <input
                    value={correctionDepositedBy}
                    onChange={(event) => setCorrectionDepositedBy(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Defaults to original depositor"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Reason Text</span>
                  <textarea
                    value={correctionReasonText}
                    onChange={(event) => setCorrectionReasonText(event.target.value)}
                    className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Explain why correction is required"
                  />
                </label>
              </div>

              {correctionSubmitError && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {correctionSubmitError}
                </div>
              )}

              {correctionSubmitHint && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <p className="font-semibold">{correctionSubmitHint.title}</p>
                  <p className="mt-1">{correctionSubmitHint.detail}</p>
                </div>
              )}

              {correctionSubmitSuccess && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {correctionSubmitSuccess}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  void submitCorrection();
                }}
                disabled={correctionSubmitLoading || !canSubmitCorrection}
                className={`mt-5 w-full rounded-lg px-4 py-2 text-sm font-medium ${
                  correctionSubmitLoading || !canSubmitCorrection
                    ? "cursor-not-allowed bg-slate-300 text-slate-600"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {correctionSubmitLoading ? "Submitting correction..." : "Submit Correction"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
