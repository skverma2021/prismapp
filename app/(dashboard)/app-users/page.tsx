"use client";

import { useEffect, useState } from "react";

import { BrowseFilterBar, BTN_CANCEL, BTN_SAVE, BTN_SUBMIT, INPUT_CLASS, INPUT_DISABLED_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";

type AppUserItem = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type AvailableIndividual = {
  id: string;
  fName: string;
  mName: string | null;
  sName: string;
  eMail: string;
};

type SortOption = "displayName" | "email" | "role" | "createdAt";

const SORT_OPTIONS = [
  { value: "displayName" as const, label: "Sort by name" },
  { value: "email" as const, label: "Sort by email" },
  { value: "role" as const, label: "Sort by role" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "SOCIETY_ADMIN", label: "Society Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "READ_ONLY", label: "Read Only" },
];

const ROLE_LABELS: Record<string, string> = {
  SOCIETY_ADMIN: "Society Admin",
  MANAGER: "Manager",
  READ_ONLY: "Read Only",
};

const EMPTY_CREATE = { individualId: "", password: "", role: "MANAGER" };

function fullName(ind: AvailableIndividual) {
  return [ind.fName, ind.mName, ind.sName].filter(Boolean).join(" ");
}

export default function AppUsersPage() {
  const browse = useBrowseState<AppUserItem, SortOption>({
    endpoint: "/api/app-users",
    errorMessage: "Unable to load app users.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "displayName",
    defaultSortDir: "asc",
    filters: [{ key: "q" }, { key: "role" }],
  });

  const crud = useCrudActions({
    setSubmitError: browse.setSubmitError,
    setSubmitSuccess: browse.setSubmitSuccess,
  });

  const [form, setForm] = useState(EMPTY_CREATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", role: "MANAGER", isActive: true, password: "" });
  const [roleFilter, setRoleFilter] = useState("");
  const [availableIndividuals, setAvailableIndividuals] = useState<AvailableIndividual[]>([]);

  useEffect(() => {
    fetch("/api/individuals/available-for-app-user")
      .then((r) => r.json() as Promise<{ data?: AvailableIndividual[] }>)
      .then((j) => { if (j.data) setAvailableIndividuals(j.data); })
      .catch(() => { /* non-critical â€” picker will show empty */ });
  }, []);

  const selectedIndividual = availableIndividuals.find((ind) => ind.id === form.individualId);

  function handleCreate() {
    void crud.create<AppUserItem>({
      endpoint: "/api/app-users",
      body: { individualId: form.individualId, password: form.password, role: form.role },
      errorMessage: "Unable to create user.",
      onSuccess: (data) => {
        setForm(EMPTY_CREATE);
        // Remove the newly linked individual from the available list.
        setAvailableIndividuals((prev) => prev.filter((ind) => ind.eMail !== data.email));
        browse.setSubmitSuccess(`User created: ${data.displayName} (${data.email})`);
        browse.setPage(1);
      },
    });
  }

  function startEdit(item: AppUserItem) {
    setEditingId(item.id);
    setEditForm({ displayName: item.displayName, role: item.role, isActive: item.isActive, password: "" });
  }

  function handleUpdate(id: string) {
    const body: Record<string, unknown> = {
      displayName: editForm.displayName.trim(),
      role: editForm.role,
      isActive: editForm.isActive,
    };
    if (editForm.password.trim()) {
      body.password = editForm.password;
    }
    void crud.update<AppUserItem>({
      endpoint: `/api/app-users/${id}`,
      body,
      errorMessage: "Unable to update user.",
      onSuccess: (data) => {
        setEditingId(null);
        browse.setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
        browse.setSubmitSuccess(`User updated: ${data.displayName}`);
      },
    });
  }

  const createDisabled =
    crud.createLoading ||
    !form.individualId ||
    form.password.length < 10 ||
    !form.role;

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice className="mt-4" mode="mutation" allowedRoles={["SOCIETY_ADMIN"]} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">Administration</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">App Users</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Create operator accounts by selecting a registered individual. The individual&apos;s email becomes the sign-in
              credential. Assign a role and initial password (min 10 characters). Users can change their own password after sign-in.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); browse.setFilter("role", e.target.value); browse.setPage(1); }}
              className={INPUT_CLASS}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS}>
              <input
                value={browse.query}
                onChange={(e) => browse.setQuery(e.target.value)}
                placeholder="Search name or email"
                className={INPUT_CLASS}
              />
            </BrowseFilterBar>
          </div>
        </div>

        <NoticeStack submitError={browse.submitError} submitSuccess={browse.submitSuccess} loadError={browse.loadError} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Create form */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create User</p>
            <p className="mt-1 text-xs text-slate-500">
              Only registered individuals without an existing account appear in the list.
            </p>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Individual</label>
                <select
                  value={form.individualId}
                  onChange={(e) => setForm((f) => ({ ...f, individualId: e.target.value }))}
                  disabled={crud.createLoading}
                  className={INPUT_DISABLED_CLASS}
                >
                  <option value="">â€” select individual â€”</option>
                  {availableIndividuals.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {fullName(ind)} â€” {ind.eMail}
                    </option>
                  ))}
                </select>
                {availableIndividuals.length === 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    All registered individuals already have accounts, or none exist yet.
                  </p>
                )}
              </div>

              {selectedIndividual && (
                <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 border border-slate-200">
                  Sign-in email: <span className="font-medium">{selectedIndividual.eMail}</span>
                </p>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  disabled={crud.createLoading}
                  className={INPUT_DISABLED_CLASS}
                >
                  <option value="SOCIETY_ADMIN">Society Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="READ_ONLY">Read Only</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Initial password (min 10 chars)</label>
                <input
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Set initial password"
                  type="password"
                  disabled={crud.createLoading}
                  className={INPUT_DISABLED_CLASS}
                />
              </div>

              <button
                type="button"
                disabled={createDisabled}
                onClick={handleCreate}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<AppUserItem>
              loading={browse.loading}
              items={browse.items}
              rowKey={(item) => item.id}
              columns={[
                {
                  header: "Name / Email",
                  render: (item) =>
                    editingId === item.id ? (
                      <input
                        value={editForm.displayName}
                        onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    ) : (
                      <div>
                        <p className="font-medium text-slate-900">{item.displayName}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </div>
                    ),
                },
                {
                  header: "Role",
                  render: (item) =>
                    editingId === item.id ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        <option value="SOCIETY_ADMIN">Society Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="READ_ONLY">Read Only</option>
                      </select>
                    ) : (
                      ROLE_LABELS[item.role] ?? item.role
                    ),
                },
                {
                  header: "Status",
                  render: (item) =>
                    editingId === item.id ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                        />
                        Active
                      </label>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    ),
                },
                {
                  header: "Admin reset password",
                  render: (item) =>
                    editingId === item.id ? (
                      <input
                        value={editForm.password}
                        onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Leave blank to keep"
                        type="password"
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs">â€”</span>
                    ),
                },
                {
                  header: "Actions",
                  render: (item) =>
                    editingId === item.id ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!editForm.displayName.trim() || (!!editForm.password && editForm.password.length < 10)}
                          onClick={() => handleUpdate(item.id)}
                          className={BTN_SAVE}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className={BTN_CANCEL}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Edit
                      </button>
                    ),
                },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
