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
  const nextUrl = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;

  // Bail out if the URL is unchanged to prevent re-render loops.
  // Next.js intercepts pushState and re-fires useSearchParams on every call.
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl === currentUrl) {
    return;
  }

  window.history.pushState(null, "", nextUrl);
}