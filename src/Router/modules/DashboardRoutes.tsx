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
const Users = lazy(() => import("@/pages/users/Users"));
const CreateUser = lazy(() => import("@/pages/users/CreateU"));
const Dashboard = lazy(() => import("@/pages/dashboard/dashboard"));
const Profile = lazy(() => import("@/pages/users/Profile"));

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
        ],
    },
];
