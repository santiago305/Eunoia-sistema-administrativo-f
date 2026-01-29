/**
 * Rutas relacionadas con la autenticación de usuarios.
 * 
 * - Estas rutas solo están disponibles para usuarios no autenticados.
 * - Se utiliza `RedirectIfAuth` para redirigir a usuarios autenticados que intenten acceder a estas rutas.
 * 
 * @module AuthRoutes
 */

import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import RedirectIfAuth from "../guards/RedirectIfAuth";
import { getRouteMetaByPath } from "../config/routesConfig";
import { RoutesPaths } from "../config/routesPaths";

const Login = lazy(() => import("@/pages/Auth/Login"));
const ErrorPage = lazy(() => import("@/pages/Error404"));

export const authRoutes: RouteObject[] = [
  {
    path: RoutesPaths.login,
    element: (
      <RedirectIfAuth>
        <Login />
      </RedirectIfAuth>
    ),
    errorElement: <ErrorPage />,
    handle: getRouteMetaByPath(RoutesPaths.login),
  },
];
