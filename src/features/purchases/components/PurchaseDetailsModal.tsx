import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Package,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { env } from "@/env";
import { Modal } from "@/shared/components/modales/Modal";
import { getById } from "@/shared/services/purchaseService";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { money } from "@/shared/utils/functionPurchases";
import { uploadPurchaseImageProdution } from "../utils/purchaseActions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { useAuth } from "@/shared/hooks/useAuth";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";

import type {
  PaymentFormType,
  PurchaseOrderStatus,
  PaymentType,
} from "@/features/purchases/types/purchaseEnums";
import type {
  CreditQuota,
  Payment,
  PurchaseOrder,
} from "@/features/purchases/types/purchase";
import type {
  PurchaseOrderDetailOutput,
  PurchaseOrderItemEditOutput,
} from "@/features/purchases/types/itemPurchaseEdit";

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
  CREDITO: "Crédito",
};

const paymentMethodLabels: Record<PaymentType, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  DEPOSITO: "Depósito",
  PLIN: "Plin",
  YAPE: "Yape",
};

const statusToneByStatus: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-amber-50 text-amber-700",
  PARTIAL: "bg-orange-50 text-orange-700",
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

function SectionHeader({
  icon,
  title,
  meta,
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-black/60">
        {icon}
        <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/55">
          {title}
        </h4>
      </div>

      {meta ? <span className="text-[11px] text-black/40">{meta}</span> : null}
    </div>
  );
}

function FieldItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50">
      <p className="text-[10px] uppercase tracking-wide text-black/35">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-black/75">
        {value || "-"}
      </p>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">
      {message}
    </div>
  );
}

