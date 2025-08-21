// src/Protected.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

type ProtectedProps = {
  children: React.ReactNode;
  // When true, only unauthenticated users can view (e.g., login/register pages)
  guestOnly?: boolean;
  // Where to send unauthenticated users (for protected routes)
  to?: string; // default '/auth'
  // Where to send authenticated users (for guest-only routes)
  toWhenAuthed?: string; // default '/account'
  // Optional UI while auth is initializing
  fallback?: React.ReactNode;
};

export default function Protected({
  children,
  guestOnly = false,
  to = '/auth',
  toWhenAuthed = '/account',
  fallback = null,
}: ProtectedProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <>{fallback}</>;

  if (guestOnly) {
    // For login/register screens: only redirect if the user is already signed in
    if (user) return <Navigate to={toWhenAuthed} replace />;
    return <>{children}</>;
  }

  // For protected screens: if not signed in, send to auth and keep "from" for post-login redirect
  if (!user) return <Navigate to={to} state={{ from: location }} replace />;

  return <>{children}</>;
}