/**
 * Central route paths for the app.
 */
export const RoutesPaths = {
  // Auth routes
  login: "/login",
  logout: "/logout",

  // Base routes
  dashboard: "/",
  // Dashboard routes
  home: "/dashboard/home",
  settings: "/dashboard/settings",
  users: "/dashboard/users",
  createUser: "/dashboard/users/create",
  dashboardProducts: "/dashboard/products",
  dashboardProductShow: (id: string) => `/dashboard/products/${id}`,
  dashboardProfile: "/dashboard/profile",
  dashboardSettings: "/dashboard/settings",
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;
