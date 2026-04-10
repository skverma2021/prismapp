type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
        retryable?: boolean;
      };
    };

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryableError(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function fetchJsonWithRetry<T>(
  input: string,
  fallbackMessage: string,
  init?: RequestInit,
  maxAttempts = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      const payload = (await response.json()) as ApiEnvelope<T>;

      if (response.ok && payload.ok) {
        return payload.data;
      }

      const message = payload.ok ? fallbackMessage : payload.error?.message ?? fallbackMessage;
      const shouldRetry =
        RETRYABLE_STATUSES.has(response.status) ||
        (!payload.ok && payload.error?.retryable === true);

      if (!shouldRetry || attempt === maxAttempts) {
        throw new Error(message);
      }

      lastError = new Error(message);
    } catch (error) {
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error instanceof Error ? error : new Error(fallbackMessage);
      }

      lastError = error instanceof Error ? error : new Error(fallbackMessage);
    }

    await wait(250 * attempt);
  }

  throw lastError ?? new Error(fallbackMessage);
}

export async function fetchAllPages<T>(
  buildUrl: (page: number) => string,
  fallbackMessage: string
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await fetch(buildUrl(page));
    const payload = (await response.json()) as ApiEnvelope<PaginatedResponse<T>>;

    if (!response.ok || !payload.ok) {
      throw new Error(payload.ok ? fallbackMessage : payload.error?.message ?? fallbackMessage);
    }

    items.push(...(payload.data.items ?? []));
    totalPages = Math.max(payload.data.totalPages ?? page, page);
    page += 1;
  } while (page <= totalPages);

  return items;
}