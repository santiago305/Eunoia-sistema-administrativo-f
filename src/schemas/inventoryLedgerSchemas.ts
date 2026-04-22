import { z } from "zod";

const uuidSchema = z.string().uuid();

export const directionSchema = z.enum(["IN", "OUT"]);
export const referenceTypeSchema = z.enum(["PURCHASE", "PRODUCTION"]);
export const productCatalogProductTypeSchema = z.enum(["MATERIAL", "PRODUCT"]);

export const apiErrorResponseSchema = z.object({
  type: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const inventoryLedgerUnitRefSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  code: z.string(),
});

export const inventoryLedgerSkuRefSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  backendSku: z.string(),
  customSku: z.string().nullable(),
  name: z.string(),
});

export const inventoryLedgerProductRefSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  type: productCatalogProductTypeSchema,
  baseUnitId: uuidSchema.nullable(),
});

export const inventoryLedgerPurchaseReferenceSchema = z.object({
  id: uuidSchema,
  documentType: z.string().nullable(),
  serie: z.string().nullable(),
  correlative: z.number().int().nullable(),
  status: z.string().nullable(),
  dateIssue: z.string().nullable(),
  warehouseId: uuidSchema.nullable(),
  supplierId: uuidSchema.nullable(),
});

export const inventoryLedgerProductionReferenceSchema = z.object({
  id: uuidSchema,
  docType: z.string(),
  serieId: uuidSchema,
  correlative: z.number().int(),
  status: z.string().nullable(),
  reference: z.string().nullable(),
  manufactureDate: z.string().nullable(),
  fromWarehouseId: uuidSchema.nullable(),
  toWarehouseId: uuidSchema.nullable(),
});

export const inventoryLedgerReferenceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PURCHASE"),
    id: uuidSchema,
    purchase: inventoryLedgerPurchaseReferenceSchema.nullable(),
  }),
  z.object({
    type: z.literal("PRODUCTION"),
    id: uuidSchema,
    production: inventoryLedgerProductionReferenceSchema.nullable(),
  }),
]);

export const inventoryLedgerListItemSchema = z.object({
  id: uuidSchema,
  docId: uuidSchema,
  referenceId: uuidSchema.nullable(),
  referenceType: referenceTypeSchema.nullable(),
  reference: inventoryLedgerReferenceSchema.nullable(),
  docItemId: uuidSchema.nullable(),
  warehouseId: uuidSchema,
  skuId: uuidSchema,
  direction: directionSchema,
  quantity: z.number(),
  locationId: uuidSchema.nullable(),
  wasteQty: z.number().nullable(),
  unitCost: z.number().nullable(),
  createdAt: z.string(),
  sku: inventoryLedgerSkuRefSchema,
  product: inventoryLedgerProductRefSchema,
  baseUnit: inventoryLedgerUnitRefSchema.nullable(),
});

export const inventoryLedgerListSchema = z.array(inventoryLedgerListItemSchema);

