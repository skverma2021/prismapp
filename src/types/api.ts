export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
        details?: unknown;
        retryable?: boolean;
      };
    };

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};

export function toErrorMessage<T>(payload: ApiEnvelope<T>, fallback: string) {
  return payload.ok ? fallback : payload.error?.message ?? fallback;
}
