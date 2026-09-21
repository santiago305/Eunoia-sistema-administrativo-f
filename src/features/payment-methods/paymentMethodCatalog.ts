export const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Efectivo" },
  { value: "BANK_TRANSFER", label: "Transferencia bancaria" },
  { value: "BANK_DEPOSIT", label: "Depósito bancario" },
  { value: "CARD", label: "Tarjeta" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
  { value: "CHECK", label: "Cheque" },
  { value: "OTHER", label: "Otro" },
] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHOD_OPTIONS)[number]["value"];

export const getPaymentMethodLabel = (code?: string | null) =>
  PAYMENT_METHOD_OPTIONS.find((option) => option.value === code)?.label ?? "Otro";

