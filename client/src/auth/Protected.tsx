import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

type Props = {
  /** Protected content (e.g., a page component) */
  children: React.ReactNode;
  /** Optional: restrict access to specific roles */
  roles?: Array<"SUPER_ADMIN" | "ADMIN" | "USER">;
  /** Optional: route to send unauthorized users */
  redirectTo?: string;
};

export default function Protected({
  children,
  roles,
  redirectTo = "/auth",
}: Props) {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  // Hold rendering until we know auth state
  if (isLoading) {
    return (
      <div className="w-full h-[50vh] grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Not logged in → go to auth, preserve where we came from
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role-gated access (optional)
  if (roles && roles.length > 0) {
    const ok = roles.includes((user.userRole as any) || "USER");
    if (!ok) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}