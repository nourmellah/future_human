// Auth service (stateless JWT). Matches server routes:
// POST /api/auth/register -> { user, accessToken }
// POST /api/auth/login    -> { user, accessToken }
// GET  /api/auth/me       -> { user | null }
// POST /api/auth/logout   -> { ok: true }

import { apiGet, apiPost } from "../lib/api";

/* ----------------------------- Types ----------------------------- */

export type User = {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  userRole?: "SUPER_ADMIN" | "ADMIN" | "USER";
  phoneNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  country?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fullName?: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
  postalCode?: string;
  country?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
};

export type MeResponse = {
  user: User | null;
};

/* ---------------------------- API calls --------------------------- */

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  // server validates with zod; returns { user, accessToken }
  return apiPost<AuthResponse>("/auth/register", payload);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  // returns { user, accessToken }
  return apiPost<AuthResponse>("/auth/login", payload);
}

export async function me(): Promise<MeResponse> {
  // relies on Bearer token set by api.ts via AuthProvider getter
  return apiGet<MeResponse>("/auth/me");
}

export async function logout(): Promise<{ ok: true }> {
  // stateless JWT: this is just for UX symmetry
  return apiPost<{ ok: true }>("/auth/logout", {});
}
