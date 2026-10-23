// Serialization-failure helpers. Kept free of any database import so they can
// be unit-tested and imported from api-response.ts without needing DATABASE_URL.

type ErrorLike = {
  name?: string;
  code?: string;
  message?: string;
  meta?: { code?: string } | null;
  cause?: { kind?: string; originalCode?: string } | null;
};

// PostgreSQL reports serialization failures as SQLSTATE 40001. Depending on the
// Prisma engine/adapter path it surfaces as P2034, as a DriverAdapterError whose
// cause.kind is TransactionWriteConflict, or as a raw-query error (P2010) carrying 40001.
export function isSerializationConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as ErrorLike;

  return (
    candidate.code === "P2034" ||
    candidate.cause?.kind === "TransactionWriteConflict" ||
    candidate.cause?.originalCode === "40001" ||
    candidate.meta?.code === "40001" ||
    candidate.message === "TransactionWriteConflict"
  );
}

const DEFAULT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 40;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Re-runs the whole unit of work when PostgreSQL aborts it for a serialization
// conflict. Domain errors (HttpError) are never retried. After the last attempt
// the original error is rethrown so the API can answer with a retryable 503.
export async function retryOnSerializationConflict<T>(
  work: () => Promise<T>,
  attempts: number = DEFAULT_ATTEMPTS,
  backoffMs: number = BASE_BACKOFF_MS
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isSerializationConflict(error) || attempt >= attempts) {
        throw error;
      }

      await sleep(backoffMs * attempt + Math.floor(Math.random() * backoffMs));
    }
  }
}
