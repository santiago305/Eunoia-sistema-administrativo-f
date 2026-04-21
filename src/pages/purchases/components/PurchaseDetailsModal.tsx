import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CircleDollarSign,
  CreditCard,
  Package,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/modales/Modal";
import { getById } from "@/services/purchaseService";
import { parseApiError } from "@/common/utils/handleApiError";
import { money } from "@/utils/functionPurchases";
import type { PaymentFormType, PurchaseOrderStatus, PaymentType } from "@/pages/purchases/types/purchaseEnums";
import type { CreditQuota, Payment, PurchaseOrder } from "@/pages/purchases/types/purchase";
import type {
  PurchaseOrderDetailOutput,
  PurchaseOrderItemEditOutput,
} from "@/pages/purchases/types/itemPurchaseEdit";

type SummaryPurchase = PurchaseOrder & {
  supplierLabel: string;
  supplierDoc?: string;
  warehouseLabel: string;
  statusLabel: string;
  docLabel: string;
  numero: string;
  date: string;
  time?: string;
  dateEnter: string;
  timeEnter?: string;
};

type Props = {
  open: boolean;
  poId?: string | null;
  purchase: SummaryPurchase | null;
  onClose: () => void;
};

const paymentFormLabels: Record<PaymentFormType, string> = {
  CONTADO: "Contado",
  CREDITO: "Credito",
};

const paymentMethodLabels: Record<PaymentType, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  DEPOSITO: "Deposito",
  PLIN: "Plin",
  YAPE: "Yape",
};

const statusToneByStatus: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-orange-100 text-orange-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
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
  return item.sku?.sku?.backendSku ?? item.sku?.sku?.customSku ?? item.skuId ?? "-";
};

