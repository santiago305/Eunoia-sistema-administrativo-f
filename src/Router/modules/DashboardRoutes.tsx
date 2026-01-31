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
import { getRouteMetaByPath } from "../config/routesConfig";
import { RoutesPaths } from "../config/routesPaths";

const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const ErrorPage = lazy(() => import("@/pages/Error404"));
const Dashboard = lazy(() => import("@/pages/dashboard/Index"));
const Users = lazy(() => import("@/pages/users/Users"));
const CreateUser = lazy(() => import("@/pages/users/CreateU"));
const Profile = lazy(() => import("@/pages/users/Profile"));
const Sessions = lazy(() => import("@/pages/settings/Sessions"));

export const dashboardRoutes: RouteObject[] = [
    {
        path: RoutesPaths.dashboard,
        element: (
            <PrivateRoute>
                <DashboardLayout />
            </PrivateRoute>
        ),
        errorElement: <ErrorPage />,
        handle: getRouteMetaByPath(RoutesPaths.dashboard),

        children: [
            { index: true, element: <Dashboard/> }, 
            {
                path: RoutesPaths.users,
                element: <Users />, 
            },
            {
                path: RoutesPaths.createUser,
                element: <CreateUser />, 
            },
            {
                path: RoutesPaths.profile,
                element: <Profile />, 
            },
            {
                path: RoutesPaths.sessions,
                element: <Sessions />, 
            },
        ],
    },
];
