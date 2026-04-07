
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
  list: "/users",
  createUser: '/users/create',
  findAll: '/users/findAll',
  countByRole: '/users/count-by-role',
  findActives: '/users/actives',
  findDesactive: '/users/desactive',
  findOwnUser: '/users/me',
  findById: (id: string) => `/users/search/${id}`,
  findByEmail: (email: string) => `/users/email/${email}`,
  updateUserRole: (id: string) => `/users/${id}/role`,
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

export const API_COMPANY_GROUP = {
  create: "/company",
  update: "/company",
  get: "/company",
  uploadLogo: "/company/logo",
  uploadCert: "/company/cert",
};
export const API_ROLES_GROUP = {
  findAll: "/roles",
};

export const API_SESSIONS_GROUP = {
  findAll: "/sessions",
  revokeSession: (id: string) => `/sessions/${id}`,
  revokeAll: "/sessions",
};

export const API_SECURITY_GROUP = {
  summary: "/security/summary",
  topIps: "/security/top-ips",
  activeBans: "/security/active-bans",
  historyByIp: (ip: string) => `/security/history/${encodeURIComponent(ip)}`,
  blacklist: "/security/blacklist",
  removeBlacklist: (ip: string) => `/security/blacklist/remove/${encodeURIComponent(ip)}`,
  activitySeries: "/security/activity-series",
  reasonDistribution: "/security/reason-distribution",
  reasons: "/security/reasons",
  methodDistribution: "/security/method-distribution",
  topRoutes: "/security/top-routes",
  riskScore: "/security/risk-score",
  riskScoreByIp: "/security/risk-score/ip",
  auditExport: "/security/audit-export",
};

export const API_PRODUCTS_GROUP = {
  base: "/catalog/products",
  create: "/catalog/products",
  list: "/catalog/products",
  flat: "/catalog/products/flat",
  productFinisheds: "/catalog/products/variants/finished",
  productFinishedsActive: "/catalog/products/finished/active",
  productPrimasActive: "/catalog/products/prima/active",
  finishedWithRecipes: "/catalog/products/variants/finished-with-recipes",
  byId: (id: string) => `/catalog/products/${id}/variants`,
  byIdP: (id: string) => `/catalog/products/${id}`,
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
  searchProductAndVariant: (q: string, raw = true, withRecipes = false) =>
  `/catalog/products/variants/search?q=${encodeURIComponent(q)}&raw=${raw}&withRecipes=${withRecipes}`,
  byId: (id: string) => `/catalog/variants/${id}`,
  update: (id: string) => `/catalog/variants/${id}`,
  updateActive: (id: string) => `/catalog/variants/${id}/active`
}

export const API_WAREHOUSES_GROUP = {
  base: "/warehouses",
  create: "/warehouses",
  list: "/warehouses",
  listActive: "/warehouses/active",
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
  listAll: "/suppliers/active",
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
export const API_PURCHASE_GROUP = {
  base: "/purchases/orders",
  create: "/purchases/orders",
  list: "/purchases/orders",
  update: (id: string) => `/purchases/orders/${id}`,
  setSent: (id: string) => `/purchases/orders/${id}/sent`,
  setCancel: (id: string) => `/purchases/orders/${id}/cancel`,
  enterPurchase: (id: string) => `/purchases/orders/${id}/run-expected`,
  getById: (poId: string) => `/purchases/orders/${poId}`,
  setActive: (id: string) => `/purchases/orders/${id}/active`,
  listItems: (id: string) => `/purchases/orders/${id}/items`,
  listPayments: (id: string) => `/payments/get-by-po/${id}`,
  listQuotas: (id: string) => `/payments/credit-quotas/get-by-po/${id}`,
  removeItem: (id: string, itemId: string) => `/purchases/orders/${id}/items/${itemId}`,
};

export const API_PRODUCTION_ORDERS_GROUP = {
  base: "/production-orders",
  create: "/production-orders",
  list: "/production-orders",
  byId: (id: string) => `/production-orders/${id}`,
  update: (id: string) => `/production-orders/${id}`,
  start: (id: string) => `/production-orders/${id}/start`,
  close: (id: string) => `/production-orders/${id}/close`,
  cancel: (id: string) => `/production-orders/${id}/cancel`,
  addItem: (id: string) => `/production-orders/${id}/items`,
  updateItem: (id: string, itemId: string) => `/production-orders/${id}/items/${itemId}`,
  removeItem: (id: string, itemId: string) => `/production-orders/${id}/items/${itemId}`,
};

export const API_PAYMENT_GROUP = {
  create: "/payments",
  remove: (id: string) => `/payments/${id}`,
}

export const API_PDF_GENERATED_GROUP = {
  invoice: "/pdf-generated/invoice",
  purchaseOrderPdf: (id: string) => `/pdf-generated/purchase/${id}/pdf`,
  productionOrderPdf: (id: string) => `/pdf-generated/production/${id}/pdf`,
  documentInventoryPdf: (id: string) => `/pdf-generated/inventory/${id}/pdf`,
};

export const API_DOCUMENT_SERIES_GROUP = {
  list: "/inventory/document-series",
};

export const API_KARDEX_GROUP = {
  list: "/inventory/ledger",
  totals: "/inventory/ledger/totals/daily",
};

export const API_INVENTORY_GROUP = {
  getStock: "/inventory/get-stock",
  getStockQuery: (params: { warehouseId: string; itemId: string; locationId?: string }) => {
    const search = new URLSearchParams({
      warehouseId: params.warehouseId,
      itemId: params.itemId,
      ...(params.locationId ? { locationId: params.locationId } : {}),
    });
    return `/inventory/get-stock?${search.toString()}`;
  },
};



export const API_DOCUMENT_INVENTORY_GROUP = {
  outOrderCreated: "/inventory/documents/create-add-item-post-out",
  adjustmentCreated: "/inventory/documents/create-add-item-post-adjustment",
  transfertCreated: "/inventory/documents/create-add-item-post-transfer",
  listDocuments: "/inventory/documents",
  adjustmentAddItem: (id: string) => `/inventory/documents/${id}/items-adjustment`,
};

export const API_PAYMENT_METHODS_GROUP = {
  base: "/payment-methods",
  create: "/payment-methods",
  list: "/payment-methods",
  listAll: "/payment-methods/records",
  byId: (id: string) => `/payment-methods/${id}`,
  byCompany: (companyId: string) => `/payment-methods/by-company/${companyId}`,
  bySupplier: (supplierId: string) => `/payment-methods/by-supplier/${supplierId}`,
  update: (id: string) => `/payment-methods/${id}`,
  setActive: (id: string) => `/payment-methods/${id}/active`,
};

export const API_COMPANY_METHODS_GROUP = {
  create: "/company-methods",
  byId: (companyId: string, methodId: string) => `/company-methods/${companyId}/${methodId}`,
  remove: (companyId: string, methodId: string) => `/company-methods/${companyId}/${methodId}`,
};

export const API_SUPPLIER_METHODS_GROUP = {
  create: "/supplier-methods",
  byId: (supplierId: string, methodId: string) => `/supplier-methods/${supplierId}/${methodId}`,
  remove: (supplierId: string, methodId: string) => `/supplier-methods/${supplierId}/${methodId}`,
};


