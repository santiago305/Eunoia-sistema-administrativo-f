import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PropsUrl } from "@/router/guards/typeGuards";
import { RoutesPaths } from "../config/routesPaths";

/**
 * Guardián de Rutas de Autenticación.
 * 
 * Este componente se utiliza para proteger las rutas de autenticación, 
 * evitando que usuarios ya autenticados accedan a páginas como Login o Registro.
 * 
 * - Si el usuario ya está autenticado, es redirigido a la página principal (Home).
 * - Si no está autenticado, permite el acceso al componente hijo (como Login o Register).
 * 
 * @param {PropsUrl} children - El componente o grupo de componentes a renderizar si NO está autenticado.
 * @returns {JSX.Element} El componente protegido o una redirección a Home.
 * 
 * @example
 * <RedirectIfAuth>
 *   <Login />
 * </RedirectIfAuth>
 */
const RedirectIfAuth = ({ children }: PropsUrl) => {
  const { isAuthenticated } = useAuth();

  console.log("[RedirectIfAuth] isAuthenticated:", isAuthenticated);
  if (isAuthenticated) return <Navigate to={RoutesPaths.dashboard} replace />;
  
  return children;
};

export default RedirectIfAuth;
