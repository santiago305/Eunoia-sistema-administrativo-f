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
  catalogSummary: "/catalago",
  catalogProducts: "/catalago/productos",
  catalogVariants: "/catalago/variantes",
  catalogDocuments: "/catalago/documentos",
  catalogAdjustments: "/catalago/ajustes",
  catalogTransfer: "/catalago/transfer",
  KardexFinished:'/catalago/kardex',

  //almacenes
  warehouses:'/almacen',
  location:'/almacen/ubicaciones',

  //materia prima
  rowMaterial:'/materia-prima',
  rowVariant:'/materia-prima/variantes',
  rowMaterialDocuments: "/materia-prima/documentos",
  rowMaterialAdjustments: "/materia-prima/ajustes",
  rowMaterialTransfer: "/materia-prima/transfer",
  rowMaterialSummary:'/materia-prima/resumen',
  KardexPrima:'/materia-prima/kardex',

  
  //provedores
  providers:'/contactos/proveedores',
  contacts:'/contactos',

  //purchase
  purchase: '/compra',
  purchases: '/compras',
  purchaseEdit: "/compra/:poId",

  //company
  company:'/empresa',
  
  //production
  production:'/Ordenes de produccion',
  productionCreate: "/nueva orden de produccion",
  productionEdit: "/nueva orden de produccion/:productionId",

  outOrder:"/Ordenes-de-salidas",
  
  // seguridad
  security: "/seguridad",
  ipsdetails: "/seguridad/ips/:ip",
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;



