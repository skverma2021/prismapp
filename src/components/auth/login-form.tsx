"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { signIn } from "next-auth/react";

type LoginFormProps = {
  redirectTo?: string;
  bannerTone?: "danger" | "info" | "success" | "warning";
  bannerMessage?: string;
};

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

export function LoginForm({
  redirectTo = "/home",
  bannerTone = "info",
  bannerMessage,
}: LoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage(undefined);

    const formData = new FormData(event.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      callbackUrl: redirectTo,
      redirect: false,
    });

    setPending(false);

    if (!result || result.error) {
      setErrorMessage(
        result?.error === "CredentialsSignin"
          ? "Invalid email or password. Use one of the seeded local accounts if you are testing locally."
          : "Unable to sign in right now. Check the entered credentials and try again."
      );
      return;
    }

    window.location.assign(result.url ?? redirectTo);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border border-(--border) bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {bannerMessage ? (
          <p
            className={[
              "rounded-xl border px-3 py-2 text-sm",
              bannerTone === "danger"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : bannerTone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : bannerTone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-50 text-slate-700",
            ].join(" ")}
          >
            {bannerMessage}
          </p>
        ) : null}

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

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Local demo credentials</p>
          <p className="mt-1">Accounts: admin@prismapp.local, manager@prismapp.local, readonly@prismapp.local</p>
          <p className="mt-1">Password: ChangeMe123! unless AUTH_SEED_PASSWORD was changed before seeding.</p>
        </div>

        <SubmitButton pending={pending} />
      </div>
    </form>
  );
}