
/**
 * Central route paths for the app.
 */
export const RoutesPaths = {
  // Auth routes
  login: "/login",
  // Dashboard routes
  dashboard: "/",
  // paginas de usuario propio
  profile: "/profile",
  sessions: "/sessions-actives",
  changePassword: "/changePassword",

  
  createUser: "/users/create",
  users: "/users",
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;
