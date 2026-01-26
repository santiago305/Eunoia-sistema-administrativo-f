/**
 * Central route paths for the app.
 */
export const RoutesPaths = {
  // Auth routes
  login: "/login",

  // Base routes
  home: "/",
  // Dashboard routes
  dashboard: "/dashboard",
  dashboardProducts: "/dashboard/products",
  dashboardProductShow: (id: string) => `/dashboard/products/${id}`,
  dashboardProfile: "/dashboard/profile",
  dashboardSettings: "/dashboard/settings",
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;
