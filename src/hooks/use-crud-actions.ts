import { useCallback, useState } from "react";

import { toErrorMessage } from "@/src/types/api";
import type { ApiEnvelope } from "@/src/types/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CrudCallbacks = {
  setSubmitError: (value: string) => void;
  setSubmitSuccess: (value: string) => void;
};

type CreateOptions<T> = {
  /** API endpoint for POST */
  endpoint: string;
  /** Request body */
  body: unknown;
  /** Fallback error message */
  errorMessage: string;
  /** Called after successful create with the response data */
  onSuccess: (data: T) => void;
};

type UpdateOptions<T> = {
  /** Full API endpoint including ID, e.g. "/api/blocks/123" */
  endpoint: string;
  /** Request body */
  body: unknown;
  /** Fallback error message */
  errorMessage: string;
  /** Called after successful update with the response data */
  onSuccess: (data: T) => void;
};

type DeleteOptions = {
  /** Full API endpoint including ID */
  endpoint: string;
  /** Fallback error message */
  errorMessage: string;
  /** Called after successful delete */
  onSuccess: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCrudActions(callbacks: CrudCallbacks) {
  const { setSubmitError, setSubmitSuccess } = callbacks;
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | number | null>(null);

  const create = useCallback(
    async <T,>(options: CreateOptions<T>) => {
      setCreateLoading(true);
      setSubmitError("");
      setSubmitSuccess("");

      try {
        const response = await fetch(options.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(options.body),
        });

        const payload = (await response.json()) as ApiEnvelope<T>;
        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, options.errorMessage));
        }

        options.onSuccess(payload.data);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : options.errorMessage);
      } finally {
        setCreateLoading(false);
      }
    },
    [setSubmitError, setSubmitSuccess],
  );

  const update = useCallback(
    async <T,>(options: UpdateOptions<T>) => {
      setSubmitError("");
      setSubmitSuccess("");

      try {
        const response = await fetch(options.endpoint, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(options.body),
        });

        const payload = (await response.json()) as ApiEnvelope<T>;
        if (!response.ok || !payload.ok) {
          throw new Error(toErrorMessage(payload, options.errorMessage));
        }

        options.onSuccess(payload.data);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : options.errorMessage);
      }
    },
    [setSubmitError, setSubmitSuccess],
  );

  const remove = useCallback(
    async (options: DeleteOptions & { id?: string | number }) => {
      if (options.id !== undefined) setDeleteLoadingId(options.id);
      setSubmitError("");
      setSubmitSuccess("");

      try {
        const response = await fetch(options.endpoint, { method: "DELETE" });

        if (!response.ok) {
          const payload = (await response.json()) as ApiEnvelope<null>;
          throw new Error(toErrorMessage(payload, options.errorMessage));
        }

        options.onSuccess();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : options.errorMessage);
      } finally {
        setDeleteLoadingId(null);
      }
    },
    [setSubmitError, setSubmitSuccess],
  );

  return { create, update, remove, createLoading, deleteLoadingId };
}
