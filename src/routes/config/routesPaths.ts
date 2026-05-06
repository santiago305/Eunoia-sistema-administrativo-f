
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
  notifications: "/notifications",
  notificationDetail: "/notifications/:id",

  createUser: "/users/create",
  users: "/users",
  roles: "/roles",

  catalogSummary: "/catalago",
  catalogProducts: "/catalago/productos",
  catalogVariants: "/catalago/variantes",
  catalogTransferences: "/catalago/transferencias",
  catalogAdjustments: "/catalago/ajustes",
  catalogAdjustment: "/catalago/ajuste",
  KardexFinished:'/catalago/kardex',
  catalogInventory:'/catalago/inventario',

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
  payments: "/pagos",

  //company
  company:'/empresa',
  
  //production
  production:'/produccion',
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



