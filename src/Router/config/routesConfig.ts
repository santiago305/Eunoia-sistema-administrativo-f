import { matchPath } from "react-router-dom";
import { RouteMetadata } from "../types/RouterTypes";
import { RoutesPaths } from "./routesPaths";

export const routesConfig: RouteMetadata[] = [
  // Rutas de autenticacion
  { path: RoutesPaths.login, name: "Login", isAuthRoute: true },

  // Dashboard
  { path: RoutesPaths.dashboard, name: "Dashboard", isProtected: true },
  { path: RoutesPaths.profile, name: "profile", isProtected: true },
  { path: RoutesPaths.sessions, name: "sessions", isProtected: true },
  {
    path: RoutesPaths.users,
    name: "users",
    isProtected: true,
    rolesAllowed: ["admin"],
  },
  {
    path: RoutesPaths.createUser,
    name: "createUser",
    isProtected: true,
    rolesAllowed: ["admin"],
  },

  { path: RoutesPaths.stockSummary, name: "stockSummary", isProtected: true },
  { path: RoutesPaths.stockInventory, name: "stockInventory", isProtected: true },
  { path: RoutesPaths.stockMovements, name: "stockMovements", isProtected: true },
  { path: RoutesPaths.stockDocuments, name: "stockDocuments", isProtected: true },
  { path: RoutesPaths.stockTransfers, name: "stockTransfers", isProtected: true },
  {
    path: RoutesPaths.stockAdjustments,
    name: "stockAdjustments",
    isProtected: true,
    rolesAllowed: ["admin", "supervisor"],
  },
  {
    path: RoutesPaths.stockSeriesTypes,
    name: "stockSeriesTypes",
    isProtected: true,
    rolesAllowed: ["admin", "supervisor"],
  },
  {
    path: RoutesPaths.stockReservations,
    name: "stockReservations",
    isProtected: true,
    rolesAllowed: ["admin", "supervisor"],
  },
  { path: RoutesPaths.stockReplenishment, name: "stockReplenishment", isProtected: true },

  { path: RoutesPaths.catalogSummary, name: "catalogSummary", isProtected: true },
  { path: RoutesPaths.catalogProducts, name: "catalogProducts", isProtected: true },
  { path: RoutesPaths.catalogVariants, name: "catalogVariants", isProtected: true },

  { path: RoutesPaths.warehouses, name: "warehouses", isProtected: true },
  { path: RoutesPaths.location, name: "location", isProtected: true },

  { path: RoutesPaths.rowMaterialSummary, name: "rowMaterialSummary", isProtected: true },
  { path: RoutesPaths.rowVariant, name: "rowVariant", isProtected: true },
  { path: RoutesPaths.rowMaterial, name: "rowMaterial", isProtected: true },

  { path: RoutesPaths.providers, name: "providers", isProtected: true },

  // Ruta de error 404
  { path: "*", name: "Error404", isPublic: true },
];

export const getRouteMetaByPath = (path: string) =>
  routesConfig.find((route) => route.path === path);

export const getRouteMetaByUrl = (url: string) =>
  routesConfig.find(
    (route) => route.path !== "*" && !!matchPath({ path: route.path, end: true }, url)
  );
