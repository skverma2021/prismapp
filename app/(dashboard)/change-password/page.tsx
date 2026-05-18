"use client";

import { useState } from "react";

import { PageHeader } from "@/src/components/shell/page-header";
import { BTN_SUBMIT, INPUT_DISABLED_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { NoticeStack } from "@/src/components/master-data/notice-stack";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 10;
  const disabled = loading || !currentPassword || newPassword.length < 10 || newPassword !== confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json() as { data?: { message?: string }; error?: { message?: string } };

      if (!res.ok) {
        setError(json.error?.message ?? "Unable to change password.");
      } else {
        setSuccess("Password changed successfully. Use your new password on the next sign-in.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: "Change Password" }]}
        eyebrow="Account"
        title="Change Password"
        description="Update your sign-in password. You must provide your current password to confirm your identity."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto max-w-md">
          <NoticeStack submitError={error} submitSuccess={success} loadError="" />

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className={INPUT_DISABLED_CLASS}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className={INPUT_DISABLED_CLASS}
              />
              {tooShort && (
                <p className="mt-1 text-xs text-red-600">Must be at least 10 characters.</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className={INPUT_DISABLED_CLASS}
              />
              {mismatch && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
              )}
            </div>

            <button type="submit" disabled={disabled} className={BTN_SUBMIT}>
              {loading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
