"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-red-700">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            An unexpected error occurred. If this persists, please contact support.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
