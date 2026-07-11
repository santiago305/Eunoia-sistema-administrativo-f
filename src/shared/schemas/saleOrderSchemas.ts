import { z } from "zod";

export const saleOrderItemComponentSchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().positive(),
  basePrice: z.number().min(0).optional(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  referencePackItemId: z.string().min(1).optional(),
});

export const saleOrderItemSchema = z.object({
  quantity: z.number().positive(),
  basePrice: z.number().min(0).optional(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  description: z.string().min(1),
  referencePackId: z.string().min(1).optional(),
  components: z.array(saleOrderItemComponentSchema).optional(),
});

export const createSaleOrderSchema = z.object({
  warehouseId: z.string().min(1),
  clientId: z.string().min(1),
  agencyDetail: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  subTotal: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  note: z.string().optional(),
  items: z.array(saleOrderItemSchema).min(1),
  payments: z
    .array(
      z.object({
        method: z.string().min(1),
        amount: z.number().positive(),
        bankAccountId: z.string().min(1).optional(),
        date: z.string().optional(),
        operationNumber: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .default([]),
});
