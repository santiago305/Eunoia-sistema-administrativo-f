/**
 * Definicion de rutas protegidas bajo el Dashboard.
 * 
 * - Se utiliza `PrivateRoute` para proteger las rutas que requieren autenticacion.
 * - Las rutas estan anidadas bajo `DashboardLayout`.
 * - Soporta subrutas especificas para roles (admin, monitor, users).
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
const Sessions = lazy(() => import("@/pages/users/Sessions"));

const StockSummary = lazy(() => import("@/pages/stock/StockSummary"));
const StockInventory = lazy(() => import("@/pages/stock/Inventory"));
const StockMovements = lazy(() => import("@/pages/stock/Movements"));
const StockDocuments = lazy(() => import("@/pages/stock/Documents"));
const StockTransfers = lazy(() => import("@/pages/stock/Transfers"));
const StockAdjustments = lazy(() => import("@/pages/stock/Adjustments"));
const StockSeriesTypes = lazy(() => import("@/pages/stock/SeriesTypes"));
const StockReservations = lazy(() => import("@/pages/stock/Reservations"));
const StockReplenishment = lazy(() => import("@/pages/stock/Replenishment"));
const CatalogSummary = lazy(() => import("@/pages/catalog/Summary"));
const CatalogProducts = lazy(() => import("@/pages/catalog/Products"));
const CatalogVariants = lazy(() => import("@/pages/catalog/Variants"));
const Warehouses = lazy(() => import("@/pages/warehouse/Warehouses"));
const Locations = lazy(() => import("@/pages/warehouse/Locations"));
const RowMaterial = lazy(() => import("@/pages/row-material/RowMaterial"));
const RowMaterialSummary = lazy(() => import("@/pages/row-material/SummaryRow"));
const Providers = lazy(() => import("@/pages/providers/providers"));

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
            {
                path: RoutesPaths.stockSummary,
                element: <StockSummary />,
            },
            {
                path: RoutesPaths.stockInventory,
                element: <StockInventory />,
            },
            {
                path: RoutesPaths.stockMovements,
                element: <StockMovements />,
            },
            {
                path: RoutesPaths.stockDocuments,
                element: <StockDocuments />,
            },
            {
                path: RoutesPaths.stockTransfers,
                element: <StockTransfers />,
            },
            {
                path: RoutesPaths.stockAdjustments,
                element: <StockAdjustments />,
            },
            {
                path: RoutesPaths.stockSeriesTypes,
                element: <StockSeriesTypes />,
            },
            {
                path: RoutesPaths.stockReservations,
                element: <StockReservations />,
            },
            {
                path: RoutesPaths.stockReplenishment,
                element: <StockReplenishment />,
            },
            {
                path: RoutesPaths.catalogProducts,
                element: <CatalogProducts />,
            },
            {
                path: RoutesPaths.catalogSummary,
                element: <CatalogSummary />,
            },
            {
                path: RoutesPaths.catalogVariants,
                element: <CatalogVariants />,
            },
            {
                path: RoutesPaths.warehouses,
                element: <Warehouses/>,
            },
            {
                path: RoutesPaths.location,
                element: <Locations/>,
            },
            {
                path: RoutesPaths.rowMaterialSummary,
                element: <RowMaterialSummary/>,
            },
            {
                path: RoutesPaths.rowMaterial,
                element: <RowMaterial/>,
            },
            {
                path: RoutesPaths.providers,
                element: <Providers/>,
            }
        ],
    },
];
