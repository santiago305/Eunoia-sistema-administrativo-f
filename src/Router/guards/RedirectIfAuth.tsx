import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PropsUrl } from "@/Router/guards/typeGuards";
import { RoutesPaths } from "../config/routesPaths";

/**
 * Guardian de Rutas de Autenticacion.
 *
 * Este componente se utiliza para proteger las rutas de autenticacion,
 * evitando que usuarios ya autenticados accedan a paginas como Login.
 *
 * - Si el usuario ya esta autenticado, es redirigido a la pagina principal (Home).
 * - Si no esta autenticado, permite el acceso al componente hijo (como Login).
 *
 * @param {PropsUrl} children - El componente o grupo de componentes a renderizar si NO esta autenticado.
 * @returns {JSX.Element} El componente protegido o una redireccion a Home.
 *
 * @example
 * <RedirectIfAuth>
 *   <Login />
 * </RedirectIfAuth>
 */
const RedirectIfAuth = ({ children }: PropsUrl) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to={RoutesPaths.dashboard} replace />;

  return children;
};

export default RedirectIfAuth;
