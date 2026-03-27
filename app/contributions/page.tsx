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

type MonthState = {
  month: number;
  label: string;
  selected: boolean;
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

function defaultMonths(): MonthState[] {
  return MONTHS.map((label, index) => ({ month: index + 1, label, selected: false }));
}

function payUnitLabel(payUnit: number) {
  if (payUnit === 1) return "Per Sq Ft";
  if (payUnit === 2) return "Per Person";
  if (payUnit === 3) return "Lumpsum";
  return "Unknown";
}

export default function ContributionCapturePage() {
  const currentYear = new Date().getUTCFullYear();
  const [heads, setHeads] = useState<Head[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [headsRes, unitsRes] = await Promise.all([
          fetch("/api/contribution-heads?page=1&pageSize=100&sortBy=description&sortDir=asc"),
          fetch("/api/units?page=1&pageSize=100&sortBy=description&sortDir=asc"),
        ]);

        const headsJson = await headsRes.json();
        const unitsJson = await unitsRes.json();

        setHeads(headsJson?.data?.items ?? []);
        setUnits(unitsJson?.data?.items ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const selectedHead = useMemo(
    () => heads.find((head) => head.id === Number(headId)),
    [heads, headId]
  );

  const periodType = (selectedHead?.period ?? "").toUpperCase();
  const isMonthly = periodType === "MONTH";
  const isYearly = periodType === "YEAR";
  const payUnit = selectedHead?.payUnit;

  const selectedMonths = months.filter((m) => m.selected).map((m) => m.month);

  function toggleMonth(month: number) {
    setMonths((prev) =>
      prev.map((row) => (row.month === month ? { ...row, selected: !row.selected } : row))
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-8">
      <main className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Day 2 Scaffold</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Record Contribution</h1>
          <p className="mt-2 text-sm text-slate-600">
            Skeleton form with payUnit-aware fields and explicit period selection. Submit wiring and
            ledger-backed statuses are scheduled in upcoming days.
          </p>

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
                {heads.map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.description} ({payUnitLabel(head.payUnit)} | {head.period})
                  </option>
                ))}
              </select>
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
                    {unit.description}
                  </option>
                ))}
              </select>
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
          </div>

          {payUnit === 2 && (
            <div className="mt-4 grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-2">
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
            Explicit selection only. Ledger-backed paid/unpaid statuses will be integrated in Day 3.
          </p>

          {isMonthly && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {months.map((row) => (
                <button
                  key={row.month}
                  type="button"
                  onClick={() => toggleMonth(row.month)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    row.selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {row.label}
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
              Selected months: {selectedMonths.length > 0 ? selectedMonths.join(", ") : "None"}
            </p>
            <p className="mt-2">Submit wiring is planned for Day 4.</p>
          </div>

          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
          >
            Record Contribution (Disabled in Day 2)
          </button>
        </section>
      </main>
    </div>
  );
}
