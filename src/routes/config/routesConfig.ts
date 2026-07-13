import { matchPath } from "react-router-dom";
import { RouteMetadata } from "../types/RouterTypes";
import { RoutesPaths } from "./routesPaths";

export const routesConfig: RouteMetadata[] = [
  // Rutas de autenticacion
  { path: RoutesPaths.login, name: "Login", isAuthRoute: true },

  // Dashboard
  { path: RoutesPaths.dashboard, name: "Dashboard", isProtected: true, permissionsAllowed: ["page.dashboard.view"] },
  { path: RoutesPaths.profile, name: "profile", isProtected: true },
  { path: RoutesPaths.sessions, name: "sessions", isProtected: true },
  { path: RoutesPaths.notifications, name: "notifications", isProtected: true },
  { path: RoutesPaths.notificationView, name: "notificationView", isProtected: true },
  { path: RoutesPaths.notificationDetail, name: "notificationDetail", isProtected: true },
  {
    path: RoutesPaths.users,
    name: "users",
    isProtected: true,
    permissionsAllowed: ["page.users.view"],
  },
  {
    path: RoutesPaths.roles,
    name: "permissions",
    isProtected: true,
    permissionsAllowed: ["page.roles.view"],
  },
  {
    path: RoutesPaths.company,
    name: "company",
    isProtected: true,
    permissionsAllowed: ["page.company.view"],
  },

  { path: RoutesPaths.catalogSummary, name: "catalogSummary", isProtected: true, permissionsAllowed: ["page.catalog.view"] },
  { path: RoutesPaths.catalogProducts, name: "catalogProducts", isProtected: true, permissionsAllowed: ["page.products.view"] },
  { path: RoutesPaths.catalogPacks, name: "catalogPacks", isProtected: true, permissionsAllowed: ["page.packs.view"] },
  { path: RoutesPaths.catalogVariants, name: "catalogVariants", isProtected: true, permissionsAllowed: ["page.catalog.view"] },
  { path: RoutesPaths.catalogTransferences, name: "catalogTransferences", isProtected: true, permissionsAllowed: ["page.product-transfers.view"] },
  { path: RoutesPaths.catalogAdjustments, name: "catalogAdjustments", isProtected: true, permissionsAllowed: ["page.product-adjustments.view"] },
  { path: RoutesPaths.catalogAdjustment, name: "catalogAdjustment", isProtected: true, permissionsAllowed: ["page.product-adjustments.view"] },
  { path: RoutesPaths.catalogInventory, name: "catalogInventory", isProtected: true, 
    permissionsAllowed: ["page.product-inventory.view"] },
    
  { path: RoutesPaths.KardexFinished, name: "kardexFinished", isProtected: true, permissionsAllowed: ["page.product-movements.view"] },

  { path: RoutesPaths.warehouses, name: "warehouses", isProtected: true, permissionsAllowed: ["page.warehouses.view"] },
  { path: RoutesPaths.location, name: "location", isProtected: true, permissionsAllowed: ["page.warehouses.view"] },

  { path: RoutesPaths.rowMaterialSummary, name: "rowMaterialSummary", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.rowVariant, name: "rowVariant", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.rowMaterial, name: "rowMaterial", isProtected: true, permissionsAllowed: ["page.materials.view"] },
  { path: RoutesPaths.rowMaterialDocuments, name: "rowMaterialDocuments", isProtected: true, permissionsAllowed: ["page.material-inventory.view"] },
  { path: RoutesPaths.rowMaterialAdjustments, name: "rowMaterialAdjustments", isProtected: true, permissionsAllowed: ["page.material-adjustments.view"] },
  { path: RoutesPaths.rowMaterialTransfer, name: "rowMaterialTransfer", isProtected: true, permissionsAllowed: ["page.material-transfers.view"] },
  { path: RoutesPaths.KardexPrima, name: "kardexPrima", isProtected: true, permissionsAllowed: ["page.material-movements.view"] },

  { path: RoutesPaths.providers, name: "providers", isProtected: true, permissionsAllowed: ["page.suppliers.view"] },
  { path: RoutesPaths.clients, name: "clients", isProtected: true, permissionsAllowed: ["clients.read"] },
  { path: RoutesPaths.agencies, name: "agencies", isProtected: true, permissionsAllowed: ["agencies.read"] },
  { path: RoutesPaths.sources, name: "sources", isProtected: true, permissionsAllowed: ["sources.read"] },

  { path: RoutesPaths.purchase, name: "purchase", isProtected: true, permissionsAllowed: ["page.purchases.view"] },
  { path: RoutesPaths.purchaseDashboard, name: "purchaseDashboard", isProtected: true, permissionsAllowed: ["purchases_dashboard.view"] },
  { path: RoutesPaths.recurringPurchases, name: "recurringPurchases", isProtected: true, permissionsAllowed: ["page.recurring-purchases.view", "recurring_purchases.view"] },
  { path: RoutesPaths.purchases, name: "purchases", isProtected: true, permissionsAllowed: ["page.purchases.view"] },
  { path: RoutesPaths.purchaseReception, name: "purchaseReception", isProtected: true, permissionsAllowed: ["page.purchase-receptions.view", "purchases.receive"] },
  { path: RoutesPaths.purchaseEditPage, name: "purchaseEditPage", isProtected: true, permissionsAllowed: ["page.purchases.view"] },
  { path: RoutesPaths.purchasePayments, name: "purchasePayments", isProtected: true, permissionsAllowed: ["page.payments.view", "payments.read"] },
  { path: RoutesPaths.purchaseDocuments, name: "purchaseDocuments", isProtected: true, permissionsAllowed: ["page.purchases.view", "purchases.attach_documents"] },
  { path: RoutesPaths.purchaseHistory, name: "purchaseHistory", isProtected: true, permissionsAllowed: ["page.purchases.view", "purchases.view_detail", "purchases.view_history"] },
  { path: RoutesPaths.purchaseDetail, name: "purchaseDetail", isProtected: true, permissionsAllowed: ["page.purchases.view", "purchases.view_detail"] },
  { path: RoutesPaths.purchaseEdit, name: "purchaseEditLegacy", isProtected: true, permissionsAllowed: ["page.purchases.view"] },
  { path: RoutesPaths.payments, name: "payments", isProtected: true, permissionsAllowed: ["page.payments.view", "payments.read"] },
  { path: RoutesPaths.accountsPayable, name: "accountsPayable", isProtected: true, permissionsAllowed: ["page.accounts-payable.view", "accounts-payable.view"] },
  { path: RoutesPaths.paymentAccounts, name: "paymentAccounts", isProtected: true, permissionsAllowed: ["page.payment-accounts.view", "payment_accounts.view"] },
  { path: RoutesPaths.paymentMethods, name: "paymentMethods", isProtected: true, permissionsAllowed: ["page.payment-methods.view"] },
  { path: RoutesPaths.saleOrders, name: "saleOrders", isProtected: true },

  { path: RoutesPaths.production, name: "production", isProtected: true, permissionsAllowed: ["page.production.view"] },
  { path: RoutesPaths.productionCreate, name: "productionCreate", isProtected: true, permissionsAllowed: ["page.production.view"] },
  { path: RoutesPaths.productionEdit, name: "productionEdit", isProtected: true, permissionsAllowed: ["page.production.view"] },
  
  // Rutas de seguridad
  { path: RoutesPaths.security, name: "security", isProtected: true, permissionsAllowed: ["page.security.view"]},
  { path: RoutesPaths.ipsdetails, name: "ipsdetails", isProtected: true, permissionsAllowed: ["page.security.view"]},

  // Ruta de error 404
  { path: "*", name: "Error404", isPublic: true },
];

export const getRouteMetaByPath = (path: string) =>
  routesConfig.find((route) => route.path === path);

export const getRouteMetaByUrl = (url: string) =>
  routesConfig.find(
    (route) => route.path !== "*" && !!matchPath({ path: route.path, end: true }, url)
  );