function SectionTitle({
  icon,
  title,
  accentClassName,
  meta,
}: {
  icon: ReactNode;
  title: string;
  accentClassName: string;
  meta?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 border-l-2 px-3 py-2 ${accentClassName}`}>
      <div className="flex items-center gap-2">
        <span className="text-black/60">{icon}</span>
        <h4 className="text-[12px] font-semibold tracking-[0.08em] text-black/70 uppercase">{title}</h4>
      </div>
      {meta ? <span className="text-[10px] text-black/45">{meta}</span> : null}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-2 text-[12px]">
      <span className="text-black/45">{label}</span>
      <span className="min-w-0 text-black/72">{value}</span>
    </div>
  );
}

function MetricInline({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: string;
  accentClassName: string;
}) {
  return (
    <div className={`border-l-2 px-3 py-2 ${accentClassName}`}>
      <p className="text-[10px] uppercase tracking-[0.12em] text-black/45">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-black/78">{value}</p>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return <div className="px-3 py-4 text-[12px] text-black/45">{message}</div>;
}

export function PurchaseDetailsModal({ open, poId, purchase, onClose }: Props) {
  const [detail, setDetail] = useState<PurchaseOrderDetailOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !poId) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getById(poId);
        if (cancelled) return;
        setDetail(response);
      } catch (err) {
        if (cancelled) return;
        setDetail(null);
        setError(parseApiError(err, "No se pudo cargar el detalle de la compra."));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, poId]);

  const currency = detail?.currency ?? purchase?.currency ?? "PEN";
  const items = detail?.items ?? [];
  const payments: Payment[] = detail?.payments ?? purchase?.payments ?? [];
  const quotas: CreditQuota[] = detail?.quotas ?? purchase?.quotas ?? [];
  const paymentForm = detail?.paymentForm ?? purchase?.paymentForm ?? "CONTADO";
  const total = detail?.total ?? purchase?.total ?? 0;
  const totalPaid = detail?.totalPaid ?? purchase?.totalPaid ?? 0;
  const totalToPay = detail?.totalToPay ?? purchase?.totalToPay ?? 0;
  const totalLabel = money(total, currency);
  const paidLabel = money(totalPaid, currency);
  const pendingLabel = money(totalToPay, currency);

  const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
  const paymentCountLabel = `${payments.length} pago${payments.length === 1 ? "" : "s"}`;
  const quotaCountLabel = `${quotas.length} cuota${quotas.length === 1 ? "" : "s"}`;

  const statusTone = useMemo(() => {
    if (!purchase?.status) return "bg-slate-100 text-slate-700";
    return statusToneByStatus[purchase.status] ?? "bg-slate-100 text-slate-700";
  }, [purchase?.status]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de compra"
      className="w-[min(48rem,calc(100vw-1rem))]"
      bodyClassName="p-0"
      description={purchase?.numero ? `Compra ${purchase.numero}` : undefined}
    >
      <div className="max-h-[78vh] overflow-auto">
        {purchase ? (
          <div className="bg-white">
            <div className="border-b border-black/8 bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/75">
                    {purchase.docLabel}
                  </p>
                  <h3 className="text-[15px] font-semibold text-black/85">
                    {purchase.numero || "Sin numero"}
                  </h3>
                  <p className="text-[11px] text-black/50">
                    {purchase.paymentForm ? paymentFormLabels[purchase.paymentForm] : "Contado"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusTone}`}>
                    {purchase.statusLabel}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MetricInline label="Total" value={totalLabel} accentClassName="border-emerald-300 bg-white/60" />
                <MetricInline label="Pagado" value={paidLabel} accentClassName="border-sky-300 bg-white/60" />
                <MetricInline label="Pendiente" value={pendingLabel} accentClassName="border-amber-300 bg-white/60" />
              </div>
            </div>

            {loading ? (
              <div className="px-5 py-6 text-[12px] text-black/50">Cargando detalle...</div>
            ) : error ? (
              <div className="px-5 py-6 text-[12px] text-rose-600">{error}</div>
            ) : (
              <div className="divide-y divide-black/8">
                <section className="px-4 py-3 sm:px-5">
                  <SectionTitle
                    icon={<ReceiptText className="h-4 w-4" />}
                    title="Resumen"
                    accentClassName="border-emerald-400"
                    meta={`${itemCountLabel} · ${paymentCountLabel}${paymentForm === "CREDITO" ? ` · ${quotaCountLabel}` : ""}`}
                  />

                  <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                    <div className="divide-y divide-black/6">
                      <InfoRow
                        label="Proveedor"
                        value={
                          purchase.supplierDoc
                            ? `${purchase.supplierLabel} · ${purchase.supplierDoc}`
                            : purchase.supplierLabel
                        }
                      />
                      <InfoRow label="Almacen" value={purchase.warehouseLabel} />
                      <InfoRow
                        label="Emision"
                        value={
                          detail?.dateIssue
                            ? formatDateTime(detail.dateIssue)
                            : `${purchase.date}${purchase.time ? ` ${purchase.time}` : ""}`
                        }
                      />
                    </div>

                    <div className="divide-y divide-black/6">
                      <InfoRow
                        label="Ingreso"
                        value={
                          detail?.expectedAt
                            ? formatDateTime(detail.expectedAt)
                            : `${purchase.dateEnter}${purchase.timeEnter ? ` ${purchase.timeEnter}` : ""}`
                        }
                      />
                      <InfoRow
                        label="Vencimiento"
                        value={detail?.dateExpiration ? formatDateTime(detail.dateExpiration) : "-"}
                      />
                      <InfoRow
                        label="Forma"
                        value={paymentFormLabels[paymentForm] ?? paymentForm}
                      />
                    </div>
                  </div>
                </section>

                <section className="px-4 py-3 sm:px-5">
                  <SectionTitle
                    icon={<Package className="h-4 w-4" />}
                    title="Items"
                    accentClassName="border-sky-400"
                    meta={itemCountLabel}
                  />

                  <div className="mt-3 divide-y divide-black/6 border-t border-black/6">
                    {items.length ? (
                      items.map((item, index) => {
                        const lineTotal =
                          typeof item.quantity === "number" && typeof item.unitPrice === "number"
                            ? item.quantity * item.unitPrice
                            : item.purchaseValue ?? 0;

                        return (
                          <div
                            key={item.poItemId ?? item.skuId ?? `${index}`}
                            className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium text-black/80">
                                {getItemLabel(item)}
                              </p>
                              <p className="mt-1 text-[10px] text-black/45">
                                {getItemCode(item)} · {item.unitBase || "-"} · x{item.factor ?? 1}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[11px] sm:min-w-[180px] sm:text-right">
                              <div>
                                <p className="text-black/40">Cantidad</p>
                                <p className="mt-1 font-medium text-black/75">
                                  {Number(item.quantity ?? 0)} u.
                                </p>
                              </div>
                              <div>
                                <p className="text-black/40">Importe</p>
                                <p className="mt-1 font-medium text-black/75">
                                  {money(lineTotal, currency)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <EmptySection message="No hay items registrados para esta compra." />
                    )}
                  </div>
                </section>

                <section className="px-4 py-3 sm:px-5">
                  <SectionTitle
                    icon={<Wallet className="h-4 w-4" />}
                    title="Pagos"
                    accentClassName="border-violet-400"
                    meta={paymentCountLabel}
                  />

                  <div className="mt-3 divide-y divide-black/6 border-t border-black/6">
                    {payments.length ? (
                      payments.map((payment, index) => (
                        <div
                          key={payment.payDocId ?? `${payment.method}-${payment.date}-${index}`}
                          className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-black/78">
                              {paymentMethodLabels[payment.method] ?? payment.method}
                            </p>
                            <p className="mt-1 text-[10px] text-black/45">
                              {formatDateTime(payment.date)}
                              {payment.operationNumber ? ` · Op. ${payment.operationNumber}` : ""}
                            </p>
                            {payment.note ? (
                              <p className="mt-1 text-[10px] text-black/42">{payment.note}</p>
                            ) : null}
                          </div>

                          <div className="sm:min-w-[160px] sm:text-right">
                            <p className="text-[10px] text-black/40">Monto</p>
                            <p className="mt-1 text-[12px] font-semibold text-black/78">
                              {money(payment.amount ?? 0, payment.currency)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptySection message="No hay pagos registrados para esta compra." />
                    )}
                  </div>
                </section>

                {paymentForm === "CREDITO" ? (
                  <section className="px-4 py-3 sm:px-5">
                    <SectionTitle
                      icon={<CircleDollarSign className="h-4 w-4" />}
                      title="Cuotas"
                      accentClassName="border-amber-400"
                      meta={quotaCountLabel}
                    />

                    <div className="mt-3 divide-y divide-black/6 border-t border-black/6">
                      {quotas.length ? (
                        quotas.map((quota, index) => {
                          const quotaPaid = quota.totalPaid ?? 0;
                          const quotaPending = Math.max((quota.totalToPay ?? 0) - quotaPaid, 0);
                          const isCompleted = quotaPending <= 0;

                          return (
                            <div
                              key={quota.quotaId ?? `${quota.number}-${quota.expirationDate}-${index}`}
                              className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[12px] font-medium text-black/78">
                                    Cuota {quota.number}
                                  </p>
                                  <span
                                    className={`px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${
                                      isCompleted
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {isCompleted ? "Pagada" : "Pendiente"}
                                  </span>
                                </div>
                                <p className="mt-1 text-[10px] text-black/45">
                                  Vence: {formatDateOnly(quota.expirationDate)}
                                  {quota.paymentDate ? ` · Pago: ${formatDateOnly(quota.paymentDate)}` : ""}
                                </p>
                              </div>

                              <div className="grid grid-cols-3 gap-3 text-[11px] sm:min-w-[240px] sm:text-right">
                                <div>
                                  <p className="text-black/40">Total</p>
                                  <p className="mt-1 font-medium text-black/75">
                                    {money(quota.totalToPay ?? 0, currency)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-black/40">Pagado</p>
                                  <p className="mt-1 font-medium text-black/75">
                                    {money(quotaPaid, currency)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-black/40">Pend.</p>
                                  <p className="mt-1 font-medium text-black/75">
                                    {money(quotaPending, currency)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <EmptySection message="No hay cuotas registradas para esta compra a credito." />
                      )}
                    </div>
                  </section>
                ) : null}

                {(detail?.note ?? purchase.note)?.trim() ? (
                  <section className="px-4 py-3 sm:px-5">
                    <SectionTitle
                      icon={<CreditCard className="h-4 w-4" />}
                      title="Nota"
                      accentClassName="border-rose-300"
                    />
                    <div className="mt-3 border-t border-black/6 pt-3">
                      <p className="text-[12px] leading-5 text-black/62">
                        {detail?.note ?? purchase.note}
                      </p>
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
