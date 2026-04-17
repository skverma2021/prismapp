"use client";

import { useEffect, useState } from "react";

import { BrowseFilterBar, BTN_DELETE, BTN_EDIT, BTN_SAVE, BTN_CANCEL, BTN_SUBMIT, INPUT_CLASS, INPUT_DISABLED_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { invalidateUnitLookups } from "@/src/lib/master-data-lookups";
import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { formatUnitLabel } from "@/src/lib/unit-format";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";
import type { PaginatedResponse } from "@/src/types/api";

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

const SORT_OPTIONS = [
  { value: "description" as const, label: "Sort by unit" },
  { value: "sqFt" as const, label: "Sort by sq ft" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

function resolveBlock(blocks: BlockOption[], blockId: string) {
  return blocks.find((block) => block.id === blockId);
}

function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function UnitsPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  const browse = useBrowseState<UnitItem, SortOption>({
    endpoint: "/api/units",
    errorMessage: "Unable to load units.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "description",
    defaultSortDir: "asc",
    filters: [{ key: "q" }, { key: "blockId" }],
  });

  const crud = useCrudActions({
    setSubmitError: browse.setSubmitError,
    setSubmitSuccess: browse.setSubmitSuccess,
  });

  // Blocks lookup (separate from browse data)
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);

  useEffect(() => {
    async function loadBlocks() {
      setBlocksLoading(true);
      try {
        const data = await fetchJsonWithRetry<PaginatedResponse<BlockOption>>(
          "/api/blocks?page=1&pageSize=100&sortBy=description&sortDir=asc",
          "Unable to load blocks."
        );
        setBlocks(data.items);
      } catch {
        setBlocks([]);
      } finally {
        setBlocksLoading(false);
      }
    }
    void loadBlocks();
  }, []);

  const [createState, setCreateState] = useState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });

  function handleCreate() {
    void crud.create<UnitItem>({
      endpoint: "/api/units",
      body: {
        description: createState.description.trim(),
        blockId: createState.blockId,
        sqFt: Number(createState.sqFt),
        inceptionDt: createState.inceptionDt,
      },
      errorMessage: "Unable to create unit.",
      onSuccess: (data) => {
        setCreateState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
        browse.setSubmitSuccess(`Unit created: ${data.description}`);
        invalidateUnitLookups();
        browse.setPage(1);
      },
    });
  }

  function handleUpdate(id: string) {
    void crud.update<UnitItem>({
      endpoint: `/api/units/${id}`,
      body: {
        description: editingState.description.trim(),
        blockId: editingState.blockId,
        sqFt: Number(editingState.sqFt),
      },
      errorMessage: "Unable to update unit.",
      onSuccess: (data) => {
        setEditingId(null);
        setEditingState({ description: "", blockId: "", sqFt: "", inceptionDt: "" });
        browse.setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...data,
                  block: resolveBlock(blocks, data.blockId)
                    ? { id: data.blockId, description: resolveBlock(blocks, data.blockId)?.description ?? "" }
                    : item.block,
                }
              : item
          )
        );
        browse.setSubmitSuccess(`Unit updated: ${data.description}`);
        invalidateUnitLookups();
      },
    });
  }

  function handleDelete(id: string) {
    void crud.remove({
      id,
      endpoint: `/api/units/${id}`,
      errorMessage: "Unable to delete unit.",
      onSuccess: () => {
        browse.setSubmitSuccess("Unit deleted.");
        invalidateUnitLookups();
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Units</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage flat inventory, block placement, and sq ft values used by ownership, residency, and contribution calculations.
            </p>
          </div>
          <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS} minWidth="sm:min-w-[320px]">
            <input
              value={browse.query}
              onChange={(e) => browse.setQuery(e.target.value)}
              placeholder="Search unit description"
              className={INPUT_CLASS}
            />
            <select
              value={browse.filters["blockId"] ?? ""}
              onChange={(e) => browse.setFilter("blockId", e.target.value)}
              className={INPUT_CLASS}
              disabled={blocksLoading}
            >
              <option value="">All blocks</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>{block.description}</option>
              ))}
            </select>
          </BrowseFilterBar>
        </div>

        <NoticeStack submitError={browse.submitError} submitSuccess={browse.submitSuccess} loadError={browse.loadError} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Unit</p>
            <p className="mt-1 text-sm text-slate-600">Unit descriptions are unique within a selected block. Creating a unit also starts builder inventory ownership from the inception date, which becomes the earliest allowed ownership and residency start date.</p>
            <div className="mt-4 grid gap-3">
              <select
                value={createState.blockId}
                onChange={(e) => setCreateState((prev) => ({ ...prev, blockId: e.target.value }))}
                disabled={!canMutate || blocksLoading || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              >
                <option value="">Select block</option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>{block.description}</option>
                ))}
              </select>
              <input
                value={createState.description}
                onChange={(e) => setCreateState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. 101"
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              />
              <input
                type="number"
                min={1}
                value={createState.sqFt}
                onChange={(e) => setCreateState((prev) => ({ ...prev, sqFt: e.target.value }))}
                placeholder="Sq ft"
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              />
              <input
                type="date"
                value={createState.inceptionDt}
                onChange={(e) => setCreateState((prev) => ({ ...prev, inceptionDt: e.target.value }))}
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              />
              <button
                type="button"
                disabled={
                  !canMutate ||
                  crud.createLoading ||
                  createState.description.trim().length === 0 ||
                  createState.blockId.length === 0 ||
                  Number(createState.sqFt) <= 0 ||
                  createState.inceptionDt.length === 0
                }
                onClick={handleCreate}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Creating..." : "Create Unit"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<UnitItem>
              columns={[
                {
                  header: "Block",
                  render: (item) =>
                    editingId === item.id ? (
                      <select
                        value={editingState.blockId}
                        onChange={(e) => setEditingState((prev) => ({ ...prev, blockId: e.target.value }))}
                        className="w-full min-w-36 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Select block</option>
                        {blocks.map((block) => (
                          <option key={block.id} value={block.id}>{block.description}</option>
                        ))}
                      </select>
                    ) : (
                      item.block?.description ?? "-"
                    ),
                },
                {
                  header: "Unit",
                  render: (item) =>
                    editingId === item.id ? (
                      <input
                        value={editingState.description}
                        onChange={(e) => setEditingState((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    ) : (
                      formatUnitLabel(item)
                    ),
                },
                {
                  header: "Sq Ft",
                  render: (item) =>
                    editingId === item.id ? (
                      <input
                        type="number"
                        min={1}
                        value={editingState.sqFt}
                        onChange={(e) => setEditingState((prev) => ({ ...prev, sqFt: e.target.value }))}
                        className="w-28 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    ) : (
                      item.sqFt
                    ),
                },
                {
                  header: "Inception",
                  render: (item) =>
                    editingId === item.id ? (
                      <input
                        type="date"
                        value={editingState.inceptionDt}
                        onChange={(e) => setEditingState((prev) => ({ ...prev, inceptionDt: e.target.value }))}
                        disabled
                        className="w-36 rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                      />
                    ) : (
                      toDateInputValue(item.inceptionDt)
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
                              editingState.description.trim().length === 0 ||
                              editingState.blockId.length === 0 ||
                              Number(editingState.sqFt) <= 0 ||
                              editingState.inceptionDt.length === 0
                            }
                            onClick={() => handleUpdate(item.id)}
                            className={BTN_SAVE}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditingState({ description: "", blockId: "", sqFt: "", inceptionDt: "" }); }}
                            className={BTN_CANCEL}
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
                              { href: { pathname: "/ownerships", query: { unitId: item.id, activeOnly: "true" } }, label: "Ownerships" },
                              { href: { pathname: "/residencies", query: { unitId: item.id, activeOnly: "true" } }, label: "Residencies" },
                              { href: { pathname: "/contributions", query: { unitId: item.id } }, label: "Contribution Capture" },
                              { href: { pathname: "/reports/contributions/transactions", query: { refYear: String(new Date().getUTCFullYear()), unitId: item.id } }, label: "Transactions" },
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
              loadingMessage="Loading units..."
              emptyMessage="No units found for the current filter."
              rowKey={(item) => item.id}
            />
          </div>
        </div>
      </section>
    </div>
  );
}