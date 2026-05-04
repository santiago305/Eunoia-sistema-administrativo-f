import { ReceiptText } from "lucide-react";
import { money } from "@/shared/utils/functionPurchases";
import type { PurchaseOrderDetailOutput, PurchaseOrderItemEditOutput } from "@/features/purchases/types/itemPurchaseEdit";
import type { CreditQuota, Payment } from "@/features/purchases/types/purchase";
import type { PaymentFormType, PaymentType, PurchaseOrderStatus } from "@/features/purchases/types/purchaseEnums";
import type { SummaryPurchase } from "@/features/purchases/types/purchaseDetails";
import type {
  DetailField,
  DetailListItem,
  DetailPayment,
  DetailQuota,
} from "@/shared/components/components/types/documentInventoryDetails";

export const paymentFormLabels: Record<PaymentFormType, string> = {
  CONTADO: "Contado",
  CREDITO: "Credito",
};

export const paymentMethodLabels: Record<PaymentType, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  DEPOSITO: "Deposito",
  PLIN: "Plin",
  YAPE: "Yape",
};

export const statusToneByStatus: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-amber-50 text-amber-700",
  PARTIAL: "bg-orange-50 text-orange-700",
  PENDING_RECEIPT_CONFIRMATION: "bg-cyan-50 text-cyan-700",
  RECEIVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getItemLabel = (item: PurchaseOrderItemEditOutput) => {
  return (
    item.name ??
    item.sku?.sku?.name ??
    item.sku?.sku?.backendSku ??
    item.sku?.sku?.customSku ??
    item.skuId ??
    "Item"
  );
};

const getItemCode = (item: PurchaseOrderItemEditOutput) => {
  return (
    item.sku?.sku?.backendSku ??
    item.sku?.sku?.customSku ??
    item.skuId ??
    "-"
  );
};

type MapperParams = {
  purchase: SummaryPurchase;
  detail: PurchaseOrderDetailOutput | null;
  canAdminUploadMissingPhoto: boolean;
  uploadingPhoto: boolean;
  onUploadImage: (file?: File | null) => Promise<void> | void;
};

