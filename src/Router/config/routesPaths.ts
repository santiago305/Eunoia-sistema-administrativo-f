/**
 * Central route paths for the app.
 */
export const RoutesPaths = {
  // Auth routes
  login: "/login",
  // Dashboard routes
  dashboard: "/",
  settings: "/dashboard/settings",
  users: "/dashboard/users",
  createUser: "/dashboard/users/create",
  profile: "/dashboard/profile",
  changePassword: "/dashboard/change-password",
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;
