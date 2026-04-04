"use client";

import { useEffect, useState } from "react";

import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
      };
    };

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

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

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

function formatIndividualName(item: Pick<IndividualItem, "fName" | "mName" | "sName">) {
  return [item.fName, item.mName ?? "", item.sName].filter(Boolean).join(" ");
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");

  if (!local || !domain) {
    return value;
  }

  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

function maskMobile(value: string) {
  if (value.length <= 4) {
    return value;
  }

  return `${"*".repeat(Math.max(value.length - 4, 2))}${value.slice(-4)}`;
}

export default function IndividualsPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";
  const maskSensitiveFields = session.role === "READ_ONLY";

  const [items, setItems] = useState<IndividualItem[]>([]);
  const [genderTypes, setGenderTypes] = useState<GenderType[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [appliedGenderFilter, setAppliedGenderFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("sName");
  const [appliedSortBy, setAppliedSortBy] = useState<SortOption>("sName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [appliedSortDir, setAppliedSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [createState, setCreateState] = useState<IndividualFormState>(emptyFormState);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<IndividualFormState>(emptyFormState);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadGenderTypes() {
      try {
        const response = await fetch("/api/gender-types");
        const payload = (await response.json()) as ApiEnvelope<GenderType[]>;

        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, "Unable to load gender types."));
        }

        setGenderTypes(payload.data);
      } catch (error) {
        setGenderTypes([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load gender types.");
      }
    }

    void loadGenderTypes();
  }, []);

  useEffect(() => {
    async function loadIndividuals() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
          sortBy: appliedSortBy,
          sortDir: appliedSortDir,
        });

        if (appliedQuery.trim()) {
          params.set("q", appliedQuery.trim());
        }

        if (appliedGenderFilter) {
          params.set("genderId", appliedGenderFilter);
        }

        const response = await fetch(`/api/individuals?${params.toString()}`);
        const payload = (await response.json()) as ApiEnvelope<PaginatedResponse<IndividualItem>>;

        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, "Unable to load individuals."));
        }

        setItems(payload.data.items);
        setTotalPages(Math.max(payload.data.totalPages, 1));
        setTotalItems(payload.data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load individuals.");
      } finally {
        setLoading(false);
      }
    }

    void loadIndividuals();
  }, [appliedGenderFilter, appliedQuery, appliedSortBy, appliedSortDir, page]);

  async function createIndividual() {
    setCreateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/individuals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fName: createState.fName.trim(),
          mName: createState.mName.trim() || undefined,
          sName: createState.sName.trim(),
          eMail: createState.eMail.trim(),
          mobile: createState.mobile.trim(),
          altMobile: createState.altMobile.trim() || undefined,
          genderId: Number(createState.genderId),
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<IndividualItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to create individual."));
      }

      setCreateState(emptyFormState);
      setSubmitSuccess(`Individual created: ${formatIndividualName(payload.data)}`);
      setPage(1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create individual.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function updateIndividual(id: string) {
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/individuals/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fName: editingState.fName.trim(),
          mName: editingState.mName.trim() || undefined,
          sName: editingState.sName.trim(),
          eMail: editingState.eMail.trim(),
          mobile: editingState.mobile.trim(),
          altMobile: editingState.altMobile.trim() || undefined,
          genderId: Number(editingState.genderId),
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<IndividualItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update individual."));
      }

      setEditingId(null);
      setEditingState(emptyFormState);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload.data,
                genderType:
                  genderTypes.find((gender) => gender.id === payload.data.genderId) ?? item.genderType,
              }
            : item
        )
      );
      setSubmitSuccess(`Individual updated: ${formatIndividualName(payload.data)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update individual.");
    }
  }

  async function deleteIndividual(id: string) {
    setDeleteLoadingId(id);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/individuals/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiEnvelope<null>;
        throw new Error(toErrorMessage(payload, "Unable to delete individual."));
      }

      const nextCount = items.length - 1;
      setSubmitSuccess("Individual deleted.");

      if (nextCount === 0 && page > 1) {
        setPage(page - 1);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setTotalItems((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to delete individual.");
    } finally {
      setDeleteLoadingId(null);
    }
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
          <div className="grid gap-2 sm:min-w-85">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, or mobile"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All genders</option>
                {genderTypes.map((gender) => (
                  <option key={gender.id} value={gender.id}>
                    {gender.description}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="sName">Sort by surname</option>
                <option value="fName">Sort by first name</option>
                <option value="eMail">Sort by email</option>
                <option value="createdAt">Sort by created time</option>
              </select>
            </div>
            <select
              value={sortDir}
              onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setAppliedQuery(query);
                  setAppliedGenderFilter(genderFilter);
                  setAppliedSortBy(sortBy);
                  setAppliedSortDir(sortDir);
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setGenderFilter("");
                  setSortBy("sName");
                  setSortDir("asc");
                  setAppliedQuery("");
                  setAppliedGenderFilter("");
                  setAppliedSortBy("sName");
                  setAppliedSortDir("asc");
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {maskSensitiveFields ? (
          <InlineNotice
            className="mt-4"
            tone="info"
            title="Masked read-only view"
            message="Email and mobile are masked in this screen for read-only sessions. Manager and admin sessions retain full visibility for operational work." 
          />
        ) : null}

        {submitError ? <InlineNotice className="mt-4" tone="danger" message={submitError} /> : null}
        {submitSuccess ? <InlineNotice className="mt-4" tone="success" message={submitSuccess} /> : null}
        {loadError ? <InlineNotice className="mt-4" tone="danger" message={loadError} /> : null}

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Individual</p>
            <p className="mt-1 text-sm text-slate-600">Email and mobile must remain unique across all individuals.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={createState.fName} onChange={(event) => setCreateState((prev) => ({ ...prev, fName: event.target.value }))} placeholder="First name" disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <input value={createState.mName} onChange={(event) => setCreateState((prev) => ({ ...prev, mName: event.target.value }))} placeholder="Middle name (optional)" disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <input value={createState.sName} onChange={(event) => setCreateState((prev) => ({ ...prev, sName: event.target.value }))} placeholder="Surname" disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <select value={createState.genderId} onChange={(event) => setCreateState((prev) => ({ ...prev, genderId: event.target.value }))} disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">
                <option value="">Select gender</option>
                {genderTypes.map((gender) => (
                  <option key={gender.id} value={gender.id}>
                    {gender.description}
                  </option>
                ))}
              </select>
              <input value={createState.eMail} onChange={(event) => setCreateState((prev) => ({ ...prev, eMail: event.target.value }))} placeholder="Email" disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 md:col-span-2" />
              <input value={createState.mobile} onChange={(event) => setCreateState((prev) => ({ ...prev, mobile: event.target.value }))} placeholder="Primary mobile" disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <input value={createState.altMobile} onChange={(event) => setCreateState((prev) => ({ ...prev, altMobile: event.target.value }))} placeholder="Alternate mobile (optional)" disabled={!canMutate || createLoading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" />
              <button
                type="button"
                disabled={
                  !canMutate ||
                  createLoading ||
                  createState.fName.trim().length === 0 ||
                  createState.sName.trim().length === 0 ||
                  createState.eMail.trim().length === 0 ||
                  createState.mobile.trim().length === 0 ||
                  createState.genderId.length === 0
                }
                onClick={() => {
                  void createIndividual();
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 md:col-span-2"
              >
                {createLoading ? "Creating..." : "Create Individual"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Gender</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Mobile</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-600" colSpan={5}>
                        Loading individuals...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-600" colSpan={5}>
                        No individuals found for the current filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top text-slate-700">
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <div className="grid gap-2">
                              <input value={editingState.fName} onChange={(event) => setEditingState((prev) => ({ ...prev, fName: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                              <input value={editingState.mName} onChange={(event) => setEditingState((prev) => ({ ...prev, mName: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Middle name" />
                              <input value={editingState.sName} onChange={(event) => setEditingState((prev) => ({ ...prev, sName: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                            </div>
                          ) : (
                            formatIndividualName(item)
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <select value={editingState.genderId} onChange={(event) => setEditingState((prev) => ({ ...prev, genderId: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                              <option value="">Select gender</option>
                              {genderTypes.map((gender) => (
                                <option key={gender.id} value={gender.id}>
                                  {gender.description}
                                </option>
                              ))}
                            </select>
                          ) : (
                            item.genderType?.description ?? item.genderId
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <input value={editingState.eMail} onChange={(event) => setEditingState((prev) => ({ ...prev, eMail: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                          ) : maskSensitiveFields ? (
                            maskEmail(item.eMail)
                          ) : (
                            item.eMail
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <div className="grid gap-2">
                              <input value={editingState.mobile} onChange={(event) => setEditingState((prev) => ({ ...prev, mobile: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
                              <input value={editingState.altMobile} onChange={(event) => setEditingState((prev) => ({ ...prev, altMobile: event.target.value }))} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Alt mobile" />
                            </div>
                          ) : maskSensitiveFields ? (
                            maskMobile(item.mobile)
                          ) : (
                            item.mobile
                          )}
                        </td>
                        <td className="px-3 py-3">
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
                                  onClick={() => {
                                    void updateIndividual(item.id);
                                  }}
                                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingState(emptyFormState);
                                  }}
                                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                                >
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
                                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!canMutate || deleteLoadingId === item.id}
                                  onClick={() => {
                                    void deleteIndividual(item.id);
                                  }}
                                  className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}