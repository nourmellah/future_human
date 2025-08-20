import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { isHydrated, isAuthenticated } = useAuth();
  const loc = useLocation();

  if (!isHydrated) return null;           // or a tiny skeleton
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: loc }} />;
  }
  return <>{children}</>;
}