import { PurchaseOrderItem, CreditQuota, PurchaseOrder } from "@/types/purchase";
import { CurrencyType, AfectTypeType, AfectType, VoucherDocTypes, CurrencyTypes, PaymentFormTypes, PurchaseOrderStatuses } from "@/types/purchaseEnums";

const IGV = 0.18;

export const money = (n: number, currency: CurrencyType) => {
  const symbol = currency === "PEN" ? "S/" : "$";
  return `${symbol} ${n.toFixed(2)}`;
};

export const unitValueFromPrice = (unitPrice: number, afectType: AfectTypeType) => {
  if (afectType === AfectType.TAXED) {
    return unitPrice / (1 + IGV);
  }
  return unitPrice;
};

export const recalcItem = (item: PurchaseOrderItem): PurchaseOrderItem => {
  const quantity = Math.max(0, item.quantity);
  const unitPrice = Math.max(0, item.unitPrice);
  const unitValue = unitValueFromPrice(unitPrice, item.afectType);
  const baseWithoutIgv = unitValue * quantity;
  const amountIgv =
    item.afectType === AfectType.TAXED ? unitPrice * quantity - baseWithoutIgv : 0;

  return {
    ...item,
    quantity,
    unitPrice,
    unitValue,
    baseWithoutIgv,
    amountIgv,
    porcentageIgv: item.afectType === AfectType.TAXED ? IGV * 100 : 0,
    purchaseValue: baseWithoutIgv,
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

export const todayIso = () => toLocalIso(new Date());

export const addDaysToIsoDate = (days?: number | null) => {
  if (days === null || days === undefined) return "";
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalIso(date);
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
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / parts);
  const amounts = Array.from({ length: parts }, () => base);
  const remainder = totalCents - base * parts;
  if (remainder > 0) {
    amounts[parts - 1] += remainder;
  }
  return amounts.map((c) => Number((c / 100).toFixed(2)));
};

export const buildQuotas = (baseDateIso: string, creditDays: number, numQuotas: number, total: number): CreditQuota[] => {
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