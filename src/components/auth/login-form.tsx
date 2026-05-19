"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { signIn } from "next-auth/react";

type EnabledOAuthProviders = {
  google: boolean;
  microsoft: boolean;
};

type LoginFormProps = {
  redirectTo?: string;
  bannerTone?: "danger" | "info" | "success" | "warning";
  bannerMessage?: string;
  enabledOAuthProviders?: EnabledOAuthProviders;
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
  enabledOAuthProviders,
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

      {(enabledOAuthProviders?.google || enabledOAuthProviders?.microsoft) && (
        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {enabledOAuthProviders.google && (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: redirectTo })}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          )}

          {enabledOAuthProviders.microsoft && (
            <button
              type="button"
              onClick={() => signIn("azure-ad", { callbackUrl: redirectTo })}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Sign in with Microsoft
            </button>
          )}
        </div>
      )}
    </form>
  );
}