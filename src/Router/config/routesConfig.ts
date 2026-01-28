import { RouteMetadata } from "../types/RouterTypes";

export const routesConfig: RouteMetadata[] = [
  // Rutas de autenticacion
  { path: "/login", name: "Login", isAuthRoute: true },

  // Dashboard
  { path: "/dashboard", name: "Dashboard", isProtected: true },

  // Ruta de error 404
  { path: "*", name: "Error404", isPublic: true },
];
