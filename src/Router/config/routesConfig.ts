import { RouteMetadata } from "../types/RouterTypes";
import { RoutesPaths } from "./routesPaths"

export const routesConfig: RouteMetadata[] = [
  // Rutas de autenticacion
  { path: RoutesPaths.login, name: "Login", isAuthRoute: true },

  // Dashboard
  { path: RoutesPaths.dashboard, name: "Dashboard", isProtected: true },
  { path: RoutesPaths.profile, name: "profile", isProtected: true },
  { path: RoutesPaths.sessions, name: "sessions", isProtected: true },

  // Ruta de error 404
  { path: "*", name: "Error404", isPublic: true },
];

export const getRouteMetaByPath = (path: string) =>
  routesConfig.find((route) => route.path === path);
