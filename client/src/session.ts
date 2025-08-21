// src/session.ts
import type { User } from "./services/auth";

type Listener = (user: User | null) => void;

let currentUser: User | null = null;
const listeners = new Set<Listener>();

export function setCurrentUser(u: User | null) {
  currentUser = u;
  // keep a lightweight mirror of the id only (safe, no tokens)
  if (typeof window !== "undefined") {
    if (u?.id) localStorage.setItem("uid", String(u.id));
    else localStorage.removeItem("uid");
  }
  for (const fn of listeners) fn(currentUser);
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentUserId(): string | null {
  return String(currentUser?.id ?? localStorage.getItem("uid") ?? null);
}

export function onUserChange(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
