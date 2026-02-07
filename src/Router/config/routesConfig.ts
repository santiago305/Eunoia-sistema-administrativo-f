import { RouteMetadata } from "../types/RouterTypes";
import { RoutesPaths } from "./routesPaths"

export const routesConfig: RouteMetadata[] = [
  // Rutas de autenticacion
  { path: RoutesPaths.login, name: "Login", isAuthRoute: true },

  // Dashboard
  { path: RoutesPaths.dashboard, name: "Dashboard", isProtected: true },
  { path: RoutesPaths.profile, name: "profile", isProtected: true },
  { path: RoutesPaths.sessions, name: "sessions", isProtected: true },
  { path: RoutesPaths.users, name: "users", isProtected: true },
  { path: RoutesPaths.createUser, name: "createUser", isProtected: true },

  { path: RoutesPaths.stockSummary, name: "stockSummary", isProtected: true },
  { path: RoutesPaths.stockInventory, name: "stockInventory", isProtected: true },
  { path: RoutesPaths.stockMovements, name: "stockMovements", isProtected: true },
  { path: RoutesPaths.stockDocuments, name: "stockDocuments", isProtected: true },
  { path: RoutesPaths.stockTransfers, name: "stockTransfers", isProtected: true },
  { path: RoutesPaths.stockAdjustments, name: "stockAdjustments", isProtected: true },
  { path: RoutesPaths.stockSeriesTypes, name: "stockSeriesTypes", isProtected: true },
  { path: RoutesPaths.stockReservations, name: "stockReservations", isProtected: true },
  { path: RoutesPaths.stockReplenishment, name: "stockReplenishment", isProtected: true },

  // Ruta de error 404
  { path: "*", name: "Error404", isPublic: true },
];

export const getRouteMetaByPath = (path: string) =>
  routesConfig.find((route) => route.path === path);
