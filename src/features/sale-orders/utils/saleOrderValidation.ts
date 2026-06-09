import type { CreateSaleOrderDto } from "@/features/sale-orders/types/saleOrder";

export type SaleOrderValidationResult = { ok: true } | { ok: false; message: string };

const isValidIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function validateSaleOrderForm(form: CreateSaleOrderDto): SaleOrderValidationResult {
  if (!form.workflowId) return { ok: false, message: "Selecciona un workflow." };
  if (!form.warehouseId) return { ok: false, message: "Selecciona un almacén." };
  if (!form.clientId) return { ok: false, message: "Selecciona un cliente." };
  if (!form.scheduleDate || !isValidIsoDateOnly(form.scheduleDate)) {
    return { ok: false, message: "ScheduleDate es obligatorio (YYYY-MM-DD)." };
  }
  if (!form.items?.length) return { ok: false, message: "Agrega al menos un item." };

  for (const [index, item] of form.items.entries()) {
    if (!(item.quantity > 0)) return { ok: false, message: `Item #${index + 1}: quantity debe ser > 0.` };
    if (!(item.unitPrice >= 0)) return { ok: false, message: `Item #${index + 1}: unitPrice debe ser >= 0.` };
    if (!(item.total >= 0)) return { ok: false, message: `Item #${index + 1}: total debe ser >= 0.` };
    // if (!String(item.description ?? "").trim()) {
    //   return { ok: false, message: `Item #${index + 1}: description es obligatorio.` };
    // }

    const hasPack = Boolean(item.referencePackId);
    const components = item.components ?? [];

    if (!hasPack) {
      if (!components.length) return { ok: false, message: `Item #${index + 1}: debe incluir components[].` };
    }

    for (const component of components) {
      if (!component.skuId) return { ok: false, message: `Item #${index + 1}: component.skuId es obligatorio.` };
      if (!(component.quantity > 0)) return { ok: false, message: `Item #${index + 1}: component.quantity debe ser > 0.` };
      if (!(component.unitPrice >= 0)) return { ok: false, message: `Item #${index + 1}: component.unitPrice debe ser >= 0.` };
      if (!(component.total >= 0)) return { ok: false, message: `Item #${index + 1}: component.total debe ser >= 0.` };
    }
  }

  for (const payment of form.payments ?? []) {
    if (!(payment.amount > 0)) return { ok: false, message: "payments[].amount debe ser > 0." };
    if (payment.date) {
      const parsed = new Date(payment.date);
      if (Number.isNaN(parsed.getTime())) return { ok: false, message: "Fecha de pago inválida." };
    }
  }

  return { ok: true };
}

