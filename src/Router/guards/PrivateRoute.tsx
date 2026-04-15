import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PrivateRouteProps } from "@/router/guards/typeGuards";
import { RoutesPaths } from "../config/routesPaths";
import ErrorPage from "@/pages/Error404";

/**
 * Private route guard.
 * - If the user is not authenticated, redirect to login.
 * - Otherwise, render the protected content.
 */
const normalizeRole = (role?: string | null) =>
  String(role ?? "").trim().toLowerCase();

const PrivateRoute = ({ children, rolesAllowed }: PrivateRouteProps) => {
  const { isAuthenticated, authChecked, loading, userRole, checkAuth } = useAuth();

  useEffect(() => {
    if (authChecked || loading || isAuthenticated) return;
    void checkAuth();
  }, [authChecked, checkAuth, isAuthenticated, loading]);

  if (loading || (!authChecked && !isAuthenticated)) {
    return <div>Cargando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={RoutesPaths.login} replace />;
  }

  const hasRoleRestriction = Array.isArray(rolesAllowed) && rolesAllowed.length > 0;

  if (hasRoleRestriction) {
    const role = normalizeRole(userRole);
    const allowed = rolesAllowed.map(normalizeRole);

    if (!allowed.includes(role)) {
      return <ErrorPage />;
    }
  }

  return children;
};

export default PrivateRoute;


