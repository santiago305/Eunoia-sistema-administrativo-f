// @/utils/functionPurchases.ts
import Big from "big.js";
import { PurchaseOrderItem, CreditQuota, PurchaseOrder } from "@/pages/purchases/types/purchase";
import {
  CurrencyType,
  AfectTypeType,
  AfectType,
  VoucherDocTypes,
  CurrencyTypes,
  PaymentFormTypes,
  PurchaseOrderStatuses,
} from "@/pages/purchases/types/purchaseEnums";

const IGV_FACTOR = new Big("1.18");

const MONEY_SCALE = 2;
const PRICE_SCALE = 4;
const QUANTITY_SCALE = 3;

const toBig = (value: string | number | null | undefined) => {
  try {
    if (value === null || value === undefined || value === "") return new Big(0);
    return new Big(String(value).replace(",", "."));
  } catch {
    return new Big(0);
  }
};

export const toNumber = (value: Big) => Number(value.toString());

export const roundMoneyBig = (value: Big) => value.round(MONEY_SCALE, Big.roundHalfUp);
export const roundPriceBig = (value: Big) => value.round(PRICE_SCALE, Big.roundHalfUp);
export const roundQuantityBig = (value: Big) => value.round(QUANTITY_SCALE, Big.roundHalfUp);

export const normalizeMoney = (value: string | number | null | undefined) =>
  toNumber(roundMoneyBig(toBig(value)));

export const normalizePrice = (value: string | number | null | undefined) =>
  toNumber(roundPriceBig(toBig(value)));

export const normalizeQuantity = (value: string | number | null | undefined) =>
  toNumber(roundQuantityBig(toBig(value)));

export const parseDecimalInput = (value: string | number | null | undefined) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return 0;

  try {
    return Number(new Big(normalized).toString());
  } catch {
    return 0;
  }
};

export const money = (n: number, currency: CurrencyType) => {
  const symbol = currency === "PEN" ? "S/" : "$";
  return `${symbol} ${roundMoneyBig(toBig(n)).toFixed(2)}`;
};

export const unitValueFromPrice = (unitPrice: number, afectType: AfectTypeType) => {
  const safeUnitPrice = roundPriceBig(toBig(unitPrice));

  if (afectType === AfectType.TAXED) {
    return toNumber(roundPriceBig(safeUnitPrice.div(IGV_FACTOR)));
  }

  return toNumber(safeUnitPrice);
};

export const lineTotalFromItem = (item: Pick<PurchaseOrderItem, "quantity" | "unitPrice">) => {
  const quantity = roundQuantityBig(toBig(item.quantity));
  const unitPrice = roundPriceBig(toBig(item.unitPrice));
  return toNumber(roundMoneyBig(quantity.times(unitPrice)));
};

export const recalcItem = (item: PurchaseOrderItem): PurchaseOrderItem => {
  const quantity = roundQuantityBig(toBig(item.quantity));
  const unitPrice = roundPriceBig(toBig(item.unitPrice));

  const totalPrice = roundMoneyBig(quantity.times(unitPrice));

  if (item.afectType === AfectType.TAXED) {
    const purchaseValue = roundMoneyBig(totalPrice.div(IGV_FACTOR));
    const amountIgv = roundMoneyBig(totalPrice.minus(purchaseValue));
    const unitValue = quantity.gt(0)
      ? roundPriceBig(purchaseValue.div(quantity))
      : new Big(0);

    return {
      ...item,
      quantity: toNumber(quantity),
      unitPrice: toNumber(unitPrice),      // 4 decimales
      unitValue: toNumber(unitValue),      // 4 decimales
      baseWithoutIgv: toNumber(purchaseValue),
      amountIgv: toNumber(amountIgv),
      porcentageIgv: 18,
      purchaseValue: toNumber(purchaseValue),
      name:item.name
    };
  }

  const purchaseValue = totalPrice;
  const unitValue = quantity.gt(0)
    ? roundPriceBig(purchaseValue.div(quantity))
    : new Big(0);

  return {
    ...item,
    quantity: toNumber(quantity),
    unitPrice: toNumber(unitPrice),        // 4 decimales
    unitValue: toNumber(unitValue),        // 4 decimales
    baseWithoutIgv: toNumber(purchaseValue),
    amountIgv: 0,
    porcentageIgv: 0,
    purchaseValue: toNumber(purchaseValue),
  };
};

const toLocalIso = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};

export const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalIso(date).slice(0, 16);
};

export const todayIso = () => toLocalIso(new Date());

export const addDaysToIsoDate = (days?: number | null) => {
  if (days === null || days === undefined) return "";
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalIso(date);
};

export const buildMonthStartIso = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

export const buildMonthEndIso = () => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

export const addDaysToIsoDateFrom = (baseIso: string, days?: number | null) => {
  if (!baseIso) return "";
  if (days === null || days === undefined) return baseIso;
  const date = new Date(baseIso);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return toLocalIso(date);
};

export const tryShowPicker = (input: HTMLInputElement) => {
  try {
    input.showPicker?.();
  } catch {
    // Ignore when the browser blocks programmatic picker opening.
  }
};

export const clampQuotas = (creditDays: number, numQuotas: number) => {
  if (creditDays <= 0) return 0;
  const safeNum = Math.max(1, numQuotas);
  return Math.min(safeNum, creditDays);
};

export const splitAmount = (total: number, parts: number) => {
  if (parts <= 0) return [];

  const totalBig = roundMoneyBig(toBig(total));
  const totalCents = totalBig.times(100);
  const base = totalCents.div(parts).round(0, Big.roundDown);
  const amounts = Array.from({ length: parts }, () => base);
  const remainder = totalCents.minus(base.times(parts));

  if (remainder.gt(0)) {
    amounts[parts - 1] = amounts[parts - 1].plus(remainder);
  }

  return amounts.map((c) => toNumber(c.div(100)));
};

export const buildQuotas = (
  baseDateIso: string,
  creditDays: number,
  numQuotas: number,
  total: number,
): CreditQuota[] => {
  const safeNum = clampQuotas(creditDays, numQuotas);
  if (safeNum <= 0 || creditDays <= 0) return [];

  const amounts = splitAmount(total, safeNum);
  const quotas: CreditQuota[] = [];

  for (let i = 1; i <= safeNum; i += 1) {
    const dayOffset = i === safeNum ? creditDays : Math.floor((creditDays * i) / safeNum);
    quotas.push({
      number: i,
      expirationDate: addDaysToIsoDateFrom(baseDateIso, dayOffset),
      totalToPay: amounts[i - 1] ?? 0,
      totalPaid: 0,
    });
  }

  return quotas;
};

export const buildEmptyForm = (): PurchaseOrder => ({
  supplierId: "",
  warehouseId: "",
  documentType: VoucherDocTypes.NOTA_VENTA,
  serie: "",
  correlative: 0,
  currency: CurrencyTypes.PEN,
  paymentForm: PaymentFormTypes.CONTADO,
  creditDays: 0,
  numQuotas: 0,
  totalTaxed: 0,
  totalExempted: 0,
  totalIgv: 0,
  purchaseValue: 0,
  total: 0,
  note: "",
  status: PurchaseOrderStatuses.DRAFT,
  expectedAt: "",
  dateIssue: todayIso(),
  dateExpiration: "",
  isActive: true,
  items: [],
  payments: [],
  quotas: [],
});
