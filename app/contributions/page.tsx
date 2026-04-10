"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import type { IndividualLookupOption, UnitLookupOption } from "@/src/lib/master-data-lookups";
import { compareUnitsByBlockAndDescription, formatUnitLabel } from "@/src/lib/unit-format";

type Head = {
  id: number;
  description: string;
  payUnit: number;
  period: "MONTH" | "YEAR" | string;
};

type Unit = UnitLookupOption;

type ActiveResidency = {
  id: string;
  unitId: string;
  indId: string;
  individual?: {
    id: string;
    fName: string;
    sName: string;
  };
};

type IndividualOption = IndividualLookupOption;

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

function formatIndividualName(individual: IndividualOption) {
  return [individual.fName, individual.mName ?? "", individual.sName].filter(Boolean).join(" ");
}

async function fetchWithRetry<T>(url: string, fallbackMessage: string, maxAttempts = 2): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      const payload = (await response.json()) as ApiEnvelope<T>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? fallbackMessage : payload.error?.message ?? fallbackMessage);
      }

      return payload.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(fallbackMessage);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw lastError ?? new Error(fallbackMessage);
}

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

type CorrectionSuccessState = {
  correctionId: number;
  originalContributionId: number;
  correctionTransactionId: string;
  contributionHeadId: number;
  unitId: string;
  refYear: number;
  unitLabel: string;
  headDescription: string;
  detailCount: number;
};

