type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        message?: string;
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