export function buildPurchaseExtendedDetailsConfig({
  purchase,
  detail,
  canAdminUploadMissingPhoto,
  uploadingPhoto,
  onUploadImage,
}: MapperParams) {
  const currency = detail?.currency ?? purchase.currency ?? "PEN";
  const items = detail?.items ?? [];
  const payments: Payment[] = detail?.payments ?? purchase.payments ?? [];
  const quotas: CreditQuota[] = detail?.quotas ?? purchase.quotas ?? [];
  const paymentForm = detail?.paymentForm ?? purchase.paymentForm ?? "CONTADO";

  const total = detail?.total ?? purchase.total ?? 0;
  const totalPaid = detail?.totalPaid ?? purchase.totalPaid ?? 0;
  const totalToPay = detail?.totalToPay ?? purchase.totalToPay ?? 0;

  const totalLabel = money(total, currency);
  const paidLabel = money(totalPaid, currency);
  const pendingLabel = money(totalToPay, currency);

  const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
  const paymentCountLabel = `${payments.length} pago${payments.length === 1 ? "" : "s"}`;
  const quotaCountLabel = `${quotas.length} cuota${quotas.length === 1 ? "" : "s"}`;
  const metaResumen = `${itemCountLabel} - ${paymentCountLabel}${paymentForm === "CREDITO" ? ` - ${quotaCountLabel}` : ""}`;

  const statusTone = purchase.status
    ? statusToneByStatus[purchase.status] ?? "bg-slate-100 text-slate-700"
    : "bg-slate-100 text-slate-700";

  const summaryTopFields: DetailField[] = [
    { label: "Total", value: totalLabel },
    { label: "Pagado", value: paidLabel },
    { label: "Pendiente", value: pendingLabel },
  ];

  const summaryFields: DetailField[] = [
    {
      label: "Proveedor",
      value: purchase.supplierDoc ? `${purchase.supplierLabel} - ${purchase.supplierDoc}` : purchase.supplierLabel ?? "-",
    },
    { label: "Almacen", value: purchase.warehouseLabel ?? "-" },
    {
      label: "Emision",
      value: detail?.dateIssue ? formatDateTime(detail.dateIssue) : `${purchase.date ?? "-"}${purchase.time ? ` ${purchase.time}` : ""}`,
    },
    {
      label: "Ingreso",
      value: detail?.expectedAt
        ? formatDateTime(detail.expectedAt)
        : `${purchase.dateEnter ?? "-"}${purchase.timeEnter ? ` ${purchase.timeEnter}` : ""}`,
    },
    {
      label: "Vencimiento",
      value: detail?.dateExpiration ? formatDateTime(detail.dateExpiration) : "-",
    },
    { label: "Forma", value: paymentFormLabels[paymentForm] ?? paymentForm },
  ];

  const detailItems: DetailListItem[] = items.map((item, index) => {
    const lineTotal =
      typeof item.quantity === "number" && typeof item.unitPrice === "number"
        ? item.quantity * item.unitPrice
        : item.purchaseValue ?? 0;

    return {
      id: item.poItemId ?? item.skuId ?? `${index}`,
      label: getItemLabel(item),
      code: getItemCode(item),
      unit: item.unitBase || "-",
      extra: `x${item.factor ?? 1}`,
      quantity: Number(item.quantity ?? 0),
      amount: money(lineTotal, currency),
    };
  });

  const detailPayments: DetailPayment[] = payments.map((payment, index) => ({
    id: payment.payDocId ?? `${payment.method}-${payment.date}-${index}`,
    method: paymentMethodLabels[payment.method] ?? payment.method,
    date: payment.date,
    operationNumber: payment.operationNumber ?? undefined,
    note: payment.note ?? undefined,
    amount: money(payment.amount ?? 0, payment.currency),
  }));

  const detailQuotas: DetailQuota[] =
    paymentForm === "CREDITO"
      ? quotas.map((quota, index) => {
          const quotaPaid = quota.totalPaid ?? 0;
          const quotaPending = Math.max((quota.totalToPay ?? 0) - quotaPaid, 0);
          return {
            id: quota.quotaId ?? `${quota.number}-${quota.expirationDate}-${index}`,
            number: quota.number,
            expirationDate: formatDateOnly(quota.expirationDate),
            paymentDate: quota.paymentDate ? formatDateOnly(quota.paymentDate) : undefined,
            total: money(quota.totalToPay ?? 0, currency),
            paid: money(quotaPaid, currency),
            pending: money(quotaPending, currency),
            completed: quotaPending <= 0,
          };
        })
      : [];

  const images = detail?.imageProdution ?? purchase.imageProdution ?? [];

  return {
    title: "Detalle de compra",
    loading: false,
    error: null as string | null,
    emptyMessage: "No hay compra seleccionada.",
    headerIcon: <ReceiptText className="h-3.5 w-3.5" />,
    headerIconClassName: "bg-emerald-100 text-emerald-700",
    headerLabel: purchase.docLabel ?? "Compra",
    headerBadge: purchase.statusLabel ?? null,
    headerBadgeClassName: statusTone,
    headerNumber: purchase.numero || undefined,
    headerSubLabel: paymentFormLabels[paymentForm] ?? paymentForm,
    headerRightLabel: "Total",
    headerRightValue: totalLabel,
    summaryTopFields,
    summaryFields,
    summaryMeta: metaResumen,
    itemsTitle: "Items",
    itemsMeta: itemCountLabel,
    items: detailItems,
    itemsEmptyMessage: "No hay items registrados para esta compra.",
    payments: detailPayments,
    paymentsMeta: paymentCountLabel,
    paymentsEmptyMessage: "No hay pagos registrados para esta compra.",
    quotas: detailQuotas,
    quotasMeta: paymentForm === "CREDITO" ? quotaCountLabel : undefined,
    quotasEmptyMessage: "No hay cuotas registradas para esta compra a credito.",
    note: (detail?.note ?? purchase.note ?? "").trim(),
    noteTitle: "Nota",
    images,
    imageTitle: "Foto de compra",
    imageEmptyMessage: "Esta compra no tiene foto.",
    imageAltPrefix: "Imagen de compra",
    canUploadImage: canAdminUploadMissingPhoto,
    uploadingImage: uploadingPhoto,
    onUploadImage,
  };
}
