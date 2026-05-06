import { matchPath } from "react-router-dom";
import { RouteMetadata } from "../types/RouterTypes";
import { RoutesPaths } from "./routesPaths";

export const routesConfig: RouteMetadata[] = [
  // Rutas de autenticacion
  { path: RoutesPaths.login, name: "Login", isAuthRoute: true },

  // Dashboard
  { path: RoutesPaths.dashboard, name: "Dashboard", isProtected: true, permissionsAllowed: ["page.dashboard.view"] },
  { path: RoutesPaths.profile, name: "profile", isProtected: true, permissionsAllowed: ["page.profile.view"] },
  { path: RoutesPaths.sessions, name: "sessions", isProtected: true, permissionsAllowed: ["page.sessions.view"] },
  { path: RoutesPaths.notifications, name: "notifications", isProtected: true, permissionsAllowed: ["page.notifications.view"] },
  { path: RoutesPaths.notificationDetail, name: "notificationDetail", isProtected: true, permissionsAllowed: ["page.notifications.view"] },
  {
    path: RoutesPaths.users,
    name: "users",
    isProtected: true,
    permissionsAllowed: ["page.users.view"],
  },
  {
    path: RoutesPaths.roles,
    name: "roles",
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
  { path: RoutesPaths.catalogProducts, name: "catalogProducts", isProtected: true, permissionsAllowed: ["page.catalog.view"] },
  { path: RoutesPaths.catalogVariants, name: "catalogVariants", isProtected: true, permissionsAllowed: ["page.catalog.view"] },
  { path: RoutesPaths.catalogTransferences, name: "catalogTransferences", isProtected: true, permissionsAllowed: ["page.catalog.view"] },
  { path: RoutesPaths.catalogAdjustments, name: "catalogAdjustments", isProtected: true, permissionsAllowed: ["page.catalog.view"] },
  { path: RoutesPaths.catalogAdjustment, name: "catalogAdjustment", isProtected: true, permissionsAllowed: ["page.catalog.view"] },
  { path: RoutesPaths.catalogInventory, name: "catalogInventory", isProtected: true, 
    permissionsAllowed: ["page.catalog.view"] },
    
  { path: RoutesPaths.KardexFinished, name: "kardexFinished", isProtected: true, permissionsAllowed: ["page.catalog.view"] },

  { path: RoutesPaths.warehouses, name: "warehouses", isProtected: true, permissionsAllowed: ["page.warehouses.view"] },
  { path: RoutesPaths.location, name: "location", isProtected: true, permissionsAllowed: ["page.warehouses.view"] },

  { path: RoutesPaths.rowMaterialSummary, name: "rowMaterialSummary", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.rowVariant, name: "rowVariant", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.rowMaterial, name: "rowMaterial", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.rowMaterialDocuments, name: "rowMaterialDocuments", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.rowMaterialAdjustments, name: "rowMaterialAdjustments", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.rowMaterialTransfer, name: "rowMaterialTransfer", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },
  { path: RoutesPaths.KardexPrima, name: "kardexPrima", isProtected: true, permissionsAllowed: ["page.raw-material.view"] },

  { path: RoutesPaths.providers, name: "providers", isProtected: true, permissionsAllowed: ["page.providers.view"] },

  { path: RoutesPaths.purchase, name: "purchase", isProtected: true, permissionsAllowed: ["page.purchases.view"] },
  { path: RoutesPaths.purchases, name: "purchases", isProtected: true, permissionsAllowed: ["page.purchases.view"] },
  { path: RoutesPaths.purchaseEdit, name: "purchases", isProtected: true, permissionsAllowed: ["page.purchases.view"] },
  { path: RoutesPaths.payments, name: "payments", isProtected: true, permissionsAllowed: ["page.payments.view"] },

  { path: RoutesPaths.production, name: "production", isProtected: true, permissionsAllowed: ["page.production.view"] },
  { path: RoutesPaths.productionCreate, name: "productionCreate", isProtected: true, permissionsAllowed: ["page.production.view"] },
  { path: RoutesPaths.productionEdit, name: "productionEdit", isProtected: true, permissionsAllowed: ["page.production.view"] },
  
  { path: RoutesPaths.outOrder, name: "outOrder", isProtected: true, permissionsAllowed: ["page.out-orders.view"] },
  
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


