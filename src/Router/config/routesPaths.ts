/**
 * Central route paths for the app.
 */
export const RoutesPaths = {
  // Auth routes
  login: "/login",
  // Dashboard routes
  dashboard: "/",
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;
