// Lightweight API wrapper (stateless JWT: no refresh-cookie, no auto /refresh)

import { getCurrentUserId, getAccessTokenFromStorage } from "../session";

/** Convenience for places that need it (e.g., analytics) */
export function currentUserId() {
  return getCurrentUserId();
}

/* ------------------------------------------------------------------ */
/* Access token plumbing — wired by AuthProvider                       */
/* ------------------------------------------------------------------ */

type Getter = () => string | null;
type Setter = (token: string | null) => void;

// Will be set by AuthProvider, but we also guard with a localStorage fallback.
let getAccessToken: Getter = () => null;
// kept for back-compat; we won't call it here (no refresh flow on the client)
let setAccessToken: Setter = () => {};

export function setAccessTokenGetter(fn: Getter) {
  getAccessToken = fn;
}
export function setAccessTokenHandler(fn: Setter) {
  setAccessToken = fn;
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:4000";

const API_PREFIX = "/api";

/* ------------------------------------------------------------------ */
/* Internals                                                           */
/* ------------------------------------------------------------------ */

function isJsonBody(body: unknown): body is string {
  // We only auto-set Content-Type for stringified JSON,
  // not for FormData/Blob/etc.
  return typeof body === "string";
}

function authHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Content-Type") && isJsonBody((init as any)?.body)) {
    headers.set("Content-Type", "application/json");
  }

  // Critical fix: fall back to localStorage if the getter isn't ready yet (page reload).
  const token = getAccessToken?.() || getAccessTokenFromStorage() || null;

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function withAuth(init?: RequestInit): RequestInit {
  const headers = authHeaders(init);
  return {
    ...init,
    headers,
    // cookies are not required for stateless JWT; keeping include is harmless
    credentials: "include",
  };
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, withAuth(init));
  // No auto-refresh retry here. If it's 401, the caller (AuthProvider) should handle logout.
  return res;
}

async function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* Public helpers                                                      */
/* ------------------------------------------------------------------ */

export async function apiGet<T>(path: string): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, { method: "GET" });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, { method: "DELETE" });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

/* ------------------------------------------------------------------ */
/* Error utility                                                       */
/* ------------------------------------------------------------------ */
export type ApiError = Error & { status?: number; details?: unknown };

async function toApiError(res: Response): Promise<ApiError> {
  let details: any = undefined;
  try {
    details = await res.clone().json();
  } catch {
    // ignore: not all errors return JSON
  }
  const err: ApiError = new Error(
    (details?.message as string) ||
      (details?.error as string) ||
      `Request failed with status ${res.status}`
  );
  err.status = res.status;
  err.details = details;
  return err;
}
