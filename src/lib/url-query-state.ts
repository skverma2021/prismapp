type QueryValue = string | number | boolean | null | undefined;

export function pushQueryState(pathname: string, values: Record<string, QueryValue>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        params.set(key, "true");
      }

      continue;
    }

    const normalized = String(value).trim();
    if (normalized.length > 0) {
      params.set(key, normalized);
    }
  }

  const nextQuery = params.toString();
  window.history.pushState(null, "", nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname);
}