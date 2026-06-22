import type { AccountPayableStatus } from "./types/payable.types";

export const getAccountPayableStatusView = (status: AccountPayableStatus) => {
  if (status === "PAID") {
    return { label: "Pagada", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  if (status === "PARTIAL") {
    return { label: "Parcial", className: "bg-sky-100 text-sky-700 border-sky-200" };
  }
  if (status === "OVERDUE") {
    return { label: "Vencida", className: "bg-rose-100 text-rose-700 border-rose-200" };
  }
  if (status === "CANCELLED") {
    return { label: "Cancelada", className: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  }
  return { label: "Pendiente", className: "bg-amber-100 text-amber-700 border-amber-200" };
};

export const getPayablePaymentStatusAfterTotals = (
  amountTotal: number,
  amountPaid: number,
): AccountPayableStatus => {
  if (amountPaid >= amountTotal) return "PAID";
  if (amountPaid > 0) return "PARTIAL";
  return "PENDING";
};

export const canRegisterAccountPayablePayment = (
  status: AccountPayableStatus,
  canManage: boolean,
) => canManage && status !== "PAID" && status !== "CANCELLED";

