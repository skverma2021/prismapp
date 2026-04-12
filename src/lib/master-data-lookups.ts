import { compareUnitsByBlockAndDescription } from "@/src/lib/unit-format";

export type UnitLookupOption = {
  id: string;
  description: string;
  blockId: string;
  block?: {
    description: string;
  };
};

export type IndividualLookupOption = {
  id: string;
  fName: string;
  mName?: string | null;
  sName: string;
};

export type ContributionHeadLookupOption = {
  id: number;
  description: string;
  payUnit: number;
  period: "MONTH" | "YEAR";
};

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;
const lookupMemoryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

function getCacheKey(key: string) {
  return `prismapp.lookup.${key}`;
}

function readCachedValue<T>(key: string): T | null {
  const memoryValue = lookupMemoryCache.get(key);
  if (memoryValue && memoryValue.expiresAt > Date.now()) {
    return memoryValue.data as T;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getCacheKey(key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(getCacheKey(key));
      return null;
    }

    lookupMemoryCache.set(key, parsed as CacheEntry<unknown>);
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedValue<T>(key: string, data: T) {
  const entry: CacheEntry<T> = {
    data,
    expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS,
  };

  lookupMemoryCache.set(key, entry as CacheEntry<unknown>);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getCacheKey(key), JSON.stringify(entry));
  } catch {
    // Best-effort cache only.
  }
}

async function fetchLookupWithRetry<T>(url: string, fallbackMessage: string, maxAttempts = 2): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      const payload = (await response.json()) as { ok?: boolean; data?: T; error?: { message?: string } };

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? fallbackMessage);
      }

      return payload.data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(fallbackMessage);

      if (attempt < maxAttempts && typeof window !== "undefined") {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw lastError ?? new Error(fallbackMessage);
}

export async function fetchLookupFreshWithRetry<T>(url: string, fallbackMessage: string) {
  return fetchLookupWithRetry<T>(url, fallbackMessage);
}

async function loadCachedLookup<T>(key: string, url: string, fallbackMessage: string): Promise<T> {
  const cached = readCachedValue<T>(key);
  if (cached !== null) {
    return cached;
  }

  const inflight = inflightRequests.get(key) as Promise<T> | undefined;
  if (inflight) {
    return inflight;
  }

  const request = fetchLookupWithRetry<T>(url, fallbackMessage)
    .then((data) => {
      writeCachedValue(key, data);
      return data;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, request as Promise<unknown>);
  return request;
}

export function loadUnitLookupsCached() {
  return loadCachedLookup<UnitLookupOption[]>("units", "/api/units/lookups", "Unable to load units.").then((data) =>
    [...data].sort(compareUnitsByBlockAndDescription)
  );
}

export function loadIndividualLookupsCached() {
  return loadCachedLookup<IndividualLookupOption[]>(
    "individuals",
    "/api/individuals/lookups",
    "Unable to load individuals."
  );
}

export function loadContributionHeadLookupsCached() {
  return loadCachedLookup<ContributionHeadLookupOption[]>(
    "contribution-heads",
    "/api/contribution-heads/lookups",
    "Unable to load contribution heads."
  );
}

export function loadResidentEligibleUnitIdsCached() {
  return fetchLookupFreshWithRetry<string[]>(
    "/api/residencies/eligible-unit-ids",
    "Unable to load resident-eligible units."
  );
}

export function loadResidencyCreatableUnitIdsCached() {
  return fetchLookupFreshWithRetry<string[]>(
    "/api/ownerships/residency-eligible-unit-ids",
    "Unable to load residency-eligible units."
  );
}

export function invalidateOwnershipDependentLookups() {
  const keys = ["resident-eligible-unit-ids", "residency-creatable-unit-ids"];

  for (const key of keys) {
    lookupMemoryCache.delete(key);
    inflightRequests.delete(key);

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(getCacheKey(key));
      } catch {
        // Best-effort cache only.
      }
    }
  }
}

export async function prewarmCommonLookups() {
  await Promise.allSettled([
    loadUnitLookupsCached(),
    loadIndividualLookupsCached(),
    loadContributionHeadLookupsCached(),
    loadResidentEligibleUnitIdsCached(),
    loadResidencyCreatableUnitIdsCached(),
  ]);
}