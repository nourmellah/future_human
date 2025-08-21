// client/src/services/account.ts
import { apiGet, apiPatch } from '../lib/api';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type Account = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  userRole: UserRole;
  phoneNumber?: string | null;
  address?: string | null;
  postalCode?: string | null; // EN
  country?: string | null;    // EN
  createdAt?: string;
  updatedAt?: string;
  fullName?: string;
};

export type AccountUpdateInput = Partial<{
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  address: string | null;
  postalCode: string | null; // EN
  country: string | null;    // EN
}>;

/** Get current account (Bearer required) */
export async function getAccount(): Promise<{ user: Account }> {
  return apiGet('/account');
}

/** Update profile fields (partial) */
export async function updateAccount(patch: AccountUpdateInput): Promise<{ user: Account }> {
  return apiPatch('/account', patch);
}

/** Change password (requires current password) */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  return apiPatch('/account/password', input);
}