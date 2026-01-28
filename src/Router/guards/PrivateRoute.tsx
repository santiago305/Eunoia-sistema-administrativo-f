import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PropsUrl } from "@/router/guards/typeGuards";
import { RoutesPaths } from "../config/routesPaths";

/**
 * Private route guard.
 * - If the user is not authenticated, redirect to login.
 * - Otherwise, render the protected content.
 */
const PrivateRoute = ({ children }: PropsUrl) => {
  const { isAuthenticated, loading, userRole } = useAuth();

  console.log("[PrivateRoute] loading:", loading, "isAuthenticated:", isAuthenticated, "userRole:", userRole);
  if (loading) return <div>Cargando... Redirigiendo a Dashboard...</div>;

  if (!isAuthenticated) {
    console.log("[PrivateRoute] Redirect -> login (not authenticated)");
    return <Navigate to={RoutesPaths.login} replace />;
  }

  console.log("[PrivateRoute] Access granted");
  return children;
};

export default PrivateRoute;
