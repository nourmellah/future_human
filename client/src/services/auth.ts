import { apiGet, apiPost } from '../lib/api';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type User = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  userRole: UserRole;
  phoneNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  country?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fullName?: string;
};

export type LoginInput = { email: string; password: string };
export type RegisterInput = { 
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
  postalCode?: string;
  country?: string;
};

export async function login(input: LoginInput): Promise<{ user: User; accessToken: string }> {
  return apiPost('/auth/login', input);
}

export async function register(
  input: RegisterInput
): Promise<{ user: User; accessToken: string }> {
  return apiPost('/auth/register', input);
}

export async function logout(): Promise<{ ok: true }> {
  return apiPost('/auth/logout');
}

/** Session check using httpOnly refresh cookie. */
export async function me(): Promise<{ user: User | null }> {
  return apiGet('/auth/me');
}

/** Manually trigger a refresh (usually auto via api wrapper). */
export async function refresh(): Promise<{ accessToken?: string }> {
  return apiPost('/auth/refresh');
}
