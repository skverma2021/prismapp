export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <main className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">PrismApp</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Society Contribution Module</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Core contribution APIs are active. Capture flow UI scaffolding is now available and ready for
          integration with ledger selection and posting.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/contributions"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Open Contribution Capture
          </a>
          <a
            href="/reports/contributions/transactions"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Open Transactions Report UI
          </a>
          <a
            href="/reports/contributions/paid-unpaid-matrix"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Open Paid/Unpaid Matrix UI
          </a>
          <a
            href="/api/reports/contributions/transactions?refYear=2026"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Check Transactions API
          </a>
        </div>
      </main>
    </div>
  );
}