export function PurchaseDetailsModal({
  open,
  poId,
  purchase,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<PurchaseOrderDetailOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(
    null,
  );
  const { userRole } = useAuth();
  const { showFlash } = useFlashMessage();

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
        setError(
          parseApiError(err, "No se pudo cargar el detalle de la compra."),
        );
      } finally {
        if (!cancelled) setLoading(false);
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

  const paymentForm =
    detail?.paymentForm ?? purchase?.paymentForm ?? "CONTADO";

  const total = detail?.total ?? purchase?.total ?? 0;
  const totalPaid = detail?.totalPaid ?? purchase?.totalPaid ?? 0;
  const totalToPay = detail?.totalToPay ?? purchase?.totalToPay ?? 0;

  const totalLabel = money(total, currency);
  const paidLabel = money(totalPaid, currency);
  const pendingLabel = money(totalToPay, currency);

  const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
  const paymentCountLabel = `${payments.length} pago${
    payments.length === 1 ? "" : "s"
  }`;
  const quotaCountLabel = `${quotas.length} cuota${
    quotas.length === 1 ? "" : "s"
  }`;

  const statusTone = useMemo(() => {
    if (!purchase?.status) return "bg-slate-100 text-slate-700";

    return statusToneByStatus[purchase.status] ?? "bg-slate-100 text-slate-700";
  }, [purchase?.status]);

  const metaResumen = `${itemCountLabel} · ${paymentCountLabel}${
    paymentForm === "CREDITO" ? ` · ${quotaCountLabel}` : ""
  }`;

  const images = useMemo(
    () => detail?.imageProdution ?? purchase?.imageProdution ?? [],
    [detail?.imageProdution, purchase?.imageProdution],
  );

  const isAdmin = (userRole ?? "").toLowerCase() === "admin";
  const canAdminUploadMissingPhoto =
    isAdmin && images.length === 0 && Boolean(poId);

  const resolveImageUrl = (rawUrl?: string | null) => {
    const raw = rawUrl?.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;

    try {
      return new URL(raw, env.apiBaseUrl).toString();
    } catch {
      return raw;
    }
  };

  const normalizedImages = useMemo(
    () => images.map((url) => resolveImageUrl(url)).filter(Boolean),
    [images],
  );

  const hasMultipleImages = normalizedImages.length > 1;
  const activeImage = normalizedImages[activeImageIndex] ?? normalizedImages[0];

  const showPreviousImage = () => {
    setActiveImageIndex((currentIndex) =>
      currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1,
    );
  };

  const showNextImage = () => {
    setActiveImageIndex((currentIndex) =>
      currentIndex === normalizedImages.length - 1 ? 0 : currentIndex + 1,
    );
  };

  const showPreviousPreviewImage = () => {
    setPreviewImageIndex((currentIndex) => {
      if (currentIndex === null) return 0;
      return currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1;
    });
  };

  const showNextPreviewImage = () => {
    setPreviewImageIndex((currentIndex) => {
      if (currentIndex === null) return 0;
      return currentIndex === normalizedImages.length - 1 ? 0 : currentIndex + 1;
    });
  };

  useEffect(() => {
    setActiveImageIndex(0);
    setPreviewImageIndex(null);
  }, [open, poId, images.length]);

  const handleUploadFromDetail = async (file?: File | null) => {
    if (!poId || !file) return;
    setUploadingPhoto(true);
    try {
      const response = await uploadPurchaseImageProdution(poId, file);
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        const refreshed = await getById(poId);
        setDetail(refreshed);
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch (err) {
      showFlash(
        errorResponse(parseApiError(err, "No se pudo subir la foto de compra")),
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de compra"
      className="max-h-[70vh]"
      bodyClassName="p-0 overflow-hidden"
    >
      {!purchase ? (
        <div className="px-5 py-8 text-center text-xs text-black/50">
          No hay compra seleccionada.
        </div>
      ) : (
        <div className="bg-white">
          <header className="border-b border-black/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <ReceiptText className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
                      {purchase.docLabel}
                    </p>

                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${statusTone}`}
                    >
                      {purchase.statusLabel}
                    </span>
                  </div>

                  <h3 className="mt-0.5 truncate text-sm font-semibold text-black/85">
                    {purchase.numero || "Sin número"}
                  </h3>

                  <p className="mt-0.5 truncate text-[11px] text-black/45">
                    {paymentFormLabels[paymentForm] ?? paymentForm}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-center">
                <p className="text-[9px] uppercase tracking-wide text-black/35">
                  Total
                </p>
                <p className="text-xs font-semibold text-black/75">
                  {totalLabel}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
              <FieldItem label="Total" value={totalLabel} />
              <FieldItem label="Pagado" value={paidLabel} />
              <FieldItem label="Pendiente" value={pendingLabel} />
            </div>
          </header>

          {loading ? (
            <div className="px-5 py-8 text-center text-xs text-black/50">
              Cargando detalle...
            </div>
          ) : error ? (
            <div className="px-5 py-8 text-center text-xs text-rose-600">
              {error}
            </div>
          ) : (
            <div className="max-h-[calc(80vh-6rem)] space-y-4 overflow-y-auto px-4 py-3">
              <section>
                <SectionHeader
                  icon={<ReceiptText className="h-3.5 w-3.5" />}
                  title="Resumen"
                  meta={metaResumen}
                />

                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  <FieldItem
                    label="Proveedor"
                    value={
                      purchase.supplierDoc
                        ? `${purchase.supplierLabel} · ${purchase.supplierDoc}`
                        : purchase.supplierLabel
                    }
                  />

                  <FieldItem label="Almacén" value={purchase.warehouseLabel} />

                  <FieldItem
                    label="Emisión"
                    value={
                      detail?.dateIssue
                        ? formatDateTime(detail.dateIssue)
                        : `${purchase.date}${
                            purchase.time ? ` ${purchase.time}` : ""
                          }`
                    }
                  />

                  <FieldItem
                    label="Ingreso"
                    value={
                      detail?.expectedAt
                        ? formatDateTime(detail.expectedAt)
                        : `${purchase.dateEnter}${
                            purchase.timeEnter ? ` ${purchase.timeEnter}` : ""
                          }`
                    }
                  />

                  <FieldItem
                    label="Vencimiento"
                    value={
                      detail?.dateExpiration
                        ? formatDateTime(detail.dateExpiration)
                        : "-"
                    }
                  />

                  <FieldItem
                    label="Forma"
                    value={paymentFormLabels[paymentForm] ?? paymentForm}
                  />
                </div>
              </section>

              <section>
                <SectionHeader
                  icon={<Package className="h-3.5 w-3.5" />}
                  title="Items"
                  meta={itemCountLabel}
                />

                {items.length ? (
                  <div className="overflow-hidden rounded-md border border-black/5">
                    {items.map((item, index) => {
                      const lineTotal =
                        typeof item.quantity === "number" &&
                        typeof item.unitPrice === "number"
                          ? item.quantity * item.unitPrice
                          : item.purchaseValue ?? 0;

                      return (
                        <div
                          key={item.poItemId ?? item.skuId ?? `${index}`}
                          className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-black/80">
                              {getItemLabel(item)}
                            </p>

                            <p className="mt-0.5 truncate text-[10px] text-black/40">
                              {getItemCode(item)} · {item.unitBase || "-"} · x
                              {item.factor ?? 1}
                            </p>
                          </div>

                          <div className="grid shrink-0 grid-cols-2 gap-3 text-right">
                            <div>
                              <p className="text-[9px] uppercase tracking-wide text-black/35">
                                Cant.
                              </p>
                              <p className="text-xs font-semibold text-black/80">
                                {Number(item.quantity ?? 0)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] uppercase tracking-wide text-black/35">
                                Importe
                              </p>
                              <p className="text-xs font-semibold text-black/80">
                                {money(lineTotal, currency)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptySection message="No hay items registrados para esta compra." />
                )}
              </section>

              <section>
                <SectionHeader
                  icon={<Wallet className="h-3.5 w-3.5" />}
                  title="Pagos"
                  meta={paymentCountLabel}
                />

                {payments.length ? (
                  <div className="overflow-hidden rounded-md border border-black/5">
                    {payments.map((payment, index) => (
                      <div
                        key={
                          payment.payDocId ??
                          `${payment.method}-${payment.date}-${index}`
                        }
                        className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-black/80">
                            {paymentMethodLabels[payment.method] ??
                              payment.method}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-black/40">
                            {formatDateTime(payment.date)}
                            {payment.operationNumber
                              ? ` · Op. ${payment.operationNumber}`
                              : ""}
                          </p>

                          {payment.note ? (
                            <p className="mt-0.5 truncate text-[10px] text-black/40">
                              {payment.note}
                            </p>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[9px] uppercase tracking-wide text-black/35">
                            Monto
                          </p>
                          <p className="text-xs font-semibold text-black/80">
                            {money(payment.amount ?? 0, payment.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptySection message="No hay pagos registrados para esta compra." />
                )}
              </section>

              {paymentForm === "CREDITO" ? (
                <section>
                  <SectionHeader
                    icon={<CircleDollarSign className="h-3.5 w-3.5" />}
                    title="Cuotas"
                    meta={quotaCountLabel}
                  />

                  {quotas.length ? (
                    <div className="overflow-hidden rounded-md border border-black/5">
                      {quotas.map((quota, index) => {
                        const quotaPaid = quota.totalPaid ?? 0;
                        const quotaPending = Math.max(
                          (quota.totalToPay ?? 0) - quotaPaid,
                          0,
                        );
                        const isCompleted = quotaPending <= 0;

                        return (
                          <div
                            key={
                              quota.quotaId ??
                              `${quota.number}-${quota.expirationDate}-${index}`
                            }
                            className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-medium text-black/80">
                                  Cuota {quota.number}
                                </p>

                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                                    isCompleted
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {isCompleted ? "Pagada" : "Pendiente"}
                                </span>
                              </div>

                              <p className="mt-0.5 truncate text-[10px] text-black/40">
                                Vence: {formatDateOnly(quota.expirationDate)}
                                {quota.paymentDate
                                  ? ` · Pago: ${formatDateOnly(
                                      quota.paymentDate,
                                    )}`
                                  : ""}
                              </p>
                            </div>

                            <div className="grid shrink-0 grid-cols-3 gap-3 text-right">
                              <div>
                                <p className="text-[9px] uppercase tracking-wide text-black/35">
                                  Total
                                </p>
                                <p className="text-xs font-semibold text-black/80">
                                  {money(quota.totalToPay ?? 0, currency)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase tracking-wide text-black/35">
                                  Pagado
                                </p>
                                <p className="text-xs font-semibold text-black/80">
                                  {money(quotaPaid, currency)}
                                </p>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase tracking-wide text-black/35">
                                  Pend.
                                </p>
                                <p className="text-xs font-semibold text-black/80">
                                  {money(quotaPending, currency)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptySection message="No hay cuotas registradas para esta compra a crédito." />
                  )}
                </section>
              ) : null}

              {(detail?.note ?? purchase.note)?.trim() ? (
                <section>
                  <SectionHeader
                    icon={<CreditCard className="h-3.5 w-3.5" />}
                    title="Nota"
                  />

                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs leading-5 text-black/60">
                      {detail?.note ?? purchase.note}
                    </p>
                  </div>
                </section>
              ) : null}

              <section>
                <SectionHeader
                  icon={<Package className="h-3.5 w-3.5" />}
                  title="Foto de compra"
                />

                {normalizedImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative h-35 w-full overflow-hidden rounded-md border border-black/10 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setPreviewImageIndex(activeImageIndex)}
                        className="block h-full w-full"
                        aria-label="Ver imagen grande"
                      >
                        <img
                          src={activeImage}
                          alt={`Compra ${activeImageIndex + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>

                      {hasMultipleImages ? (
                        <>
                          <button
                            type="button"
                            onClick={showPreviousImage}
                            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black/65 shadow transition hover:bg-white hover:text-black"
                            aria-label="Imagen anterior"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>

                          <button
                            type="button"
                            onClick={showNextImage}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black/65 shadow transition hover:bg-white hover:text-black"
                            aria-label="Imagen siguiente"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>

                          <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black/55">
                            {activeImageIndex + 1} / {normalizedImages.length}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {hasMultipleImages ? (
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {normalizedImages.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            onClick={() => setActiveImageIndex(index)}
                            className={`h-12 w-14 shrink-0 overflow-hidden rounded-md border transition ${
                              activeImageIndex === index
                                ? "border-black/45"
                                : "border-black/10 opacity-70 hover:opacity-100"
                            }`}
                            aria-label={`Seleccionar imagen ${index + 1}`}
                          >
                            <img
                              src={url}
                              alt={`Compra miniatura ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <ImagePreviewModal
                      open={previewImageIndex !== null}
                      images={normalizedImages}
                      currentIndex={previewImageIndex ?? 0}
                      onClose={() => setPreviewImageIndex(null)}
                      onPrevious={showPreviousPreviewImage}
                      onNext={showNextPreviewImage}
                      altPrefix="Imagen de compra"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <EmptySection message="Esta compra no tiene foto." />
                    {canAdminUploadMissingPhoto ? (
                      <label className="block text-xs text-black/60">
                        <span className="mb-1 block">
                          Subir foto (solo admin)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPhoto}
                          onChange={(e) =>
                            void handleUploadFromDetail(
                              e.target.files?.[0] ?? null,
                            )
                          }
                          className="w-full rounded-md border border-black/10 px-2 py-1.5"
                        />
                      </label>
                    ) : null}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
