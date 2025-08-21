import { getCurrentUserId } from "../session";

export function currentUserId() { return getCurrentUserId(); }

type Getter = () => string | null;
type Setter = (token: string | null) => void;

let getAccessToken: Getter = () => null;
let setAccessToken: Setter = () => {};

export function setAccessTokenGetter(fn: Getter) {
  getAccessToken = fn;
}
export function setAccessTokenHandler(fn: Setter) {
  setAccessToken = fn;
}

const API_URL =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const API_PREFIX = '/api'; // server uses /api/*

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const r = await fetch(`${API_URL}${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // send httpOnly cookie
      });
      if (!r.ok) {
        setAccessToken(null);
        return null;
      }
      const data = (await r.json()) as { accessToken?: string };
      const token = data?.accessToken || null;
      setAccessToken(token);
      return token;
    })().finally(() => {
      // allow a new refresh next time
      setTimeout(() => (refreshPromise = null), 0);
    });
  }
  return refreshPromise;
}

function withAuth(init?: RequestInit): RequestInit {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  return {
    credentials: 'include',
    ...init,
    headers,
  };
}

async function request(path: string, init?: RequestInit, _retry = false): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const res = await fetch(url, withAuth(init));
  if (res.status !== 401 || _retry) return res;

  // Try one refresh
  const token = await doRefresh();
  if (!token) return res; // still 401 -> caller handles logout

  // retry original request (clone minimal safe fields)
  const retryInit: RequestInit = {
    method: init?.method || 'GET',
    headers: init?.headers,
    // Body note: if body was a stream, it can't be retried. We assume JSON/string here.
    body: init?.body as BodyInit | null | undefined,
    credentials: 'include',
  };
  return fetch(url, withAuth(retryInit));
}

/* ---------- JSON helpers ---------- */
async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    // Not JSON, throw a nicer error
    throw new Error(`Invalid JSON response (${res.status})`);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await request(`${API_PREFIX}${path}`, { method: 'DELETE' });
  if (!res.ok) throw await toApiError(res);
  return json<T>(res);
}

/* ---------- Error utility ---------- */
export type ApiError = Error & { status?: number; details?: unknown };
async function toApiError(res: Response): Promise<ApiError> {
  let details: any = undefined;
  try {
    details = await res.clone().json();
  } catch {}
  const err: ApiError = new Error(
    (details?.message as string) ||
      (details?.error as string) ||
      `Request failed with status ${res.status}`
  );
  err.status = res.status;
  err.details = details;
  return err;
}
