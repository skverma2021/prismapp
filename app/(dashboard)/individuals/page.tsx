"use client";

import { useEffect, useState } from "react";

import { BrowseFilterBar, BTN_DELETE, BTN_EDIT, BTN_SAVE, BTN_CANCEL, BTN_SUBMIT, INPUT_DISABLED_CLASS, INPUT_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { invalidateIndividualLookups } from "@/src/lib/master-data-lookups";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";

type GenderType = {
  id: number;
  description: string;
};

type IndividualItem = {
  id: string;
  fName: string;
  mName?: string | null;
  sName: string;
  eMail: string;
  mobile: string;
  altMobile?: string | null;
  genderId: number;
  createdAt: string;
  genderType?: {
    id: number;
    description: string;
  };
};

type IndividualFormState = {
  fName: string;
  mName: string;
  sName: string;
  eMail: string;
  mobile: string;
  altMobile: string;
  genderId: string;
};

const emptyFormState: IndividualFormState = {
  fName: "",
  mName: "",
  sName: "",
  eMail: "",
  mobile: "",
  altMobile: "",
  genderId: "",
};

type SortOption = "sName" | "fName" | "eMail" | "createdAt";

const SORT_OPTIONS = [
  { value: "sName" as const, label: "Sort by surname" },
  { value: "fName" as const, label: "Sort by first name" },
  { value: "eMail" as const, label: "Sort by email" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

function formatIndividualName(item: Pick<IndividualItem, "fName" | "mName" | "sName">) {
  return [item.fName, item.mName ?? "", item.sName].filter(Boolean).join(" ");
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

function maskMobile(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(value.length - 4, 2))}${value.slice(-4)}`;
}

export default function IndividualsPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";
  const maskSensitiveFields = session.role === "READ_ONLY";

  const browse = useBrowseState<IndividualItem, SortOption>({
    endpoint: "/api/individuals",
    errorMessage: "Unable to load individuals.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "sName",
    defaultSortDir: "asc",
    filters: [{ key: "q" }, { key: "genderId" }],
  });

  const crud = useCrudActions({
    setSubmitError: browse.setSubmitError,
    setSubmitSuccess: browse.setSubmitSuccess,
  });

  // Gender types lookup
  const [genderTypes, setGenderTypes] = useState<GenderType[]>([]);

  useEffect(() => {
    async function loadGenderTypes() {
      try {
        const data = await fetchJsonWithRetry<GenderType[]>("/api/gender-types", "Unable to load gender types.");
        setGenderTypes(data);
      } catch {
        setGenderTypes([]);
      }
    }
    void loadGenderTypes();
  }, []);

  const [createState, setCreateState] = useState<IndividualFormState>(emptyFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<IndividualFormState>(emptyFormState);

  function handleCreate() {
    void crud.create<IndividualItem>({
      endpoint: "/api/individuals",
      body: {
        fName: createState.fName.trim(),
        mName: createState.mName.trim() || undefined,
        sName: createState.sName.trim(),
        eMail: createState.eMail.trim(),
        mobile: createState.mobile.trim(),
        altMobile: createState.altMobile.trim() || undefined,
        genderId: Number(createState.genderId),
      },
      errorMessage: "Unable to create individual.",
      onSuccess: (data) => {
        invalidateIndividualLookups();
        setCreateState(emptyFormState);
        browse.setSubmitSuccess(`Individual created: ${formatIndividualName(data)}`);
        browse.setPage(1);
      },
    });
  }

  function handleUpdate(id: string) {
    void crud.update<IndividualItem>({
      endpoint: `/api/individuals/${id}`,
      body: {
        fName: editingState.fName.trim(),
        mName: editingState.mName.trim() || undefined,
        sName: editingState.sName.trim(),
        eMail: editingState.eMail.trim(),
        mobile: editingState.mobile.trim(),
        altMobile: editingState.altMobile.trim() || undefined,
        genderId: Number(editingState.genderId),
      },
      errorMessage: "Unable to update individual.",
      onSuccess: (data) => {
        invalidateIndividualLookups();
        setEditingId(null);
        setEditingState(emptyFormState);
        browse.setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, ...data, genderType: genderTypes.find((g) => g.id === data.genderId) ?? item.genderType }
              : item
          )
        );
        browse.setSubmitSuccess(`Individual updated: ${formatIndividualName(data)}`);
      },
    });
  }

  function handleDelete(id: string) {
    void crud.remove({
      id,
      endpoint: `/api/individuals/${id}`,
      errorMessage: "Unable to delete individual.",
      onSuccess: () => {
        invalidateIndividualLookups();
        browse.setSubmitSuccess("Individual deleted.");
        const nextCount = browse.items.length - 1;
        if (nextCount === 0 && browse.page > 1) {
          browse.setPage(browse.page - 1);
        } else {
          browse.setItems((prev) => prev.filter((item) => item.id !== id));
          browse.setTotalItems((prev) => Math.max(prev - 1, 0));
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      <MasterDataNav />

      <SessionContextNotice className="mt-4" mode="mutation" allowedRoles={["SOCIETY_ADMIN", "MANAGER"]} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--accent-strong)">Master Data</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Individuals</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage people who can act as owners, residents, or payers in contribution capture and timeline workflows.
            </p>
          </div>
          <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS} minWidth="sm:min-w-85">
            <input
              value={browse.query}
              onChange={(e) => browse.setQuery(e.target.value)}
              placeholder="Search name, email, or mobile"
              className={INPUT_CLASS}
            />
            <select
              value={browse.filters["genderId"] ?? ""}
              onChange={(e) => browse.setFilter("genderId", e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">All genders</option>
              {genderTypes.map((gender) => (
                <option key={gender.id} value={gender.id}>{gender.description}</option>
              ))}
            </select>
          </BrowseFilterBar>
        </div>

        {maskSensitiveFields ? (
          <InlineNotice
            className="mt-4"
            tone="info"
            title="Masked read-only view"
            message="Email and mobile are masked in this screen for read-only sessions. Manager and admin sessions retain full visibility for operational work."
          />
        ) : null}

        <NoticeStack submitError={browse.submitError} submitSuccess={browse.submitSuccess} loadError={browse.loadError} />

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Individual</p>
            <p className="mt-1 text-sm text-slate-600">Email and mobile must remain unique across all individuals.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={createState.fName} onChange={(e) => setCreateState((prev) => ({ ...prev, fName: e.target.value }))} placeholder="First name" disabled={!canMutate || crud.createLoading} className={INPUT_DISABLED_CLASS} />
              <input value={createState.mName} onChange={(e) => setCreateState((prev) => ({ ...prev, mName: e.target.value }))} placeholder="Middle name (optional)" disabled={!canMutate || crud.createLoading} className={INPUT_DISABLED_CLASS} />
              <input value={createState.sName} onChange={(e) => setCreateState((prev) => ({ ...prev, sName: e.target.value }))} placeholder="Surname" disabled={!canMutate || crud.createLoading} className={INPUT_DISABLED_CLASS} />
              <select value={createState.genderId} onChange={(e) => setCreateState((prev) => ({ ...prev, genderId: e.target.value }))} disabled={!canMutate || crud.createLoading} className={INPUT_DISABLED_CLASS}>
                <option value="">Select gender</option>
                {genderTypes.map((gender) => (
                  <option key={gender.id} value={gender.id}>{gender.description}</option>
                ))}
              </select>
              <input value={createState.eMail} onChange={(e) => setCreateState((prev) => ({ ...prev, eMail: e.target.value }))} placeholder="Email" disabled={!canMutate || crud.createLoading} className={`${INPUT_DISABLED_CLASS} md:col-span-2`} />
              <input value={createState.mobile} onChange={(e) => setCreateState((prev) => ({ ...prev, mobile: e.target.value }))} placeholder="Primary mobile" disabled={!canMutate || crud.createLoading} className={INPUT_DISABLED_CLASS} />
              <input value={createState.altMobile} onChange={(e) => setCreateState((prev) => ({ ...prev, altMobile: e.target.value }))} placeholder="Alternate mobile (optional)" disabled={!canMutate || crud.createLoading} className={INPUT_DISABLED_CLASS} />
              <button
                type="button"
                disabled={
                  !canMutate ||
                  crud.createLoading ||
                  createState.fName.trim().length === 0 ||
                  createState.sName.trim().length === 0 ||
                  createState.eMail.trim().length === 0 ||
                  createState.mobile.trim().length === 0 ||
                  createState.genderId.length === 0
                }
                onClick={handleCreate}
                className={`${BTN_SUBMIT} md:col-span-2`}
              >
                {crud.createLoading ? "Creating..." : "Create Individual"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<IndividualItem>
              columns={[
                {
                  header: "Name",
                  render: (item) =>
                    editingId === item.id ? (
                      <div className="grid gap-2">
                        <input value={editingState.fName} onChange={(e) => setEditingState((prev) => ({ ...prev, fName: e.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                        <input value={editingState.mName} onChange={(e) => setEditingState((prev) => ({ ...prev, mName: e.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Middle name" />
                        <input value={editingState.sName} onChange={(e) => setEditingState((prev) => ({ ...prev, sName: e.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                      </div>
                    ) : (
                      formatIndividualName(item)
                    ),
                },
                {
                  header: "Gender",
                  render: (item) =>
                    editingId === item.id ? (
                      <select value={editingState.genderId} onChange={(e) => setEditingState((prev) => ({ ...prev, genderId: e.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">Select gender</option>
                        {genderTypes.map((gender) => (
                          <option key={gender.id} value={gender.id}>{gender.description}</option>
                        ))}
                      </select>
                    ) : (
                      item.genderType?.description ?? item.genderId
                    ),
                },
                {
                  header: "Email",
                  render: (item) =>
                    editingId === item.id ? (
                      <input value={editingState.eMail} onChange={(e) => setEditingState((prev) => ({ ...prev, eMail: e.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                    ) : maskSensitiveFields ? (
                      maskEmail(item.eMail)
                    ) : (
                      item.eMail
                    ),
                },
                {
                  header: "Mobile",
                  render: (item) =>
                    editingId === item.id ? (
                      <div className="grid gap-2">
                        <input value={editingState.mobile} onChange={(e) => setEditingState((prev) => ({ ...prev, mobile: e.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                        <input value={editingState.altMobile} onChange={(e) => setEditingState((prev) => ({ ...prev, altMobile: e.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Alt mobile" />
                      </div>
                    ) : maskSensitiveFields ? (
                      maskMobile(item.mobile)
                    ) : (
                      item.mobile
                    ),
                },
                {
                  header: "Actions",
                  render: (item) => (
                    <div className="flex flex-wrap gap-2">
                      {editingId === item.id ? (
                        <>
                          <button
                            type="button"
                            disabled={
                              editingState.fName.trim().length === 0 ||
                              editingState.sName.trim().length === 0 ||
                              editingState.eMail.trim().length === 0 ||
                              editingState.mobile.trim().length === 0 ||
                              editingState.genderId.length === 0
                            }
                            onClick={() => handleUpdate(item.id)}
                            className={BTN_SAVE}
                          >
                            Save
                          </button>
                          <button type="button" onClick={() => { setEditingId(null); setEditingState(emptyFormState); }} className={BTN_CANCEL}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={!canMutate}
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingState({
                                fName: item.fName,
                                mName: item.mName ?? "",
                                sName: item.sName,
                                eMail: item.eMail,
                                mobile: item.mobile,
                                altMobile: item.altMobile ?? "",
                                genderId: String(item.genderId),
                              });
                            }}
                            className={BTN_EDIT}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!canMutate || crud.deleteLoadingId === item.id}
                            onClick={() => handleDelete(item.id)}
                            className={BTN_DELETE}
                          >
                            {crud.deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                          </button>
                          <ContextLinkChips
                            label="Go To"
                            items={[
                              { href: { pathname: "/ownerships", query: { indId: item.id, activeOnly: "true" } }, label: "Ownerships" },
                              { href: { pathname: "/residencies", query: { indId: item.id, activeOnly: "true" } }, label: "Residencies" },
                              { href: { pathname: "/contributions", query: { depositedBy: item.id } }, label: "Contribution Capture" },
                              { href: { pathname: "/reports/contributions/transactions", query: { refYear: String(new Date().getUTCFullYear()), depositedBy: item.id } }, label: "Transactions" },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
              loadingMessage="Loading individuals..."
              emptyMessage="No individuals found for the current filter."
              rowKey={(item) => item.id}
            />
          </div>
        </div>
      </section>
    </div>
  );
}