type ContributionSuccessState = {
  contributionId: number;
  contributionHeadId: number;
  unitId: string;
  depositedBy: string;
  refYear: number;
  headDescription: string;
  unitLabel: string;
  payerLabel: string;
};

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
  const { session, sessionMode } = useAuthSession();
  const currentYear = new Date().getUTCFullYear();
  const searchParams = useSearchParams();
  const [heads, setHeads] = useState<Head[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [residentEligibleUnitIds, setResidentEligibleUnitIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState("");
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsLoadError, setUnitsLoadError] = useState("");
  const [residentEligibleLoading, setResidentEligibleLoading] = useState(false);
  const [residentEligibleLoadError, setResidentEligibleLoadError] = useState("");
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [individualsLoading, setIndividualsLoading] = useState(true);
  const [individualsLoadError, setIndividualsLoadError] = useState("");

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
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitHint, setSubmitHint] = useState<ActionHint | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<ContributionSuccessState | null>(null);
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
  const [correctionSubmitSuccess, setCorrectionSubmitSuccess] = useState<CorrectionSuccessState | null>(null);

  async function loadInitialData() {
    setLoading(true);
    setInitialLoadError("");

    try {
      const data = await fetchWithRetry<Head[]>(
        "/api/contribution-heads/lookups",
        "Unable to load contribution heads."
      );

      setHeads(data);
    } catch (error) {
      setHeads([]);
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

  async function loadUnits() {
    setUnitsLoading(true);
    setUnitsLoadError("");

    try {
      const data = await fetchWithRetry<Unit[]>("/api/units/lookups", "Unable to load units.");

      setUnits(data.sort(compareUnitsByBlockAndDescription));
    } catch (error) {
      setUnits([]);
      setUnitsLoadError(error instanceof Error ? error.message : "Unable to load units.");
    } finally {
      setUnitsLoading(false);
    }
  }

  useEffect(() => {
    void loadUnits();
  }, []);

  async function loadIndividuals() {
    setIndividualsLoading(true);
    setIndividualsLoadError("");

    try {
      const data = await fetchWithRetry<IndividualOption[]>(
        "/api/individuals/lookups",
        "Unable to load individuals."
      );

      setIndividuals(data);
    } catch (error) {
      setIndividuals([]);
      setIndividualsLoadError(error instanceof Error ? error.message : "Unable to load individuals.");
    } finally {
      setIndividualsLoading(false);
    }
  }

  useEffect(() => {
    void loadIndividuals();
  }, []);

  useEffect(() => {
    const nextHeadId = searchParams.get("headId");
    const nextUnitId = searchParams.get("unitId");
    const nextDepositedBy = searchParams.get("depositedBy");

    const parsedHeadId =
      nextHeadId && Number.isInteger(Number(nextHeadId)) && Number(nextHeadId) > 0 ? Number(nextHeadId) : "";

    setHeadId(parsedHeadId);
    setUnitId(nextUnitId?.trim() ?? "");
    setDepositedBy(nextDepositedBy?.trim() ?? "");
    setSubmitError("");
    setSubmitHint(null);
    setSubmitSuccess(null);
  }, [searchParams]);

  const deferredHeadId = useDeferredValue(headId);
  const deferredUnitId = useDeferredValue(unitId);
  const deferredDepositedBy = useDeferredValue(depositedBy);
  const deferredSelectedResidentId = useDeferredValue(selectedResidentId);

  const selectedHead = useMemo(
    () => heads.find((head) => head.id === Number(deferredHeadId)),
    [deferredHeadId, heads]
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
  const residentEligibleUnitIdSet = useMemo(() => new Set(residentEligibleUnitIds), [residentEligibleUnitIds]);

  const selectedMonths = months.filter((m) => m.selected).map((m) => m.month);
  const selectedMonthLabels = months.filter((m) => m.selected).map((m) => m.label);
  const selectedUnit = units.find((unit) => unit.id === deferredUnitId);
  const selectedDepositor = individuals.find((individual) => individual.id === deferredDepositedBy);
  const selectedResident = activeResidents.find((row) => row.indId === deferredSelectedResidentId);
  const visibleUnits = useMemo(() => {
    if (payUnit !== 2) {
      return units;
    }

    if (residentEligibleLoading && residentEligibleUnitIds.length === 0) {
      return units;
    }

    return units.filter((unit) => residentEligibleUnitIdSet.has(unit.id));
  }, [payUnit, residentEligibleLoading, residentEligibleUnitIdSet, residentEligibleUnitIds.length, units]);
  const deferredVisibleHeads = useDeferredValue(visibleHeads);
  const deferredVisibleUnits = useDeferredValue(visibleUnits);
  const deferredIndividuals = useDeferredValue(individuals);
  const deferredActiveResidents = useDeferredValue(activeResidents);

  useEffect(() => {
    if (!unitId) {
      return;
    }

    if (payUnit === 2 && residentEligibleLoading && residentEligibleUnitIds.length === 0) {
      return;
    }

    const unitStillVisible = visibleUnits.some((unit) => unit.id === unitId);
    if (!unitStillVisible) {
      setUnitId("");
      setSelectedResidentId("");
    }
  }, [payUnit, residentEligibleLoading, residentEligibleUnitIds.length, unitId, visibleUnits]);

  const isCorrectionOfCorrection =
    correctionBase?.correctionOfContributionId !== null || Boolean(correctionBase?.correctionOf);
  const actorUserId = session.userId;
  const actorRole = session.role;
  const canSubmitCorrection =
    correctionBase !== null &&
    !isCorrectionOfCorrection &&
    correctionTransactionId.trim().length > 0 &&
    correctionTransactionDateTime.trim().length > 0 &&
    correctionReasonCode.trim().length > 0 &&
    correctionReasonText.trim().length > 0 &&
    actorUserId.trim().length > 0 &&
    actorRole !== "READ_ONLY";
  const canSubmit =
    Boolean(headId) &&
    Boolean(unitId) &&
    Boolean(depositedBy.trim()) &&
    Boolean(transactionId.trim()) &&
    Boolean(transactionDateTime.trim()) &&
    actorUserId.trim().length > 0 &&
    actorRole !== "READ_ONLY" &&
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
    { label: "Dashboard session is present", ok: Boolean(actorUserId.trim()) },
    {
      label: "Dashboard role allows contribution posting",
      ok: actorRole === "SOCIETY_ADMIN" || actorRole === "MANAGER",
    },
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

  const contributionContextLinks = useMemo(() => {
    const items: Array<{ href: string | { pathname: string; query: Record<string, string> }; label: string }> = [];

    if (selectedUnit) {
      items.push(
        {
          href: { pathname: "/ownerships", query: { unitId: selectedUnit.id, activeOnly: "true" } },
          label: "Ownerships",
        },
        {
          href: { pathname: "/residencies", query: { unitId: selectedUnit.id, activeOnly: "true" } },
          label: "Residencies",
        },
        {
          href: {
            pathname: "/reports/contributions/transactions",
            query: { refYear: String(year), unitId: selectedUnit.id },
          },
          label: "Transactions",
        }
      );
    }

    if (selectedHead) {
      items.push(
        {
          href: { pathname: "/contribution-heads", query: { q: selectedHead.description } },
          label: "Head Setup",
        },
        {
          href: {
            pathname: "/reports/contributions/transactions",
            query: { refYear: String(year), headId: String(selectedHead.id) },
          },
          label: "Head Transactions",
        }
      );

      if (selectedHead.period === "MONTH" || selectedHead.period === "YEAR") {
        items.push({
          href: {
            pathname: "/reports/contributions/paid-unpaid-matrix",
            query: { refYear: String(year), headId: String(selectedHead.id) },
          },
          label: "Paid/Unpaid",
        });
      }
    }

    if (selectedDepositor) {
      items.push({
        href: { pathname: "/individuals", query: { q: selectedDepositor.sName } },
        label: "Payer Profile",
      });
    }

    return items;
  }, [selectedDepositor, selectedHead, selectedUnit, year]);

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
    if (payUnit !== 2) {
      setResidentEligibleLoadError("");
      setResidentEligibleLoading(false);
      return;
    }

    if (residentEligibleUnitIds.length > 0) {
      return;
    }

    const controller = new AbortController();

    async function loadResidentEligibleUnits() {
      setResidentEligibleLoading(true);
      setResidentEligibleLoadError("");

      try {
        const data = await fetchWithRetry<string[]>(
          "/api/residencies/eligible-unit-ids",
          "Unable to load resident-eligible units."
        );

        if (controller.signal.aborted) {
          return;
        }

        setResidentEligibleUnitIds(data);
      } catch (error) {
        if (controller.signal.aborted || (error as Error).name === "AbortError") {
          return;
        }

        setResidentEligibleUnitIds([]);
        setResidentEligibleLoadError(
          error instanceof Error ? error.message : "Unable to load resident-eligible units."
        );
      } finally {
        if (!controller.signal.aborted) {
          setResidentEligibleLoading(false);
        }
      }
    }

    void loadResidentEligibleUnits();

    return () => {
      controller.abort();
    };
  }, [payUnit, residentEligibleUnitIds.length]);

  useEffect(() => {
    if (payUnit !== 2) {
      setActiveResidents([]);
      setSelectedResidentId("");
      setActiveResidentsError("");
      return;
    }

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
  }, [payUnit, unitId]);

  useEffect(() => {
    if (payUnit !== 2) {
      return;
    }

    if (!unitId || residentEligibleUnitIdSet.has(unitId)) {
      return;
    }

    setUnitId("");
    setSelectedResidentId("");
  }, [payUnit, residentEligibleUnitIdSet, unitId]);

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
    setSubmitSuccess(null);

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

      setSubmitSuccess({
        contributionId: result.data.id,
        contributionHeadId: Number(headId),
        unitId,
        depositedBy: depositedBy.trim(),
        refYear: year,
        headDescription: selectedHead?.description ?? `Head ${String(headId)}`,
        unitLabel: selectedUnit ? formatUnitLabel(selectedUnit) : unitId,
        payerLabel: selectedDepositor ? formatIndividualName(selectedDepositor) : depositedBy.trim(),
      });

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

  async function lookupCorrectionBase(overrideId?: number) {
    setCorrectionLookupError("");
    setCorrectionSubmitError("");
    setCorrectionSubmitSuccess(null);

    const parsedId = overrideId ?? Number(correctionLookupId);
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
    setCorrectionSubmitSuccess(null);

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

      setCorrectionSubmitSuccess({
        correctionId: result.data.id,
        originalContributionId: correctionBase.id,
        correctionTransactionId: correctionTransactionId.trim(),
        contributionHeadId: correctionBase.contributionHeadId,
        unitId: correctionBase.unitId,
        refYear: correctionBase.details[0]?.contributionPeriod.refYear ?? year,
        unitLabel: correctionBase.unit?.description ?? correctionBase.unitId,
        headDescription: correctionBase.contributionHead?.description ?? "Unknown head",
        detailCount: correctionBase.details.length,
      });
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

          {loading && <InlineNotice className="mt-4" message="Loading contribution heads..." />}

          {initialLoadError && (
            <InlineNotice
              className="mt-4"
              tone="danger"
              message={initialLoadError}
              action={
                <button
                  type="button"
                  onClick={() => {
                    void loadInitialData();
                    void loadUnits();
                  }}
                  className="rounded border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Retry load
                </button>
              }
            />
          )}

          {!initialLoadError && unitsLoadError && (
            <InlineNotice
              className="mt-4"
              tone="danger"
              message={unitsLoadError}
              action={
                <button
                  type="button"
                  onClick={() => {
                    void loadUnits();
                  }}
                  className="rounded border border-rose-300 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Retry units
                </button>
              }
            />
          )}

          {!loading && !initialLoadError && heads.length === 0 && (
            <InlineNotice
              className="mt-4"
              tone="warning"
              message="No contribution heads available. Add heads before posting contributions."
            />
          )}

          {!loading && !initialLoadError && !unitsLoading && !unitsLoadError && units.length === 0 && (
            <InlineNotice
              className="mt-4"
              tone="warning"
              message="No units available. Create units before posting contributions."
            />
          )}

          <SessionContextNotice
            className="mt-4"
            mode="mutation"
            allowedRoles={["SOCIETY_ADMIN", "MANAGER"]}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Contribution Head</span>
              <select
                value={headId}
                onChange={(event) => {
                  const nextHeadId = event.target.value ? Number(event.target.value) : "";
                  startTransition(() => {
                    setHeadId(nextHeadId);
                    setMonths(defaultMonths());
                  });
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="">Select head</option>
                {deferredVisibleHeads.map((head) => (
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
                onChange={(event) => {
                  const nextUnitId = event.target.value;
                  startTransition(() => {
                    setUnitId(nextUnitId);
                    setSelectedResidentId("");
                  });
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={unitsLoading}
              >
                <option value="">
                  {unitsLoading
                    ? "Loading units..."
                    : payUnit === 2
                        ? "Select resident-eligible unit"
                        : "Select unit"}
                </option>
                {deferredVisibleUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {formatUnitLabel(unit)} (Unit ID: {unit.id})
                  </option>
                ))}
              </select>
              {unitsLoading && (
                <p className="text-xs text-slate-500">Loading units in the background...</p>
              )}
              {payUnit === 2 && (
                <p className="text-xs text-slate-500">
                  Per-person heads only show units that currently have at least one active resident.
                </p>
              )}
              {payUnit === 2 && residentEligibleLoading && (
                <p className="text-xs text-amber-700">Loading resident-eligible unit list. Showing all units until filtering is ready.</p>
              )}
              {payUnit === 2 && residentEligibleLoadError && (
                <p className="text-xs text-rose-700">{residentEligibleLoadError}</p>
              )}
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
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Payer (Deposited By)</span>
              <select
                value={depositedBy}
                onChange={(event) => {
                  const nextDepositedBy = event.target.value;
                  startTransition(() => setDepositedBy(nextDepositedBy));
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={individualsLoading}
              >
                <option value="">{individualsLoading ? "Loading individuals..." : "Select payer"}</option>
                {deferredIndividuals.map((individual) => (
                  <option key={individual.id} value={individual.id}>
                    {formatIndividualName(individual)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                This is the payer identity from Individuals. It is separate from the logged-in operator who records the entry.
              </p>
              <p className="text-xs text-slate-500">
                If a future self-service payment flow is added, this may be auto-filled from the payer session.
              </p>
              {individualsLoadError && <p className="text-xs text-rose-700">{individualsLoadError}</p>}
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 md:col-span-2">
              <p className="font-semibold text-slate-900">Recorded By (Operator Session)</p>
              <p className="mt-1">User: {actorUserId}</p>
              <p className="mt-1">Role: {actorRole}</p>
              <p className="mt-1">Adapter: {sessionMode}</p>
              <p className="mt-2 text-xs text-slate-500">
                This posting request is sourced from the authenticated operator session, not from the payer identity above.
              </p>
            </div>

            <div className="md:col-span-2">
              <ContextLinkChips label="Working Context" items={contributionContextLinks} />
            </div>
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
                    startTransition(() => {
                      setSelectedResidentId(nextId);
                      if (nextId) {
                        setDepositedBy(nextId);
                      }
                    });
                  }}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                  disabled={!unitId || activeResidentsLoading}
                >
                  <option value="">Select active resident (optional helper)</option>
                  {deferredActiveResidents.map((resident) => {
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

          {isMonthly && ledgerLoading && <InlineNotice className="mt-3 text-xs" message="Loading month ledger..." />}

          {isMonthly && ledgerError && (
            <InlineNotice className="mt-3 text-xs" tone="danger" message={ledgerError} />
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
            <InlineNotice
              className="mt-4 border-dashed rounded-xl p-4 text-slate-600"
              message="Select contribution head to unlock period controls."
            />
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

          {submitError && <InlineNotice className="mt-4" tone="danger" message={submitError} />}

          {submitHint && (
            <InlineNotice
              className="mt-4"
              tone="warning"
              title={submitHint.title}
              message={submitHint.detail}
            />
          )}

          {submitSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold text-emerald-900">Contribution recorded successfully</p>
              <p className="mt-1">Contribution {submitSuccess.contributionId} has been posted successfully.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <p>
                  <span className="font-semibold">Head:</span> {submitSuccess.headDescription}
                </p>
                <p>
                  <span className="font-semibold">Unit:</span> {submitSuccess.unitLabel}
                </p>
                <p>
                  <span className="font-semibold">Payer:</span> {submitSuccess.payerLabel}
                </p>
                <p>
                  <span className="font-semibold">Year:</span> {submitSuccess.refYear}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void copyValue(String(submitSuccess.contributionId), "contribution-id");
                  }}
                  className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  {copiedKey === "contribution-id" ? "Copied contribution ID" : "Copy contribution ID"}
                </button>
              </div>
              <div className="mt-3">
                <ContextLinkChips
                  label="Next"
                  items={[
                    {
                      href: {
                        pathname: "/reports/contributions/transactions",
                        query: {
                          refYear: String(submitSuccess.refYear),
                          headId: String(submitSuccess.contributionHeadId),
                          unitId: submitSuccess.unitId,
                          depositedBy: submitSuccess.depositedBy,
                        },
                      },
                      label: "View Transaction",
                    },
                    {
                      href: {
                        pathname: "/reports/contributions/paid-unpaid-matrix",
                        query: {
                          refYear: String(submitSuccess.refYear),
                          headId: String(submitSuccess.contributionHeadId),
                        },
                      },
                      label: "Paid/Unpaid",
                    },
                    {
                      href: {
                        pathname: "/contributions",
                        query: {
                          headId: String(submitSuccess.contributionHeadId),
                          unitId: submitSuccess.unitId,
                          depositedBy: submitSuccess.depositedBy,
                        },
                      },
                      label: "Record Another",
                    },
                  ]}
                />
              </div>
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
            <InlineNotice className="mt-4" tone="danger" message={correctionLookupError} />
          )}

          {!correctionLookupLoading && !correctionLookupError && !correctionBase && (
            <InlineNotice
              className="mt-4"
              message="Lookup an original contribution ID to load correction details and enable submission."
            />
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
                <InlineNotice
                  className="mt-4"
                  tone="warning"
                  message="Selected entry is already a correction. Correction-of-correction is not allowed."
                />
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
                <InlineNotice className="mt-4" tone="danger" message={correctionSubmitError} />
              )}

              {correctionSubmitHint && (
                <InlineNotice
                  className="mt-4"
                  tone="warning"
                  title={correctionSubmitHint.title}
                  message={correctionSubmitHint.detail}
                />
              )}

              {correctionSubmitSuccess && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold text-emerald-900">Correction recorded successfully</p>
                  <p className="mt-1">
                    Correction {correctionSubmitSuccess.correctionId} has been posted against original contribution {correctionSubmitSuccess.originalContributionId}.
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <p>
                      <span className="font-semibold">Head:</span> {correctionSubmitSuccess.headDescription}
                    </p>
                    <p>
                      <span className="font-semibold">Unit:</span> {correctionSubmitSuccess.unitLabel}
                    </p>
                    <p>
                      <span className="font-semibold">Correction Txn:</span> {correctionSubmitSuccess.correctionTransactionId}
                    </p>
                    <p>
                      <span className="font-semibold">Detail Rows Reversed:</span> {correctionSubmitSuccess.detailCount}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void copyValue(String(correctionSubmitSuccess.correctionId), "correction-id");
                      }}
                      className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      {copiedKey === "correction-id" ? "Copied correction ID" : "Copy correction ID"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectionLookupId(String(correctionSubmitSuccess.correctionId));
                        void lookupCorrectionBase(correctionSubmitSuccess.correctionId);
                      }}
                      className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      Load posted correction
                    </button>
                  </div>
                  <div className="mt-3">
                    <ContextLinkChips
                      label="Next"
                      items={[
                        {
                          href: {
                            pathname: "/reports/contributions/transactions",
                            query: {
                              refYear: String(correctionSubmitSuccess.refYear),
                              headId: String(correctionSubmitSuccess.contributionHeadId),
                              unitId: correctionSubmitSuccess.unitId,
                            },
                          },
                          label: "Transactions",
                        },
                        {
                          href: {
                            pathname: "/reports/contributions/paid-unpaid-matrix",
                            query: {
                              refYear: String(correctionSubmitSuccess.refYear),
                              headId: String(correctionSubmitSuccess.contributionHeadId),
                            },
                          },
                          label: "Paid/Unpaid",
                        },
                        {
                          href: {
                            pathname: "/contributions",
                            query: {
                              headId: String(correctionSubmitSuccess.contributionHeadId),
                              unitId: correctionSubmitSuccess.unitId,
                            },
                          },
                          label: "Contribution Capture",
                        },
                      ]}
                    />
                  </div>
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
