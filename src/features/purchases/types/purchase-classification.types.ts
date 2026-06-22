export const PurchaseTypes = {
  INVENTORY: "INVENTORY",
  RAW_MATERIAL: "RAW_MATERIAL",
  INTERNAL_MATERIAL: "INTERNAL_MATERIAL",
  FIXED_ASSET: "FIXED_ASSET",
  SERVICE: "SERVICE",
  SUBSCRIPTION: "SUBSCRIPTION",
  MIXED: "MIXED",
} as const;

export type PurchaseType = typeof PurchaseTypes[keyof typeof PurchaseTypes];

export const PurchaseItemTypes = {
  PRODUCT: "PRODUCT",
  RAW_MATERIAL: "RAW_MATERIAL",
  INTERNAL_MATERIAL: "INTERNAL_MATERIAL",
  FIXED_ASSET: "FIXED_ASSET",
  SERVICE: "SERVICE",
  SUBSCRIPTION: "SUBSCRIPTION",
} as const;

export type PurchaseItemType = typeof PurchaseItemTypes[keyof typeof PurchaseItemTypes];

export const ReceptionStatuses = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  RECEIVED: "RECEIVED",
} as const;

export type ReceptionStatus = typeof ReceptionStatuses[keyof typeof ReceptionStatuses];

export const PurchasePaymentStatuses = {
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;

export type PurchasePaymentStatus = typeof PurchasePaymentStatuses[keyof typeof PurchasePaymentStatuses];

export const purchaseTypeLabels: Record<PurchaseType, string> = {
  INVENTORY: "Producto",
  RAW_MATERIAL: "Materia prima",
  INTERNAL_MATERIAL: "Material interno",
  FIXED_ASSET: "Activo fijo",
  SERVICE: "Servicio",
  SUBSCRIPTION: "Suscripción",
  MIXED: "Mixta",
};

export const purchaseTypeDescriptions: Record<PurchaseType, { summary: string; detail: string; example: string }> = {
  INVENTORY: {
    summary: "Productos terminados para venta.",
    detail: "Usa este tipo cuando compras productos ya listos para ingresar al inventario comercial y venderlos directamente a los clientes.",
    example: "Ejemplo: mercaderia terminada, productos de reventa o articulos que no pasan por produccion.",
  },
  RAW_MATERIAL: {
    summary: "Insumos para fabricar productos.",
    detail: "Usa este tipo cuando compras materia prima que luego produccion transforma en productos terminados para el stock de venta.",
    example: "Ejemplo: telas, insumos, ingredientes, empaques base o componentes de fabricacion.",
  },
  INTERNAL_MATERIAL: {
    summary: "Materiales para uso de la empresa.",
    detail: "Usa este tipo cuando compras materiales que ayudan a operar el negocio, pero no forman parte directa del producto vendido.",
    example: "Ejemplo: utiles, suministros de oficina, materiales de limpieza o repuestos internos.",
  },
  FIXED_ASSET: {
    summary: "Bienes duraderos de la empresa.",
    detail: "Usa este tipo cuando compras activos que la empresa conserva y utiliza por largo tiempo, no para venderlos como mercaderia.",
    example: "Ejemplo: computadoras, maquinas, muebles, equipos o herramientas mayores.",
  },
  SERVICE: {
    summary: "Trabajo o atencion contratada.",
    detail: "Usa este tipo cuando compras algo que no entra a almacen porque no es un producto fisico con stock.",
    example: "Ejemplo: mantenimiento, transporte, instalacion, consultoria o mano de obra externa.",
  },
  SUBSCRIPTION: {
    summary: "Pago recurrente o licencia.",
    detail: "Usa este tipo cuando la compra corresponde a un servicio periodico, licencia o acceso que se renueva por tiempo.",
    example: "Ejemplo: software mensual, licencia anual, hosting, membresias o plataformas digitales.",
  },
  MIXED: {
    summary: "Orden con varios tipos de items.",
    detail: "Usa este tipo cuando en una misma compra combinas productos, materia prima, servicios, activos u otros tipos de items.",
    example: "Ejemplo: compra de una maquina, instalacion del proveedor y materiales adicionales en la misma orden.",
  },
};

export const purchaseItemTypeLabels: Record<PurchaseItemType, string> = {
  PRODUCT: "Producto",
  RAW_MATERIAL: "Materia prima",
  INTERNAL_MATERIAL: "Material interno",
  FIXED_ASSET: "Activo fijo",
  SERVICE: "Servicio",
  SUBSCRIPTION: "Suscripción",
};

export const purchaseTypesWithoutStock: PurchaseType[] = [
  PurchaseTypes.SERVICE,
  PurchaseTypes.SUBSCRIPTION,
];

export const purchaseItemTypesWithoutStock: PurchaseItemType[] = [
  PurchaseItemTypes.SERVICE,
  PurchaseItemTypes.SUBSCRIPTION,
];
