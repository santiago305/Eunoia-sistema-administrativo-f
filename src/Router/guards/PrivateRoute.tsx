import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PropsUrl } from "@/router/guards/typeGuards";
import { RoleType } from "@/types/role";
import { RoutesPaths } from "../config/routesPaths";

/**
 * Componente Guardián de Rutas Privadas.
 * 
 * Este guard se encarga de proteger las rutas que requieren autenticación 
 * y controla accesos adicionales en función del rol y estado del cliente.
 * 
 * - Si el usuario no está autenticado, es redirigido al login.
 * - Si el usuario es de rol `USER` y no tiene cliente asociado, es redirigido a Home.
 * - Si todo es válido, renderiza el contenido protegido.
 * 
 * @param {PropsUrl} children - El componente o grupo de componentes a renderizar si se cumplen las condiciones de acceso.
 * @returns {JSX.Element} El componente protegido o una redirección controlada.
 * 
 * @example
 * <PrivateRoute>
 *   <Dashboard />
 * </PrivateRoute>
 */
const PrivateRoute = ({ children }: PropsUrl) => {
  const { isAuthenticated, loading, userRole, hasClient } = useAuth();

  console.log("[PrivateRoute] loading:", loading, "isAuthenticated:", isAuthenticated, "userRole:", userRole, "hasClient:", hasClient);
  if (loading) return <div>Cargando... Redirigiendo a Dashboard...</div>;

  if (!isAuthenticated) {
    console.log("[PrivateRoute] Redirect -> login (not authenticated)");
    return <Navigate to={RoutesPaths.login} replace />;
  }

  if (userRole === RoleType.USER && !hasClient) {
    console.log("[PrivateRoute] Redirect -> clientsRegister (USER without client)");
    return <Navigate to={RoutesPaths.clientsRegister} replace />;
  }

  console.log("[PrivateRoute] Access granted");
  return children;
};

export default PrivateRoute;
