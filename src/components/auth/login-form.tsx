"use client";

import { useState } from "react";

import { signIn } from "next-auth/react";

function SubmitButton({ pending }: { pending: boolean }) {

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-(--accent) px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing in..." : "Sign In"}
    </button>
  );
}

export function LoginForm({ redirectTo = "/home" }: { redirectTo?: string }) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setErrorMessage(undefined);

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      callbackUrl: redirectTo,
      redirect: false,
    });

    setPending(false);

    if (!result || result.error) {
      setErrorMessage("Invalid email or password.");
      return;
    }

    window.location.assign(result.url ?? redirectTo);
  }

  return (
    <form
      action={async (formData) => {
        await handleSubmit(formData);
      }}
      className="rounded-[1.75rem] border border-(--border) bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="manager@prismapp.local"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Enter your password"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        ) : null}

        <SubmitButton pending={pending} />
      </div>
    </form>
  );
}