import { lazy } from "react";
import { RouteObject } from "react-router-dom";
import PrivateRoute from "../../Router/guards/PrivateRoute";
// import { dashboardPublicRoutes } from "../../Router/modules/dashboard";
// import { adminRoutes } from "./dashboard/adminRoutes";
// import { monitorRoutes } from "./dashboard/monitorRoutes";
import { usersRoutes } from "../../Router/modules/dashboard/usersRoutes";
import { RoutesPaths } from "../config/routesPaths";
import { Home } from "@/pages/Home";
import { DashboardLayout } from "@/pages/DashboardLayout";

const ErrorPage = lazy(() => import("@/pages/Error404"));

export const dashboardRoutes: RouteObject[] = [
    {
        path: RoutesPaths.dashboard,
        element: (
            <PrivateRoute>
                <DashboardLayout />
            </PrivateRoute>
        ),
        errorElement: <ErrorPage />,
        children: [
            { index: true, element: <Home /> }, // /dashboard
            // ...dashboardPublicRoutes,
            // ...adminRoutes,
            // ...monitorRoutes,
            ...usersRoutes,
        ],
    },
];
