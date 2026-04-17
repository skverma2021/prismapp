"use client";

import { useState } from "react";

import { BrowseFilterBar, BTN_DELETE, BTN_EDIT, BTN_SAVE, BTN_CANCEL, BTN_SUBMIT, INPUT_CLASS, INPUT_DISABLED_CLASS } from "@/src/components/master-data/browse-filter-bar";
import { ContextLinkChips } from "@/src/components/master-data/context-link-chips";
import { DataTable } from "@/src/components/master-data/data-table";
import { MasterDataNav } from "@/src/components/master-data/master-data-nav";
import { NoticeStack } from "@/src/components/master-data/notice-stack";
import { PaginationControls } from "@/src/components/master-data/pagination-controls";
import { SessionContextNotice } from "@/src/components/shell/session-context-notice";
import { useAuthSession } from "@/src/lib/auth-session";
import { invalidateBlockDependentLookups } from "@/src/lib/master-data-lookups";
import { useBrowseState } from "@/src/hooks/use-browse-state";
import type { BrowseState } from "@/src/hooks/use-browse-state";
import { useCrudActions } from "@/src/hooks/use-crud-actions";

type BlockItem = {
  id: string;
  description: string;
  createdAt: string;
};

type SortOption = "description" | "createdAt";

const SORT_OPTIONS = [
  { value: "description" as const, label: "Sort by description" },
  { value: "createdAt" as const, label: "Sort by created time" },
];

export default function BlocksPage() {
  const { session } = useAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  const browse = useBrowseState<BlockItem, SortOption>({
    endpoint: "/api/blocks",
    errorMessage: "Unable to load blocks.",
    sortOptions: SORT_OPTIONS,
    defaultSortBy: "description",
    defaultSortDir: "asc",
    filters: [{ key: "q" }],
  });

  const crud = useCrudActions({
    setSubmitError: browse.setSubmitError,
    setSubmitSuccess: browse.setSubmitSuccess,
  });

  const [createDescription, setCreateDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

  function handleCreate() {
    void crud.create<BlockItem>({
      endpoint: "/api/blocks",
      body: { description: createDescription.trim() },
      errorMessage: "Unable to create block.",
      onSuccess: (data) => {
        invalidateBlockDependentLookups();
        setCreateDescription("");
        browse.setSubmitSuccess(`Block created: ${data.description}`);
        browse.setPage(1);
        browse.setQuery("");
      },
    });
  }

  function handleUpdate(id: string) {
    void crud.update<BlockItem>({
      endpoint: `/api/blocks/${id}`,
      body: { description: editingDescription.trim() },
      errorMessage: "Unable to update block.",
      onSuccess: (data) => {
        invalidateBlockDependentLookups();
        setEditingId(null);
        setEditingDescription("");
        browse.setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
        browse.setSubmitSuccess(`Block updated: ${data.description}`);
      },
    });
  }

  function handleDelete(id: string) {
    void crud.remove({
      id,
      endpoint: `/api/blocks/${id}`,
      errorMessage: "Unable to delete block.",
      onSuccess: () => {
        invalidateBlockDependentLookups();
        browse.setSubmitSuccess("Block deleted.");
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Blocks</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage top-level building blocks used by units, ownership timelines, residency timelines, and contribution capture.
            </p>
          </div>
          <BrowseFilterBar browse={browse as BrowseState<unknown, SortOption>} sortOptions={SORT_OPTIONS}>
            <input
              value={browse.query}
              onChange={(e) => browse.setQuery(e.target.value)}
              placeholder="Search block description"
              className={INPUT_CLASS}
            />
          </BrowseFilterBar>
        </div>

        <NoticeStack submitError={browse.submitError} submitSuccess={browse.submitSuccess} loadError={browse.loadError} />

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Create Block</p>
            <p className="mt-1 text-sm text-slate-600">Block descriptions must stay unique across the society.</p>
            <div className="mt-4 grid gap-3">
              <input
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="e.g. Nalanda"
                disabled={!canMutate || crud.createLoading}
                className={INPUT_DISABLED_CLASS}
              />
              <button
                type="button"
                disabled={!canMutate || crud.createLoading || createDescription.trim().length === 0}
                onClick={handleCreate}
                className={BTN_SUBMIT}
              >
                {crud.createLoading ? "Creating..." : "Create Block"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <PaginationControls page={browse.page} totalPages={browse.totalPages} totalItems={browse.totalItems} onPageChange={browse.setPage} />

            <DataTable<BlockItem>
              columns={[
                {
                  header: "Description",
                  render: (item) =>
                    editingId === item.id ? (
                      <input
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    ) : (
                      item.description
                    ),
                },
                {
                  header: "Created",
                  render: (item) => new Date(item.createdAt).toLocaleDateString(),
                },
                {
                  header: "Actions",
                  render: (item) => (
                    <div className="flex flex-wrap gap-2">
                      {editingId === item.id ? (
                        <>
                          <button
                            type="button"
                            disabled={editingDescription.trim().length === 0}
                            onClick={() => handleUpdate(item.id)}
                            className={BTN_SAVE}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditingDescription(""); }}
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
                            onClick={() => { setEditingId(item.id); setEditingDescription(item.description); }}
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
                  ),
                },
              ]}
              items={browse.items}
              loading={browse.loading}
              loadingMessage="Loading blocks..."
              emptyMessage="No blocks found for the current filter."
              rowKey={(item) => item.id}
            />
          </div>
        </div>
      </section>
    </div>
  );
}