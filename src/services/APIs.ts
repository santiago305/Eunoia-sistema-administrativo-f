
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

export const API_PROFILE_GROUP = {
  me: "/users/me",
  updateMe: "/users/me/update",
  changePasswordMe: "/users/me/change-password",
  avatarMe: "/users/me/avatar",
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
  listRowMaterials: "/catalog/variants/row-materials",
  byId: (id: string) => `/catalog/variants/${id}`,
  update: (id: string) => `/catalog/variants/${id}`,
  updateActive: (id: string) => `/catalog/variants/${id}/active`
}

export const API_WAREHOUSES_GROUP = {
  base: "/warehouses",
  create: "/warehouses",
  list: "/warehouses",
  getById: (id: string) => `/warehouses/${id}`,
  getWithLocations: (id: string) => `/warehouses/${id}/locations`,
  update: (id: string) => `/warehouses/${id}`,
  updateActive: (id: string) => `/warehouses/${id}/active`,
};

export const API_LOCATIONS_GROUP = {
  base: "/warehouses/locations",
  create: "/warehouses/locations",
  list: "/warehouses/locations/all",
  byId: (id: string) => `/warehouses/locations/${id}`,
  update: (id: string) => `/warehouses/locations/${id}`,
  updateActive: (id: string) => `/warehouses/locations/${id}/active`,
};

export const API_UNITS_GROUP = {
  list: "catalog/units"
};

export const API_PRODUCT_EQUIVALENCES_GROUP = {
  base: "/catalog/product-equivalences",
  create: "/catalog/product-equivalences",
  list: "/catalog/product-equivalences",
  byId: (id: string) => `/catalog/product-equivalences/${id}`,
  delete: (id: string) => `/catalog/product-equivalences/${id}`,
};

export const API_PRODUCT_RECIPES_GROUP = {
  base: "/catalog/product-recipes",
  create: "/catalog/product-recipes",
  list: "/catalog/product-recipes",
  byId: (id: string) => `/catalog/product-recipes/${id}`,
  delete: (id: string) => `/catalog/product-recipes/${id}`,
};

export const API_SUPPLIERS_GROUP = {
  base: "/suppliers",
  create: "/suppliers",
  list: "/suppliers",
  byId: (id: string) => `/suppliers/${id}`,
  update: (id: string) => `/suppliers/${id}`,
  updateActive: (id: string) => `/suppliers/${id}/active`,
  identityLookup: "/identity",
};

export const API_SUPPLIER_VARIANTS_GROUP = {
  base: "/suppliers/variants",
  create: "/suppliers/variants",
  list: "/suppliers/variants/all",
  byId: (supplierId: string, variantId: string) => `/suppliers/variants/${supplierId}/${variantId}`,
  update: (supplierId: string, variantId: string) => `/suppliers/variants/${supplierId}/${variantId}`,
};
