"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { pushQueryState } from "@/src/lib/url-query-state";

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
      };
    };

type BlockItem = {
  id: string;
  description: string;
  createdAt: string;
};

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type SortOption = "description" | "createdAt";

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

export default function BlocksPage() {
  const { session } = useAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canMutate = session.role !== "READ_ONLY";

  const [items, setItems] = useState<BlockItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("description");
  const [appliedSortBy, setAppliedSortBy] = useState<SortOption>("description");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [appliedSortDir, setAppliedSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    const nextSortBy = searchParams.get("sortBy") === "createdAt" ? "createdAt" : "description";
    const nextSortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

    setQuery(nextQuery);
    setAppliedQuery(nextQuery);
    setSortBy(nextSortBy);
    setAppliedSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setAppliedSortDir(nextSortDir);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    async function loadBlocks() {
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

        const data = await fetchJsonWithRetry<PaginatedResponse<BlockItem>>(
          `/api/blocks?${params.toString()}`,
          "Unable to load blocks."
        );

        setItems(data.items);
        setTotalPages(Math.max(data.totalPages, 1));
        setTotalItems(data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load blocks.");
      } finally {
        setLoading(false);
      }
    }

    void loadBlocks();
  }, [appliedQuery, appliedSortBy, appliedSortDir, page]);

  async function createBlock() {
    setCreateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ description: createDescription.trim() }),
      });

      const payload = (await response.json()) as ApiEnvelope<BlockItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to create block."));
      }

      setCreateDescription("");
      setSubmitSuccess(`Block created: ${payload.data.description}`);
      setPage(1);
      setAppliedQuery("");
      setQuery("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create block.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function updateBlock(id: string) {
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/blocks/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ description: editingDescription.trim() }),
      });

      const payload = (await response.json()) as ApiEnvelope<BlockItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update block."));
      }

      setEditingId(null);
      setEditingDescription("");
      setItems((prev) => prev.map((item) => (item.id === id ? payload.data : item)));
      setSubmitSuccess(`Block updated: ${payload.data.description}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update block.");
    }
  }

  async function deleteBlock(id: string) {
    setDeleteLoadingId(id);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/blocks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiEnvelope<null>;
        throw new Error(toErrorMessage(payload, "Unable to delete block."));
      }

      const nextCount = items.length - 1;
      setSubmitSuccess("Block deleted.");

      if (nextCount === 0 && page > 1) {
        setPage(page - 1);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setTotalItems((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to delete block.");
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Blocks</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage top-level building blocks used by units, ownership timelines, residency timelines, and contribution capture.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-70">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search block description"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="description">Sort by description</option>
                <option value="createdAt">Sort by created time</option>
              </select>
              <select
                value={sortDir}
                onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextQuery = query.trim();
                  setPage(1);
                  setAppliedQuery(nextQuery);
                  setAppliedSortBy(sortBy);
                  setAppliedSortDir(sortDir);
                  pushQueryState(pathname, {
                    ...(nextQuery ? { q: nextQuery } : {}),
                    sortBy,
                    sortDir,
                  });
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setAppliedQuery("");
                  setSortBy("description");
                  setAppliedSortBy("description");
                  setSortDir("asc");
                  setAppliedSortDir("asc");
                  setPage(1);
                  pushQueryState(pathname, {});
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {submitError ? <InlineNotice className="mt-4" tone="danger" message={submitError} /> : null}
        {submitSuccess ? <InlineNotice className="mt-4" tone="success" message={submitSuccess} /> : null}
        {loadError ? <InlineNotice className="mt-4" tone="danger" message={loadError} /> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Block</p>
            <p className="mt-1 text-sm text-slate-600">Block descriptions must stay unique across the society.</p>
            <div className="mt-4 grid gap-3">
              <input
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="e.g. Nalanda"
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="button"
                disabled={!canMutate || createLoading || createDescription.trim().length === 0}
                onClick={() => {
                  void createBlock();
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {createLoading ? "Creating..." : "Create Block"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-600" colSpan={3}>
                        Loading blocks...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-600" colSpan={3}>
                        No blocks found for the current filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top text-slate-700">
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <input
                              value={editingDescription}
                              onChange={(event) => setEditingDescription(event.target.value)}
                              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                          ) : (
                            item.description
                          )}
                        </td>
                        <td className="px-3 py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {editingId === item.id ? (
                              <>
                                <button
                                  type="button"
                                  disabled={editingDescription.trim().length === 0}
                                  onClick={() => {
                                    void updateBlock(item.id);
                                  }}
                                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingDescription("");
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
                                    setEditingDescription(item.description);
                                  }}
                                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!canMutate || deleteLoadingId === item.id}
                                  onClick={() => {
                                    void deleteBlock(item.id);
                                  }}
                                  className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                                </button>
                                <ContextLinkChips
                                  label="Browse"
                                  items={[
                                    {
                                      href: { pathname: "/units", query: { blockId: item.id } },
                                      label: "Units",
                                    },
                                    {
                                      href: {
                                        pathname: "/reports/contributions/transactions",
                                        query: { refYear: String(new Date().getUTCFullYear()), blockId: item.id },
                                      },
                                      label: "Transactions",
                                    },
                                  ]}
                                />
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