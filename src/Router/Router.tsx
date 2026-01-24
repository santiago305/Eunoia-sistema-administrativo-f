/**
 * Configuración principal del enrutador de la aplicación.
 * 
 * - Se utiliza `createBrowserRouter` de React Router v7.5 para gestionar las rutas de forma centralizada.
 * - Las rutas se estructuran en módulos separados para mejorar la escalabilidad y organización:
 *   - `publicRoutes`: Rutas públicas accesibles sin autenticación.
 *   - `authRoutes`: Rutas relacionadas con autenticación (Login, Registro).
 *   - `clientsRoutes`: Rutas para completar el registro de cliente.
 *   - `dashboardRoutes`: Rutas protegidas bajo el layout de Dashboard.
 * 
 * - Se incluye una ruta wildcard (`*`) para manejar las rutas no encontradas (404), utilizando el componente `ErrorPage`.
 * 
 * @example
 * Navegación típica:
 * - "/" → Página de inicio pública.
 * - "/login" → Página de Login.
 * - "/dashboard" → Rutas protegidas bajo Dashboard.
 * 
 * @returns {Router} Instancia de enrutador de la aplicación.
 */

import ErrorPage from "@/pages/Error404";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { authRoutes } from "./modules/AuthRoutes";
import { dashboardRoutes } from "./modules/DashboardRoutes";
import { RoutesPaths } from "./config/routesPaths";

export const router = createBrowserRouter([
  {
    path: RoutesPaths.home,
    element: <Navigate to={RoutesPaths.login} replace />,
  },
  ...authRoutes,
  ...dashboardRoutes,
  {
    path: "*",
    element: <ErrorPage />, // Ruta para manejar errores 404 (página no encontrada)
  },
]);
