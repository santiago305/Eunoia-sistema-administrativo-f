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

  createUser: "/users/create",
  users: "/users",

  stockSummary: "/stock",
  stockInventory: "/stock/inventario/:page?",
  stockMovements: "/stock/movimientos",
  stockDocuments: "/stock/documentos",
  stockTransfers: "/stock/transferencias",
  stockAdjustments: "/stock/ajustes",
  stockSeriesTypes: "/stock/series-tipos",
  stockReservations: "/stock/reservas",
  stockReplenishment: "/stock/reposicion",
  catalogSummary: "/catalogo",
  catalogProducts: "/catalogo/productos",
  catalogVariants: "/catalogo/variantes",

  //almacenes
  warehouses:'/almacen',
  location:'/almacen/ubicaciones',

  //materia prima
  rowMaterial:'/materia-prima',
  rowMaterialSummary:'/materia-prima/resumen',
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;

