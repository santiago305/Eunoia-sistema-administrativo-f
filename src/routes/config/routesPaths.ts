
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
  notifications: "/email",
  notificationView: "/email/:folder",
  notificationDetail: "/email/:folder/:messageId",

  createUser: "/usuarios/crear",
  users: "/usuarios",
  roles: "/permisos",

  catalogSummary: "/catalago",
  catalogProducts: "/catalago/productos",
  catalogPacks: "/catalago/packs",
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

  //clients
  clients: "/clientes",

  //agencies
  agencies: "/agencias",

  //sources (campaigns)
  sources: "/campanas",

  //purchase
  purchase: '/compra',
  purchases: '/compras',
  purchaseDashboard: "/compras/dashboard",
  purchaseCreate: "/compras/nueva",
  purchaseDetail: "/compras/:id",
  purchaseEditPage: "/compras/:id/editar",
  purchaseReception: "/compras/:poId/recepcion",
  purchasePayments: "/compras/:id/pagos",
  purchaseDocuments: "/compras/:id/documentos",
  purchasesHistory: "/compras/historial",
  recurringPurchases: "/compras/recurrentes",
  purchaseEdit: "/compra/:poId",
  payments: "/pagos",
  accountsPayable: "/cuentas-por-pagar",
  paymentAccounts: "/cuentas-pago",
  paymentMethods: "/metodos-pago",

  // sale orders
  saleOrders: "/pedidos",

  //company
  company:'/empresa',
  
  //production
  production:'/produccion',
  productionCreate: "/nueva orden de produccion",
  productionEdit: "/nueva orden de produccion/:productionId",

  // seguridad
  security: "/seguridad",
  ipsdetails: "/seguridad/ips/:ip",
} as const;

/**
 * Valid route keys.
 */
export type RouteName = keyof typeof RoutesPaths;




