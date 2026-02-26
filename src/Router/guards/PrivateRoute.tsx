import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PropsUrl } from "@/Router/guards/typeGuards";
import { RoutesPaths } from "../config/routesPaths";

/**
 * Private route guard.
 * - If the user is not authenticated, redirect to login.
 * - Otherwise, render the protected content.
 */
const PrivateRoute = ({ children }: PropsUrl) => {
  const { isAuthenticated, loading, userRole } = useAuth();

  if (loading) return <div>Cargando... Redirigiendo a Dashboard...</div>;

  if (!isAuthenticated) {
    return <Navigate to={RoutesPaths.login} replace />;
  }

  return children;
};

export default PrivateRoute;
