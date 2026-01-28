/**
 * Definición de rutas protegidas bajo el Dashboard.
 * 
 * - Se utiliza `PrivateRoute` para proteger las rutas que requieren autenticación.
 * - Las rutas están anidadas bajo `DashboardLayout`.
 * - Soporta subrutas específicas para roles (admin, monitor, users).
 * 
 * @module DashboardRoutes
 */

import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import PrivateRoute from "../guards/PrivateRoute";
import { RoutesPaths } from "../config/routesPaths";
import { Home } from "@/pages";


const ErrorPage = lazy(() => import("@/pages/Error404"));

export const dashboardRoutes: RouteObject[] = [
  {
    path: RoutesPaths.dashboard,
    element: (
      <PrivateRoute>
        <Home />
      </PrivateRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> }, // /dashboard
    ],
  },
];
