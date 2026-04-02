import process from "node:process";

const DEFAULT_SEED_PASSWORD = process.env.AUTH_SEED_PASSWORD ?? "ChangeMe123!";

function readSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const header = headers.get("set-cookie");
  return header ? [header] : [];
}

function mergeCookieHeaders(...cookieHeaders) {
  const cookies = new Map();

  for (const header of cookieHeaders) {
    if (!header) {
      continue;
    }

    for (const cookie of header.split(/;\s*/)) {
      if (!cookie.includes("=")) {
        continue;
      }

      const [name, ...valueParts] = cookie.split("=");
      const lowerName = name.toLowerCase();

      if (
        lowerName === "path" ||
        lowerName === "expires" ||
        lowerName === "max-age" ||
        lowerName === "domain" ||
        lowerName === "samesite" ||
        lowerName === "secure" ||
        lowerName === "httponly"
      ) {
        continue;
      }

      cookies.set(name, valueParts.join("="));
    }
  }

  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function cookieHeaderFromResponse(response) {
  return mergeCookieHeaders(...readSetCookies(response.headers));
}

export async function waitForAuthServerReady(baseUrl) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/csrf`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for Next.js server readiness.");
}

export async function isAuthServerReachable(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/auth/csrf`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function createSessionHeaders(baseUrl, email, password = DEFAULT_SEED_PASSWORD) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
    method: "GET",
    redirect: "manual",
  });

  if (!csrfResponse.ok) {
    throw new Error(`Unable to fetch CSRF token. status=${csrfResponse.status}`);
  }

  const { csrfToken } = await csrfResponse.json();
  if (typeof csrfToken !== "string" || csrfToken.trim().length === 0) {
    throw new Error("Unable to read CSRF token for scripted sign-in.");
  }

  const csrfCookies = cookieHeaderFromResponse(csrfResponse);
  const signInResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(csrfCookies ? { cookie: csrfCookies } : {}),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${baseUrl}/home`,
      json: "true",
    }),
  });

  if (![200, 302].includes(signInResponse.status)) {
    const body = await signInResponse.text();
    throw new Error(
      `Unable to create scripted session for ${email}. status=${signInResponse.status}, body=${body}`
    );
  }

  const cookies = mergeCookieHeaders(csrfCookies, cookieHeaderFromResponse(signInResponse));
  if (!cookies) {
    throw new Error(`Scripted sign-in did not return any session cookies for ${email}.`);
  }

  return {
    cookie: cookies,
  };
}