// Stateless session helpers for a Bearer JWT stored in localStorage.
// Pairs with AuthProvider.tsx (which writes the same STORAGE_KEY).

/* ------------------------------------------------------------- */
/* Storage                                                       */
/* ------------------------------------------------------------- */

const STORAGE_KEY = "fh.accessToken";

export function getAccessTokenFromStorage(): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const tok = window.localStorage.getItem(STORAGE_KEY);
    return tok && tok.length > 0 ? tok : null;
  } catch {
    return null;
  }
}

export function clearAccessTokenInStorage(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------- */
/* Base64URL → UTF-8 JSON (no Node/Buffer)                       */
/* ------------------------------------------------------------- */

function base64UrlToUtf8(b64url: string): string | null {
  try {
    if (typeof atob !== "function") return null; // SSR / non-browser
    // Convert base64url to base64, then pad to a length multiple of 4
    const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const binary = atob(padded); // binary string (Latin-1)
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(bytes);
    }

    // Fallback: decodeURIComponent trick
    // (handles UTF-8 percent sequences)
    return decodeURIComponent(
      Array.from(bytes)
        .map((b) => "%" + ("00" + b.toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- */
/* JWT decoding (best-effort, no throws)                          */
/* ------------------------------------------------------------- */

type JwtPayload = {
  sub?: string | number;
  id?: string | number;
  email?: string;
  userRole?: "SUPER_ADMIN" | "ADMIN" | "USER";
  firstName?: string | null;
  lastName?: string | null;
  exp?: number; // seconds since epoch
  iat?: number;
  [k: string]: unknown;
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = base64UrlToUtf8(parts[1]);
    if (!json) return null;
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- */
/* Public getters                                                 */
/* ------------------------------------------------------------- */

export function getCurrentUserId(): string | null {
  const tok = getAccessTokenFromStorage();
  if (!tok) return null;
  const p = decodeJwt(tok);
  if (!p) return null;
  const id = (p.id ?? p.sub) as string | number | undefined;
  return id != null ? String(id) : null;
}

export function getCurrentUserEmail(): string | null {
  const tok = getAccessTokenFromStorage();
  if (!tok) return null;
  const p = decodeJwt(tok);
  return p?.email ?? null;
}

export function getCurrentUserRole(): "SUPER_ADMIN" | "ADMIN" | "USER" | null {
  const tok = getAccessTokenFromStorage();
  if (!tok) return null;
  const p = decodeJwt(tok);
  if (!p?.userRole) return null;
  const r = String(p.userRole).toUpperCase();
  return (["SUPER_ADMIN", "ADMIN", "USER"] as const).includes(r as any)
    ? (r as any)
    : "USER";
}

/** True if token exists and is NOT expired (according to `exp`) */
export function isLoggedIn(): boolean {
  const tok = getAccessTokenFromStorage();
  if (!tok) return false;
  const p = decodeJwt(tok);
  if (!p?.exp) return true; // no exp claim => assume valid (server enforces anyway)
  const nowSec = Math.floor(Date.now() / 1000);
  return p.exp > nowSec;
}

/** True if token will expire within N seconds (useful for proactive UX) */
export function willExpireWithin(seconds: number): boolean {
  const tok = getAccessTokenFromStorage();
  if (!tok) return true;
  const p = decodeJwt(tok);
  if (!p?.exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return p.exp - nowSec <= seconds;
}
