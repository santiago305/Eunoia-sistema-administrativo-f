import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { PrivateRouteProps } from "@/routes/guards/typeGuards";
import { RoutesPaths } from "../config/routesPaths";
import ErrorPage from "@/pages/Error404";
import { getFirstAccessibleProtectedPath } from "../config/routeAccess";

/**
 * Private route guard.
 * - If the user is not authenticated, redirect to login.
 * - Otherwise, render the protected content.
 */
const normalizeRole = (role?: string | null) =>
  String(role ?? "").trim().toLowerCase();

const PrivateRoute = ({ children, rolesAllowed, permissionsAllowed }: PrivateRouteProps) => {
  const { isAuthenticated, authChecked, loading, userRole, permissions, preferredHomePath, checkAuth } = useAuth();
  const location = useLocation();

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
      if (location.pathname === RoutesPaths.dashboard) {
        const fallbackPath = getFirstAccessibleProtectedPath(userRole, permissions, preferredHomePath);
        if (fallbackPath && fallbackPath !== location.pathname) {
          return <Navigate to={fallbackPath} replace />;
        }
      }
      return <ErrorPage />;
    }
  }

  const hasPermissionsRestriction = Array.isArray(permissionsAllowed) && permissionsAllowed.length > 0;
  if (hasPermissionsRestriction) {
    const hasAllPermissions = permissionsAllowed.every((permission) =>
      permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      if (location.pathname === RoutesPaths.dashboard) {
        const fallbackPath = getFirstAccessibleProtectedPath(userRole, permissions, preferredHomePath);
        if (fallbackPath && fallbackPath !== location.pathname) {
          return <Navigate to={fallbackPath} replace />;
        }
      }
      return <ErrorPage />;
    }
  }

  return children;
};

export default PrivateRoute;


