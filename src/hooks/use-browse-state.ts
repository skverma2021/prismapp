import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { fetchJsonWithRetry } from "@/src/lib/paginated-client";
import { pushQueryState } from "@/src/lib/url-query-state";
import type { PaginatedResponse } from "@/src/types/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterDef = {
  /** URL query parameter name */
  key: string;
  /** Default value when not present in URL (default: "") */
  defaultValue?: string;
  /** Parse the raw search param into the stored value. Default: identity */
  parse?: (raw: string | null) => string;
};

type SortOptionDef<S extends string> = {
  /** Sort field value sent to the API */
  value: S;
  /** Display label for the <option> */
  label: string;
};

export type BrowseConfig<T, S extends string> = {
  /** API endpoint path, e.g. "/api/blocks" */
  endpoint: string;
  /** Fallback error message shown to the user */
  errorMessage: string;
  /** Page size (default 20) */
  pageSize?: number;
  /** Sort options rendered in the sort-by <select> */
  sortOptions: SortOptionDef<S>[];
  /** Default sort field */
  defaultSortBy: S;
  /** Default sort direction (default "asc") */
  defaultSortDir?: "asc" | "desc";
  /** Entity-specific filter definitions */
  filters?: FilterDef[];
  /** Build extra URLSearchParams entries from the current applied filters */
  buildParams?: (filters: Record<string, string>) => Record<string, string>;
};

export type BrowseState<T, S extends string> = {
  // Data
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  loading: boolean;
  loadError: string;

  // Pagination
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  setTotalItems: React.Dispatch<React.SetStateAction<number>>;

  // Sort (draft)
  sortBy: S;
  setSortBy: (value: S) => void;
  sortDir: "asc" | "desc";
  setSortDir: (value: "asc" | "desc") => void;

  // Sort (applied — for display purposes)
  appliedSortBy: S;
  appliedSortDir: "asc" | "desc";

  // Generic filters (draft + applied)
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  appliedFilters: Record<string, string>;

  // Search query shortcut (sugar for filters with key "q")
  query: string;
  setQuery: (value: string) => void;
  appliedQuery: string;

  // Actions
  applyFilters: () => void;
  resetFilters: () => void;
  reload: () => void;

  // Submit feedback
  submitError: string;
  setSubmitError: (value: string) => void;
  submitSuccess: string;
  setSubmitSuccess: (value: string) => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBrowseState<T, S extends string>(
  config: BrowseConfig<T, S>,
): BrowseState<T, S> {
  const {
    endpoint,
    errorMessage,
    pageSize = 20,
    sortOptions,
    defaultSortBy,
    defaultSortDir = "asc",
    filters: filterDefs = [],
    buildParams,
  } = config;

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- helpers ----
  function parseSortBy(raw: string | null): S {
    const match = sortOptions.find((opt) => opt.value === raw);
    return match ? match.value : defaultSortBy;
  }

  function parseSortDir(raw: string | null): "asc" | "desc" {
    if (raw === "asc" || raw === "desc") return raw;
    return defaultSortDir;
  }

  function parseFilterValue(def: FilterDef, raw: string | null): string {
    if (def.parse) return def.parse(raw);
    return raw ?? def.defaultValue ?? "";
  }

  function buildFilterRecord(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const def of filterDefs) {
      result[def.key] = parseFilterValue(def, searchParams.get(def.key));
    }
    return result;
  }

  function buildDefaultFilterRecord(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const def of filterDefs) {
      result[def.key] = def.defaultValue ?? "";
    }
    return result;
  }

  // ---- state ----
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Sort (draft + applied) — initialise from URL so the first fetch is correct
  const [sortBy, setSortBy] = useState<S>(() => parseSortBy(searchParams.get("sortBy")));
  const [appliedSortBy, setAppliedSortBy] = useState<S>(() => parseSortBy(searchParams.get("sortBy")));
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => parseSortDir(searchParams.get("sortDir")));
  const [appliedSortDir, setAppliedSortDir] = useState<"asc" | "desc">(() => parseSortDir(searchParams.get("sortDir")));

  // Filters (draft + applied) — initialise from URL, not defaults
  const [filters, setFilters] = useState<Record<string, string>>(buildFilterRecord);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(buildFilterRecord);

  // Query shortcut
  const query = filters["q"] ?? "";
  const appliedQuery = appliedFilters["q"] ?? "";

  // ---- URL sync (searchParams → state) ----
  useEffect(() => {
    const nextSortBy = parseSortBy(searchParams.get("sortBy"));
    const nextSortDir = parseSortDir(searchParams.get("sortDir"));
    const nextFilters = buildFilterRecord();

    setSortBy(nextSortBy);
    setAppliedSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setAppliedSortDir(nextSortDir);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ---- data loading ----
  useEffect(() => {
    let stale = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sortBy: appliedSortBy,
          sortDir: appliedSortDir,
        });

        // Apply entity-specific filter params
        if (buildParams) {
          const extra = buildParams(appliedFilters);
          for (const [key, value] of Object.entries(extra)) {
            if (value) params.set(key, value);
          }
        } else {
          // Default: pass non-empty filter values as-is
          for (const [key, value] of Object.entries(appliedFilters)) {
            if (value.trim()) params.set(key, value.trim());
          }
        }

        const data = await fetchJsonWithRetry<PaginatedResponse<T>>(
          `${endpoint}?${params.toString()}`,
          errorMessage,
        );

        if (stale) return;

        setItems(data.items);
        setTotalPages(Math.max(data.totalPages, 1));
        setTotalItems(data.totalItems);
      } catch (error) {
        if (stale) return;

        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoadError(error instanceof Error ? error.message : errorMessage);
      } finally {
        if (!stale) setLoading(false);
      }
    }

    void load();

    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSortBy, appliedSortDir, page, reloadKey, ...Object.values(appliedFilters)]);

  // ---- actions ----
  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setQuery = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, q: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setPage(1);
    setAppliedSortBy(sortBy);
    setAppliedSortDir(sortDir);

    // Trim text filters before applying
    const trimmed: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      trimmed[key] = value.trim();
    }
    setAppliedFilters(trimmed);

    // Push to URL
    const queryState: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(trimmed)) {
      if (value) queryState[key] = value;
    }
    queryState.sortBy = sortBy;
    queryState.sortDir = sortDir;
    pushQueryState(pathname, queryState);
  }, [filters, pathname, sortBy, sortDir]);

  const resetFilters = useCallback(() => {
    const defaults = buildDefaultFilterRecord();
    setFilters(defaults);
    setAppliedFilters(defaults);
    setSortBy(defaultSortBy);
    setAppliedSortBy(defaultSortBy);
    setSortDir(defaultSortDir);
    setAppliedSortDir(defaultSortDir);
    setPage(1);
    pushQueryState(pathname, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, defaultSortBy, defaultSortDir]);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  return {
    items,
    setItems,
    loading,
    loadError,
    page,
    setPage,
    totalPages,
    totalItems,
    setTotalItems,
    sortBy,
    setSortBy: setSortBy as (value: S) => void,
    sortDir,
    setSortDir,
    appliedSortBy,
    appliedSortDir,
    filters,
    setFilter,
    appliedFilters,
    query,
    setQuery,
    appliedQuery,
    applyFilters,
    resetFilters,
    reload,
    submitError,
    setSubmitError,
    submitSuccess,
    setSubmitSuccess,
  };
}
