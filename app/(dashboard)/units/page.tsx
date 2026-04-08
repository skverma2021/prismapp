"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { InlineNotice } from "@/src/components/ui/inline-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { pushQueryState } from "@/src/lib/url-query-state";
import { formatUnitLabel } from "@/src/lib/unit-format";

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

type BlockOption = {
  id: string;
  description: string;
};

type UnitItem = {
  id: string;
  description: string;
  blockId: string;
  sqFt: number;
  inceptionDt: string;
  createdAt: string;
  block?: {
    id: string;
    description: string;
  };
};

type SortOption = "description" | "sqFt" | "createdAt";

function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}

function resolveBlock(blocks: BlockOption[], blockId: string) {
  return blocks.find((block) => block.id === blockId);
}

function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function UnitsPage() {
  const { session } = useAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canMutate = session.role !== "READ_ONLY";

  const [items, setItems] = useState<UnitItem[]>([]);
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [appliedBlockFilter, setAppliedBlockFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("description");
  const [appliedSortBy, setAppliedSortBy] = useState<SortOption>("description");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [appliedSortDir, setAppliedSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [createState, setCreateState] = useState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    const nextBlockFilter = searchParams.get("blockId") ?? "";
    const nextSortBy =
      searchParams.get("sortBy") === "sqFt"
        ? "sqFt"
        : searchParams.get("sortBy") === "createdAt"
          ? "createdAt"
          : "description";
    const nextSortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

    setQuery(nextQuery);
    setAppliedQuery(nextQuery);
    setBlockFilter(nextBlockFilter);
    setAppliedBlockFilter(nextBlockFilter);
    setSortBy(nextSortBy);
    setAppliedSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setAppliedSortDir(nextSortDir);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    async function loadBlocks() {
      setBlocksLoading(true);

      try {
        const response = await fetch("/api/blocks?page=1&pageSize=100&sortBy=description&sortDir=asc");
        const payload = (await response.json()) as ApiEnvelope<PaginatedResponse<BlockOption>>;

        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, "Unable to load blocks."));
        }

        setBlocks(payload.data.items);
      } catch (error) {
        setBlocks([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load blocks.");
      } finally {
        setBlocksLoading(false);
      }
    }

    void loadBlocks();
  }, []);

  useEffect(() => {
    async function loadUnits() {
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

        if (appliedBlockFilter) {
          params.set("blockId", appliedBlockFilter);
        }

        const response = await fetch(`/api/units?${params.toString()}`);
        const payload = (await response.json()) as ApiEnvelope<PaginatedResponse<UnitItem>>;

        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, "Unable to load units."));
        }

        setItems(payload.data.items);
        setTotalPages(Math.max(payload.data.totalPages, 1));
        setTotalItems(payload.data.totalItems);
      } catch (error) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : "Unable to load units.");
      } finally {
        setLoading(false);
      }
    }

    void loadUnits();
  }, [appliedBlockFilter, appliedQuery, appliedSortBy, appliedSortDir, page]);

  async function createUnit() {
    setCreateLoading(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          description: createState.description.trim(),
          blockId: createState.blockId,
          sqFt: Number(createState.sqFt),
          inceptionDt: createState.inceptionDt,
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<UnitItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to create unit."));
      }

      setCreateState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
      setSubmitSuccess(`Unit created: ${payload.data.description}`);
      setPage(1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create unit.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function updateUnit(id: string) {
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/units/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          description: editingState.description.trim(),
          blockId: editingState.blockId,
          sqFt: Number(editingState.sqFt),
        }),
      });

      const payload = (await response.json()) as ApiEnvelope<UnitItem>;
      if (!response.ok || !payload.ok) {
        throw new Error(toErrorMessage(payload, "Unable to update unit."));
      }

      setEditingId(null);
      setEditingState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload.data,
                block: resolveBlock(blocks, payload.data.blockId)
                  ? {
                      id: payload.data.blockId,
                      description: resolveBlock(blocks, payload.data.blockId)?.description ?? "",
                    }
                  : item.block,
              }
            : item
        )
      );
      setSubmitSuccess(`Unit updated: ${payload.data.description}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update unit.");
    }
  }

  async function deleteUnit(id: string) {
    setDeleteLoadingId(id);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch(`/api/units/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiEnvelope<null>;
        throw new Error(toErrorMessage(payload, "Unable to delete unit."));
      }

      const nextCount = items.length - 1;
      setSubmitSuccess("Unit deleted.");

      if (nextCount === 0 && page > 1) {
        setPage(page - 1);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setTotalItems((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to delete unit.");
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Units</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage flat inventory, block placement, and sq ft values used by ownership, residency, and contribution calculations.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-[320px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search unit description"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={blockFilter}
                onChange={(event) => setBlockFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={blocksLoading}
              >
                <option value="">All blocks</option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.description}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="description">Sort by unit</option>
                <option value="sqFt">Sort by sq ft</option>
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
                  const nextQuery = query.trim();
                  setPage(1);
                  setAppliedQuery(nextQuery);
                  setAppliedBlockFilter(blockFilter);
                  setAppliedSortBy(sortBy);
                  setAppliedSortDir(sortDir);
                  pushQueryState(pathname, {
                    ...(nextQuery ? { q: nextQuery } : {}),
                    ...(blockFilter ? { blockId: blockFilter } : {}),
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
                  setBlockFilter("");
                  setAppliedQuery("");
                  setAppliedBlockFilter("");
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

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Unit</p>
            <p className="mt-1 text-sm text-slate-600">Unit descriptions are unique within a selected block. Creating a unit also starts builder inventory ownership from the inception date, which becomes the earliest allowed ownership and residency start date.</p>
            <div className="mt-4 grid gap-3">
              <select
                value={createState.blockId}
                onChange={(event) => setCreateState((prev) => ({ ...prev, blockId: event.target.value }))}
                disabled={!canMutate || blocksLoading || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select block</option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.description}
                  </option>
                ))}
              </select>
              <input
                value={createState.description}
                onChange={(event) => setCreateState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="e.g. 101"
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <input
                type="number"
                min={1}
                value={createState.sqFt}
                onChange={(event) => setCreateState((prev) => ({ ...prev, sqFt: event.target.value }))}
                placeholder="Sq ft"
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <input
                type="date"
                value={createState.inceptionDt}
                onChange={(event) => setCreateState((prev) => ({ ...prev, inceptionDt: event.target.value }))}
                disabled={!canMutate || createLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="button"
                disabled={
                  !canMutate ||
                  createLoading ||
                  createState.description.trim().length === 0 ||
                  createState.blockId.length === 0 ||
                  Number(createState.sqFt) <= 0 ||
                  createState.inceptionDt.length === 0
                }
                onClick={() => {
                  void createUnit();
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {createLoading ? "Creating..." : "Create Unit"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Block</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Sq Ft</th>
                    <th className="px-3 py-2 text-left">Inception</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-600" colSpan={5}>
                        Loading units...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-600" colSpan={5}>
                        No units found for the current filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 align-top text-slate-700">
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <select
                              value={editingState.blockId}
                              onChange={(event) => setEditingState((prev) => ({ ...prev, blockId: event.target.value }))}
                              className="w-full min-w-36 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="">Select block</option>
                              {blocks.map((block) => (
                                <option key={block.id} value={block.id}>
                                  {block.description}
                                </option>
                              ))}
                            </select>
                          ) : (
                            item.block?.description ?? "-"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <input
                              value={editingState.description}
                              onChange={(event) => setEditingState((prev) => ({ ...prev, description: event.target.value }))}
                              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                          ) : (
                            formatUnitLabel(item)
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <input
                              type="number"
                              min={1}
                              value={editingState.sqFt}
                              onChange={(event) => setEditingState((prev) => ({ ...prev, sqFt: event.target.value }))}
                              className="w-28 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                          ) : (
                            item.sqFt
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <input
                              type="date"
                              value={editingState.inceptionDt}
                              onChange={(event) => setEditingState((prev) => ({ ...prev, inceptionDt: event.target.value }))}
                              disabled
                              className="w-36 rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                            />
                          ) : (
                            toDateInputValue(item.inceptionDt)
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {editingId === item.id ? (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    editingState.description.trim().length === 0 ||
                                    editingState.blockId.length === 0 ||
                                    Number(editingState.sqFt) <= 0 ||
                                    editingState.inceptionDt.length === 0
                                  }
                                  onClick={() => {
                                    void updateUnit(item.id);
                                  }}
                                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
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
                                      description: item.description,
                                      blockId: item.blockId,
                                      sqFt: String(item.sqFt),
                                      inceptionDt: toDateInputValue(item.inceptionDt),
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
                                    void deleteUnit(item.id);
                                  }}
                                  className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                                </button>
                                <ContextLinkChips
                                  label="Go To"
                                  items={[
                                    {
                                      href: { pathname: "/ownerships", query: { unitId: item.id, activeOnly: "true" } },
                                      label: "Ownerships",
                                    },
                                    {
                                      href: { pathname: "/residencies", query: { unitId: item.id, activeOnly: "true" } },
                                      label: "Residencies",
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