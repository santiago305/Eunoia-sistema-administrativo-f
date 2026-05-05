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
import { Navigate, RouteObject } from "react-router-dom";
import PrivateRoute from "../guards/PrivateRoute";
import CompanyRequiredRoute from "../guards/CompanyRequiredRoute";
import { getRouteMetaByPath } from "../config/routesConfig";
import { RoutesPaths } from "../config/routesPaths";

const DashboardLayout = lazy(() => import("@/shared/layouts/DashboardLayout"));
const ErrorPage = lazy(() => import("@/pages/Error404"));
const Dashboard = lazy(() => import("@/features/dashboard/Index"));
const Users = lazy(() => import("@/features/users/Users"));
const RolesPermissions = lazy(() => import("@/features/roles/RolesPermissions"));
const ProfilePage = lazy(() => import("@/features/profile/Profile"));
const Sessions = lazy(() => import("@/features/sessions/Sessions"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const NotificationDetailPage = lazy(() => import("@/pages/NotificationDetailPage"));
const Securitypage = lazy(() => import("@/features/security/security"));
const IpsDetails = lazy(() => import("@/features/security/IpDetailPage"));
const CatalogSummary = lazy(() => import("@/features/catalog/products/Summary"));
const CatalogProducts = lazy(() => import("@/features/catalog/products/Products"));
const CatalogTransferences = lazy(() => import("@/features/catalog/products/TransferProduts"));
const CatalogAdjustments = lazy(() => import("@/features/catalog/products/AdjustmentProduts"));
const CatalogAdjustment = lazy(() => import("@/features/catalog/products/components/AdjustmentFormProducts"));
const Warehouses = lazy(() => import("@/features/warehouse/Warehouses"));
const Locations = lazy(() => import("@/features/warehouse/components/LocationModal"));
const RowMaterial = lazy(() => import("@/features/catalog/raw-material/RowMaterial"));
const RowMaterialSummary = lazy(() => import("@/features/catalog/raw-material/SummaryRow"));
const RowMaterialAdjustments = lazy(() => import("@/features/catalog/raw-material/AdjustmentRowMaterials"));
const RowMaterialDocuments = lazy(() => import("@/features/catalog/raw-material/InventoryRowMaterial"));
const Providers = lazy(() => import("@/features/providers/Providers"));
const Purchase = lazy(() => import("@/features/purchases/Purchase"));
const Purchases = lazy(() => import("@/features/purchases/Purchases"));
const Company = lazy(() => import("@/features/company/Company"));
const Production = lazy(() => import("@/features/production/Productions"));
const KardexPrima = lazy(() => import("@/features/catalog/raw-material/KardexPrima"));
const KardexFinished = lazy(() => import("@/features/catalog/products/KardexFinished"));
const TransferRowMaterial = lazy(() => import("@/features/catalog/raw-material/TransferRowMaterial"));
const OutOrder = lazy(() => import("@/features/out-orders/OutOrder"));
const CatalogInventory = lazy(() => import("@/features/catalog/products/Inventory"));

const withRouteGuard = (path: string, element: ReactElement) => {
    const routeMeta = getRouteMetaByPath(path);
    return (
      <PrivateRoute
        rolesAllowed={routeMeta?.rolesAllowed}
        permissionsAllowed={routeMeta?.permissionsAllowed}
      >
        {element}
      </PrivateRoute>
    );
};

const withCompanyRouteGuard = (path: string, element: ReactElement) =>
  withRouteGuard(path, <CompanyRequiredRoute>{element}</CompanyRequiredRoute>);

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
            { index: true, element: withRouteGuard(RoutesPaths.dashboard, <Dashboard />) },
            {
                path: RoutesPaths.users,
                element: withRouteGuard(RoutesPaths.users, <Users />),
            },
            {
                path: RoutesPaths.roles,
                element: withRouteGuard(RoutesPaths.roles, <RolesPermissions />),
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
                path: RoutesPaths.notifications,
                element: withRouteGuard(RoutesPaths.notifications, <NotificationsPage />),
            },
            {
                path: RoutesPaths.notificationDetail,
                element: withRouteGuard(RoutesPaths.notificationDetail, <NotificationDetailPage />),
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
                path: RoutesPaths.catalogTransferences,
                element: withRouteGuard(RoutesPaths.catalogTransferences, <CatalogTransferences />),
            },
            {
                path: RoutesPaths.catalogAdjustments,
                element: withRouteGuard(RoutesPaths.catalogAdjustments, <CatalogAdjustments />),
            },
            {
                path: RoutesPaths.catalogAdjustment,
                element: withCompanyRouteGuard(RoutesPaths.catalogAdjustment, <CatalogAdjustment />),
            },
            {
                path: RoutesPaths.KardexFinished,
                element: withRouteGuard(RoutesPaths.KardexFinished, <KardexFinished />),
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
                path: RoutesPaths.rowMaterialDocuments,
                element: withRouteGuard(RoutesPaths.rowMaterialDocuments, <RowMaterialDocuments />),
            },
            {
                path: RoutesPaths.rowMaterialAdjustments,
                element: withRouteGuard(RoutesPaths.rowMaterialAdjustments, <RowMaterialAdjustments />),
            },
            {
                path: RoutesPaths.KardexPrima,
                element: withRouteGuard(RoutesPaths.KardexPrima, <KardexPrima />),
            },
            {
                path: RoutesPaths.providers,
                element: withRouteGuard(RoutesPaths.providers, <Providers />),
            },
            {
                path: RoutesPaths.purchase,
                element: withCompanyRouteGuard(RoutesPaths.purchase, <Purchase />),
            },
            {
                path: RoutesPaths.purchases,
                element: withRouteGuard(RoutesPaths.purchases, <Purchases />),
            },
            {
                path: RoutesPaths.purchaseEdit,
                element: withCompanyRouteGuard(RoutesPaths.purchaseEdit, <Purchase />),
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
                element: withRouteGuard(RoutesPaths.productionCreate, <Navigate to={RoutesPaths.production} replace />),
            },
            {
                path: RoutesPaths.productionEdit,
                element: withRouteGuard(RoutesPaths.productionEdit, <Navigate to={RoutesPaths.production} replace />),
            },
            {
                path: RoutesPaths.outOrder,
                element: withCompanyRouteGuard(RoutesPaths.outOrder, <OutOrder />),
            },
            {
                path: RoutesPaths.catalogInventory,
                element: withRouteGuard(RoutesPaths.catalogInventory, <CatalogInventory />),
            },
            {
                path: RoutesPaths.rowMaterialTransfer,
                element: withCompanyRouteGuard(RoutesPaths.rowMaterialTransfer, <TransferRowMaterial />),
            },
        ],
    },
];
