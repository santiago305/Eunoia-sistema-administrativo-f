
/**
 * Grupo de rutas para la autenticación.
 */
export const API_AUTH_GROUP = {
  authentication: '/auth/login',
  logout: '/auth/logout',
  refreshToken: '/auth/refresh',
  validateToken: '/auth/validate-token',
  userAuth: '/auth/me',
  verifyPassword: `/auth/verify-password`,
};

/**
 * Grupo de rutas para la gestión de usuarios.
 */
export const API_USERS_GROUP = {
  createUser: '/users/create',
  findAll: '/users/findAll',
  findActives: '/users/actives',
  findDesactive: '/users/desactive',
  findOwnUser: '/users/me',
  findById: (id: string) => `/users/search/${id}`,
  findByEmail: (email: string) => `/users/email/${email}`,
  updateUser: (id: string) => `/users/update/${id}`,
  deleteUser: (id: string) => `/users/delete/${id}`,
  restoreUser: (id: string) => `/users/restore/${id}`,
  updateAvatar: (id: string) => `/users/${id}/avatar`,
  removeAvatar: (id: string) => `/users/remove-avatar/${id}`,
  changePassword: (id: string) => `/users/change-password/${id}`,
};
export const API_ROLES_GROUP = {
  findAll: "/roles",
};

export const API_SESSIONS_GROUP = {
  findAll: "/sessions",
  revokeSession: (id: string) => `/sessions/${id}`,
  revokeAll: "/sessions",
};

export const API_PRODUCTS_GROUP = {
  base: "/catalog/products",
  create: "/catalog/products",
  list: "/catalog/products",
  byId: (id: string) => `/catalog/products/${id}`,
  byName: (name: string) => `/catalog/products/by-name/${encodeURIComponent(name)}`,
  update: (id: string) => `/catalog/products/${id}`,
  updateActive: (id: string) => `/catalog/products/${id}/active`,
  variants: (id: string) => `/catalog/products/${id}/variants`,
  withVariants: (id: string) => `/catalog/products/${id}/with-variants`,
};

export const API_VARIANTS_GROUP = {
  base:"/catalog/variants",
  create:"/catalog/variants",
  list:"/catalog/variants",
  byId: (id: string) => `/catalog/variants/${id}`,
  update: (id: string) => `/catalog/variants/${id}`,
  updateActive: (id: string) => `/catalog/variants/${id}/active`
}
