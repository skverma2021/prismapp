"use client";

import { useState } from "react";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/?auth=signed-out" });
      }}
      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
    >
      {pending ? "Signing Out..." : "Sign Out"}
    </button>
  );
}