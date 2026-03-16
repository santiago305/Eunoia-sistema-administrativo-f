/**
 * Definicion de rutas protegidas bajo el Dashboard.
 *
 * - Se utiliza `PrivateRoute` para proteger las rutas que requieren autenticacion.
 * - Las rutas estan anidadas bajo `DashboardLayout`.
 * - Soporta subrutas especificas para roles (admin, monitor, users).
 *
 * @module DashboardRoutes
 */

import { lazy, ReactElement } from "react";
import { RouteObject } from "react-router-dom";
import PrivateRoute from "../guards/PrivateRoute";
import { getRouteMetaByPath } from "../config/routesConfig";
import { RoutesPaths } from "../config/routesPaths";

const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const ErrorPage = lazy(() => import("@/pages/Error404"));
const Dashboard = lazy(() => import("@/pages/dashboard/Index"));
const Users = lazy(() => import("@/pages/users/Users"));
const ProfilePage = lazy(() => import("@/pages/profile/Profile"));
const Sessions = lazy(() => import("@/pages/sessions/Sessions"));
const Securitypage = lazy(() => import("@/pages/security/security"));
const IpsDetails = lazy(() => import("@/pages/security/IpDetailPage"));
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
const Locations = lazy(() => import("@/pages/warehouse/components/LocationModal"));
const RowMaterial = lazy(() => import("@/pages/row-material/RowMaterial"));
const RowVariant = lazy(() => import("@/pages/row-material/RowVariant"));
const RowMaterialSummary = lazy(() => import("@/pages/row-material/SummaryRow"));
const Providers = lazy(() => import("@/pages/providers/Providers"));
const Purchase = lazy(() => import("@/pages/purchases/Purchase"));
const Purchases = lazy(() => import("@/pages/purchases/Purchases"));
const Company = lazy(() => import("@/pages/company/Company"));
const Production = lazy(() => import("@/pages/production/Productions"));
const ProductionCreate = lazy(() => import("@/pages/production/Production"));

const withRouteGuard = (path: string, element: ReactElement) => {
    const routeMeta = getRouteMetaByPath(path);
    return <PrivateRoute rolesAllowed={routeMeta?.rolesAllowed}>{element}</PrivateRoute>;
};

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
            { index: true, element: <Dashboard /> },
            {
                path: RoutesPaths.users,
                element: withRouteGuard(RoutesPaths.users, <Users />),
            },
            {
                path: RoutesPaths.profile,
                element: withRouteGuard(RoutesPaths.profile, <ProfilePage />),
            },
            {
                path: RoutesPaths.sessions,
                element: withRouteGuard(RoutesPaths.sessions, <Sessions />),
            },
            {
                path: RoutesPaths.stockSummary,
                element: withRouteGuard(RoutesPaths.stockSummary, <StockSummary />),
            },
            {
                path: RoutesPaths.stockInventory,
                element: withRouteGuard(RoutesPaths.stockInventory, <StockInventory />),
            },
            {
                path: RoutesPaths.stockMovements,
                element: withRouteGuard(RoutesPaths.stockMovements, <StockMovements />),
            },
            {
                path: RoutesPaths.stockDocuments,
                element: withRouteGuard(RoutesPaths.stockDocuments, <StockDocuments />),
            },
            {
                path: RoutesPaths.stockTransfers,
                element: withRouteGuard(RoutesPaths.stockTransfers, <StockTransfers />),
            },
            {
                path: RoutesPaths.stockAdjustments,
                element: withRouteGuard(RoutesPaths.stockAdjustments, <StockAdjustments />),
            },
            {
                path: RoutesPaths.stockSeriesTypes,
                element: withRouteGuard(RoutesPaths.stockSeriesTypes, <StockSeriesTypes />),
            },
            {
                path: RoutesPaths.stockReservations,
                element: withRouteGuard(RoutesPaths.stockReservations, <StockReservations />),
            },
            {
                path: RoutesPaths.stockReplenishment,
                element: withRouteGuard(RoutesPaths.stockReplenishment, <StockReplenishment />),
            },
            {
                path: RoutesPaths.catalogProducts,
                element: withRouteGuard(RoutesPaths.catalogProducts, <CatalogProducts />),
            },
            {
                path: RoutesPaths.catalogSummary,
                element: withRouteGuard(RoutesPaths.catalogSummary, <CatalogSummary />),
            },
            {
                path: RoutesPaths.catalogVariants,
                element: withRouteGuard(RoutesPaths.catalogVariants, <CatalogVariants />),
            },
            {
                path: RoutesPaths.warehouses,
                element: withRouteGuard(RoutesPaths.warehouses, <Warehouses />),
            },
            {
                path: RoutesPaths.location,
                element: withRouteGuard(RoutesPaths.location, <Locations />),
            },
            {
                path: RoutesPaths.rowMaterialSummary,
                element: withRouteGuard(RoutesPaths.rowMaterialSummary, <RowMaterialSummary />),
            },
            {
                path: RoutesPaths.rowMaterial,
                element: withRouteGuard(RoutesPaths.rowMaterial, <RowMaterial />),
            },
            {
                path: RoutesPaths.rowVariant,
                element: withRouteGuard(RoutesPaths.rowVariant, <RowVariant />),
            },
            {
                path: RoutesPaths.providers,
                element: withRouteGuard(RoutesPaths.providers, <Providers />),
            },
            {
                path: RoutesPaths.purchase,
                element: withRouteGuard(RoutesPaths.purchase, <Purchase />),
            },
            {
                path: RoutesPaths.purchases,
                element: withRouteGuard(RoutesPaths.purchases, <Purchases />),
            },
            {
                path: RoutesPaths.purchaseEdit,
                element: withRouteGuard(RoutesPaths.purchaseEdit, <Purchase />),
            },
            {
                path: RoutesPaths.security,
                element: withRouteGuard(RoutesPaths.security, <Securitypage />),
            },
            {
                path: RoutesPaths.ipsdetails,
                element: withRouteGuard(RoutesPaths.ipsdetails, <IpsDetails />),
            },
            {
                path: RoutesPaths.company,
                element: withRouteGuard(RoutesPaths.company, <Company />),
            },
            {
                path: RoutesPaths.production,
                element: withRouteGuard(RoutesPaths.production, <Production />),
            },
            {
                path: RoutesPaths.productionCreate,
                element: withRouteGuard(RoutesPaths.productionCreate, <ProductionCreate />),
            },
        ],
    },
];
