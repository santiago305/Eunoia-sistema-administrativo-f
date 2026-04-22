
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
  countByRole: '/users/count-by-role',
  findOwnUser: '/users/me',
  findById: (id: string) => `/users/search/${id}`,
  findByEmail: (email: string) => `/users/email/${email}`,
  updateUserRole: (id: string) => `/users/${id}/role`,
  deleteUser: (id: string) => `/users/delete/${id}`,
  restoreUser: (id: string) => `/users/restore/${id}`,
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

export const API_UBIGEO_GROUP = {
  departments: "/ubigeo/departments",
  provinces: "/ubigeo/provinces",
  districts: "/ubigeo/districts",
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
  base: "/products",
  items: "/products",
  create: "/products",
  createBase: "/products",
  byIdP: (id: string) => `/products/${id}`,
  update: (id: string) => `/products/${id}`,
  updateActive: (id: string) => `/products/${id}`,
  createSku: (id: string) => `/products/${id}/skus`,
};

export const API_WAREHOUSES_GROUP = {
  base: "/warehouses",
  create: "/warehouses",
  list: "/warehouses",
  searchState: "/warehouses/search-state",
  saveSearchMetric: "/warehouses/search-metrics",
  deleteSearchMetric: (metricId: string) => `/warehouses/search-metrics/${metricId}`,
  getById: (id: string) => `/warehouses/${id}`,
  getWithLocations: (id: string) => `/warehouses/${id}/locations`,
  getStock: (id: string) => `/warehouses/${id}/stock`,
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
  list: "/units",
};

export const API_PRODUCT_EQUIVALENCES_GROUP = {
  byProduct: (productId: string) => `/products/${productId}/equivalences`,
  byId: (id: string) => `/equivalences/${id}`,
};

export const API_PRODUCT_RECIPES_GROUP = {
  bySku: (skuId: string) => `/skus/${skuId}/recipe`,
  deleteItem: (skuId: string, itemId: string) => `/skus/${skuId}/recipe/items/${itemId}`,
};

export const API_SKUS_GROUP = {
  base: "/skus",
  byId: (id: string) => `/skus/${id}`,
  update: (id: string) => `/skus/${id}`,
};

export const API_SUPPLIERS_GROUP = {
  base: "/suppliers",
  create: "/suppliers",
  list: "/suppliers",
  searchState: "/suppliers/search-state",
  saveSearchMetric: "/suppliers/search-metrics",
  deleteSearchMetric: (metricId: string) => `/suppliers/search-metrics/${metricId}`,
  byId: (id: string) => `/suppliers/${id}`,
  update: (id: string) => `/suppliers/${id}`,
  updateActive: (id: string) => `/suppliers/${id}/active`,
  identityLookup: "/identity",
};
export const API_PURCHASE_GROUP = {
  base: "/purchases/orders",
  create: "/purchases/orders",
  list: "/purchases/orders",
  searchState: "/purchases/orders/search-state",
  saveSearchMetric: "/purchases/orders/search-metrics",
  deleteSearchMetric: (metricId: string) => `/purchases/orders/search-metrics/${metricId}`,
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
  searchState: "/production-orders/search-state",
  saveSearchMetric: "/production-orders/search-metrics",
  deleteSearchMetric: (metricId: string) => `/production-orders/search-metrics/${metricId}`,
  byId: (id: string) => `/production-orders/${id}`,
  update: (id: string) => `/production-orders/${id}`,
  start: (id: string) => `/production-orders/${id}/start`,
  close: (id: string) => `/production-orders/${id}/close`,
  cancel: (id: string) => `/production-orders/${id}/cancel`,
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
  list: "/series/active",
};

export const API_KARDEX_GROUP = {
  list: "/stock-items/ledger/by-sku",
  totals: "/stock-items/ledger/daily-totals/by-sku",
};

export const API_INVENTORY_GROUP = {
  list: "/inventory",
  availableStockSkus: "/available-stock/skus",
  skuStockSnapshots: (skuId: string) => `/skus/${skuId}/stock/snapshots`,
  getStockQuery: (params: {
    warehouseId: string;
    itemId?: string;
    stockItemId?: string;
    locationId?: string;
  }) => {
    const search = new URLSearchParams({
      warehouseId: params.warehouseId,
      ...(params.itemId ? { itemId: params.itemId } : {}),
      ...(params.stockItemId ? { stockItemId: params.stockItemId } : {}),
      ...(params.locationId ? { locationId: params.locationId } : {}),
    });
    return `/inventory/get-stock?${search.toString()}`;
  },
};



export const API_DOCUMENT_INVENTORY_GROUP = {
  outOrderCreated: "/stock-items/movements/create",
  adjustmentCreated: "/stock-items/movements/create",
  transfertCreated: "/stock-items/movements/transfer",
  listDocuments: "/inventory-documents",
  getStock: "/skus/get-stock",
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
  remove: (companyMethodId: string) => `/company-methods/${companyMethodId}`,
};

export const API_SUPPLIER_METHODS_GROUP = {
  create: "/supplier-methods",
  listBySupplier: (supplierId: string) => `/supplier-methods/by-supplier/${supplierId}`,
  byId: (supplierMethodId: string) => `/supplier-methods/${supplierMethodId}`,
  remove: (supplierMethodId: string) => `/supplier-methods/${supplierMethodId}`,
};


