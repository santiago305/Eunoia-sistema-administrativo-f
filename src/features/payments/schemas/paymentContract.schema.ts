import { z } from "zod";
import { CurrencyTypes } from "@/features/purchases/types/purchaseEnums";

const uuid = z.string().uuid();
const currency = z.enum(Object.values(CurrencyTypes) as [string, ...string[]]);

export const paymentContractSchema = z.object({
  source: z.enum(["PURCHASE", "ACCOUNT_PAYABLE", "MANUAL", "OTHER"]),
  mode: z.enum(["IMMEDIATE", "DRAFT", "SCHEDULED"]),
  currency,
  amount: z.number().positive(),
  paymentMethodId: uuid,
  companyPaymentAccountId: uuid.nullable().optional(),
  supplierPaymentDestinationId: uuid.nullable().optional(),
  operationNumber: z.string().trim().min(1).nullable().optional(),
  paymentEvidenceFileId: uuid.nullable().optional(),
});

export const validatePaymentContract = paymentContractSchema.superRefine((value, ctx) => {
  if (!value.paymentMethodId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paymentMethodId"], message: "Seleccione un metodo de pago" });
  }
});
