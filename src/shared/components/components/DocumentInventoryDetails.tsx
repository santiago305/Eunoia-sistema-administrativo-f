import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CircleDollarSign,
  Factory,
  Package,
  ReceiptText,
  Wallet,
  CreditCard,
  Wrench,
} from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import type { InventoryDocument } from "@/features/catalog/types/documentInventory";
import { DocStatus, DocType } from "@/features/warehouse/types/warehouse";
import { OperationImageGallery } from "@/shared/components/components/OperationImageGallery";
import type {
  DocumentInventoryDetailsProps,
  InventoryDocumentDetail,
  InventoryDocumentDetailItem,
} from "@/shared/components/components/types/documentInventoryDetails";

const docTypeLabels: Record<DocType, string> = {
  [DocType.ADJUSTMENT]: "Ajuste",
  [DocType.TRANSFER]: "Transferencia",
  [DocType.IN]: "Ingreso",
  [DocType.OUT]: "Salida",
  [DocType.PRODUCTION]: "Producción",
  [DocType.PURCHASE]: "Compra",
};

const statusLabels: Record<DocStatus, string> = {
  [DocStatus.DRAFT]: "Borrador",
  [DocStatus.POSTED]: "Contabilizado",
  [DocStatus.CANCELLED]: "Anulado",
};

type DocumentConfig = {
  title: string;
  icon: ReactNode;
  iconClassName: string;
  badgeClassName: string;
};

function getDocumentConfig(docType: DocType): DocumentConfig {
  switch (docType) {
    case DocType.ADJUSTMENT:
      return {
        title: "Detalle de ajuste",
        icon: <Wrench className="h-3.5 w-3.5" />,
        iconClassName: "bg-amber-100 text-amber-700",
        badgeClassName: "bg-amber-50 text-amber-700",
      };

    case DocType.TRANSFER:
      return {
        title: "Detalle de transferencia",
        icon: <ArrowLeftRight className="h-3.5 w-3.5" />,
        iconClassName: "bg-sky-100 text-sky-700",
        badgeClassName: "bg-sky-50 text-sky-700",
      };

    case DocType.IN:
      return {
        title: "Detalle de ingreso",
        icon: <ArrowDown className="h-3.5 w-3.5" />,
        iconClassName: "bg-emerald-100 text-emerald-700",
        badgeClassName: "bg-emerald-50 text-emerald-700",
      };

    case DocType.OUT:
      return {
        title: "Detalle de salida",
        icon: <ArrowUp className="h-3.5 w-3.5" />,
        iconClassName: "bg-rose-100 text-rose-700",
        badgeClassName: "bg-rose-50 text-rose-700",
      };

    case DocType.PRODUCTION:
      return {
        title: "Detalle de producción",
        icon: <Factory className="h-3.5 w-3.5" />,
        iconClassName: "bg-violet-100 text-violet-700",
        badgeClassName: "bg-violet-50 text-violet-700",
      };

    default:
      return {
        title: "Detalle de documento",
        icon: <ReceiptText className="h-3.5 w-3.5" />,
        iconClassName: "bg-slate-100 text-slate-700",
        badgeClassName: "bg-slate-100 text-slate-700",
      };
  }
}

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

const buildNumero = (document?: InventoryDocument | null) => {
  if (!document) return "-";

  const serie = document.serieCode || document.serie || "";
  const sep = document.serieSeparator || "-";
  const num = document.correlative != null ? String(document.correlative) : "";

  const padded =
    document.seriePadding != null
      ? num.padStart(document.seriePadding, "0")
      : num;

  return [serie, padded].filter(Boolean).join(sep) || document.id;
};

const getItemLabel = (item: InventoryDocumentDetailItem) => {
  return (
    item.name ??
    item.sku?.name ??
    item.sku?.sku?.name ??
    item.backendSku ??
    item.customSku ??
    item.sku?.backendSku ??
    item.sku?.customSku ??
    item.sku?.sku?.backendSku ??
    item.sku?.sku?.customSku ??
    item.skuId ??
    item.sku?.id ??
    "Item"
  );
};

const getItemCode = (item: InventoryDocumentDetailItem) => {
  return (
    item.backendSku ??
    item.customSku ??
    item.sku?.backendSku ??
    item.sku?.customSku ??
    item.sku?.sku?.backendSku ??
    item.sku?.sku?.customSku ??
    item.skuId ??
    item.sku?.id ??
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">
      {message}
    </div>
  );
}

export function DocumentInventoryDetails({
  open,
  documentId,
  document,
  items,
  onClose,
  loadDetail,
  extendedDetails,
}: DocumentInventoryDetailsProps) {
  const [detail, setDetail] = useState<InventoryDocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!documentId || !loadDetail) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await loadDetail(documentId);
        if (cancelled) return;
        setDetail(response);
      } catch (err) {
        if (cancelled) return;

        setDetail(null);
        setError(
          parseApiError(err, "No se pudo cargar el detalle del documento."),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [documentId, loadDetail, open]);

  const resolvedDocument = detail?.document ?? document;
  const resolvedItems = detail?.items ?? items ?? [];

  const numero = buildNumero(resolvedDocument);

  const config = useMemo(
    () => getDocumentConfig(resolvedDocument?.docType ?? DocType.TRANSFER),
    [resolvedDocument?.docType],
  );

  const docTypeLabel = resolvedDocument?.docType
    ? docTypeLabels[resolvedDocument.docType] ?? resolvedDocument.docType
    : "Documento";

  const statusLabel = resolvedDocument?.status
    ? statusLabels[resolvedDocument.status] ?? resolvedDocument.status
    : null;

  const fromWarehouseLabel =
    resolvedDocument?.fromWarehouseName ??
    resolvedDocument?.fromWarehouse?.name ??
    resolvedDocument?.fromWarehouseId ??
    "-";

  const toWarehouseLabel =
    resolvedDocument?.toWarehouseName ??
    resolvedDocument?.toWarehouse?.name ??
    resolvedDocument?.toWarehouseId ??
    "-";

  const singleWarehouseLabel =
    resolvedDocument?.fromWarehouseName ??
    resolvedDocument?.toWarehouseName ??
    resolvedDocument?.fromWarehouse?.name ??
    resolvedDocument?.toWarehouse?.name ??
    resolvedDocument?.fromWarehouseId ??
    resolvedDocument?.toWarehouseId ??
    "-";

  const isTransfer = resolvedDocument?.docType === DocType.TRANSFER;

  const itemCountLabel = `${resolvedItems.length} item${
    resolvedItems.length === 1 ? "" : "s"
  }`;

  const hasExtendedDetails = Boolean(extendedDetails);

  if (hasExtendedDetails) {
    const x = extendedDetails!;
    const xItems = x.items ?? [];
    const xPayments = x.payments ?? [];
    const xQuotas = x.quotas ?? [];

    return (
      <Modal
        open={open}
        onClose={onClose}
        title={x.title ?? "Detalle"}
        className={x.modalClassName ?? "max-h-[70vh]"}
        bodyClassName={x.modalBodyClassName ?? "p-0 overflow-hidden"}
      >
        {!x.headerNumber ? (
          <div className="px-5 py-8 text-center text-xs text-black/50">
            {x.emptyMessage ?? "No hay registro seleccionado."}
          </div>
        ) : (
          <div className="bg-white">
            <header className="border-b border-black/5 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-2.5">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      x.headerIconClassName ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {x.headerIcon ?? <ReceiptText className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
                        {x.headerLabel}
                      </p>
                      {x.headerBadge ? (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                            x.headerBadgeClassName ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {x.headerBadge}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-0.5 truncate text-sm font-semibold text-black/85">
                      {x.headerNumber}
                    </h3>
                    {x.headerSubLabel ? (
                      <p className="mt-0.5 truncate text-[11px] text-black/45">
                        {x.headerSubLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
                {x.headerRightLabel && x.headerRightValue ? (
                  <div className="shrink-0 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-black/35">
                      {x.headerRightLabel}
                    </p>
                    <p className="text-xs font-semibold text-black/75">
                      {x.headerRightValue}
                    </p>
                  </div>
                ) : null}
              </div>

              {(x.summaryTopFields ?? []).length ? (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
                  {(x.summaryTopFields ?? []).map((field) => (
                    <FieldItem key={field.label} label={field.label} value={field.value} />
                  ))}
                </div>
              ) : null}
            </header>

            {x.loading ? (
              <div className="px-5 py-8 text-center text-xs text-black/50">
                Cargando detalle...
              </div>
            ) : x.error ? (
              <div className="px-5 py-8 text-center text-xs text-rose-600">
                {x.error}
              </div>
            ) : (
              <div className="max-h-[calc(80vh-6rem)] space-y-4 overflow-y-auto px-4 py-3">
                {(x.summaryFields ?? []).length ? (
                  <section>
                    <SectionHeader
                      icon={<ReceiptText className="h-3.5 w-3.5" />}
                      title="Resumen"
                      meta={x.summaryMeta}
                    />
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {(x.summaryFields ?? []).map((field) => (
                        <FieldItem key={field.label} label={field.label} value={field.value} />
                      ))}
                    </div>
                  </section>
                ) : null}

                <section>
                  <SectionHeader
                    icon={<Package className="h-3.5 w-3.5" />}
                    title={x.itemsTitle ?? "Items"}
                    meta={x.itemsMeta}
                  />
                  {xItems.length ? (
                    <div className="overflow-hidden rounded-md border border-black/5">
                      {xItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-black/80">
                              {item.label}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-black/40">
                              {item.code ?? "-"}
                              {item.unit ? ` · ${item.unit}` : ""}
                              {item.extra ? ` · ${item.extra}` : ""}
                            </p>
                          </div>
                          <div
                            className={`grid shrink-0 ${
                              item.amount ? "grid-cols-2" : "grid-cols-1"
                            } gap-3 text-right`}
                          >
                            <div>
                              <p className="text-[9px] uppercase tracking-wide text-black/35">
                                Cant.
                              </p>
                              <p className="text-xs font-semibold text-black/80">
                                {item.quantity ?? "-"}
                              </p>
                            </div>
                            {item.amount ? (
                              <div>
                                <p className="text-[9px] uppercase tracking-wide text-black/35">
                                  Importe
                                </p>
                                <p className="text-xs font-semibold text-black/80">
                                  {item.amount}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      message={x.itemsEmptyMessage ?? "No hay items registrados."}
                    />
                  )}
                </section>

                {xPayments.length || x.paymentsMeta ? (
                  <section>
                    <SectionHeader
                      icon={<Wallet className="h-3.5 w-3.5" />}
                      title="Pagos"
                      meta={x.paymentsMeta}
                    />
                    {xPayments.length ? (
                      <div className="overflow-hidden rounded-md border border-black/5">
                        {xPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-black/80">
                                {payment.method}
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
                                {payment.amount}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        message={
                          x.paymentsEmptyMessage ?? "No hay pagos registrados."
                        }
                      />
                    )}
                  </section>
                ) : null}

                {xQuotas.length || x.quotasMeta ? (
                  <section>
                    <SectionHeader
                      icon={<CircleDollarSign className="h-3.5 w-3.5" />}
                      title="Cuotas"
                      meta={x.quotasMeta}
                    />
                    {xQuotas.length ? (
                      <div className="overflow-hidden rounded-md border border-black/5">
                        {xQuotas.map((quota) => (
                          <div
                            key={quota.id}
                            className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-medium text-black/80">
                                  Cuota {quota.number}
                                </p>
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                                    quota.completed
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {quota.completed ? "Pagada" : "Pendiente"}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-[10px] text-black/40">
                                Vence: {quota.expirationDate ?? "-"}
                                {quota.paymentDate
                                  ? ` · Pago: ${quota.paymentDate}`
                                  : ""}
                              </p>
                            </div>
                            <div className="grid shrink-0 grid-cols-3 gap-3 text-right">
                              <div>
                                <p className="text-[9px] uppercase tracking-wide text-black/35">
                                  Total
                                </p>
                                <p className="text-xs font-semibold text-black/80">
                                  {quota.total}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-wide text-black/35">
                                  Pagado
                                </p>
                                <p className="text-xs font-semibold text-black/80">
                                  {quota.paid}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-wide text-black/35">
                                  Pend.
                                </p>
                                <p className="text-xs font-semibold text-black/80">
                                  {quota.pending}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        message={
                          x.quotasEmptyMessage ?? "No hay cuotas registradas."
                        }
                      />
                    )}
                  </section>
                ) : null}

                {x.note?.trim() ? (
                  <section>
                    <SectionHeader
                      icon={<CreditCard className="h-3.5 w-3.5" />}
                      title={x.noteTitle ?? "Nota"}
                    />
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs leading-5 text-black/60">{x.note}</p>
                    </div>
                  </section>
                ) : null}

                <section>
                  <SectionHeader
                    icon={<Package className="h-3.5 w-3.5" />}
                    title={x.imageTitle ?? "Foto"}
                  />
                  <OperationImageGallery
                    images={x.images ?? []}
                    altPrefix={x.imageAltPrefix ?? "Imagen"}
                    emptyMessage={x.imageEmptyMessage ?? "No hay foto."}
                    canUpload={Boolean(x.canUploadImage)}
                    uploading={Boolean(x.uploadingImage)}
                    onUpload={x.onUploadImage}
                  />
                </section>
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config.title}
      className="max-h-[65vh]"
      bodyClassName="p-0 overflow-hidden"
    >
      {!resolvedDocument ? (
        <div className="px-5 py-8 text-center text-xs text-black/50">
          No hay documento seleccionado.
        </div>
      ) : (
        <div className="bg-white">
          <header className="border-b border-black/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.iconClassName}`}
                >
                  {config.icon}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
                      {docTypeLabel}
                    </p>

                    {statusLabel ? (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${config.badgeClassName}`}
                      >
                        {statusLabel}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-0.5 truncate text-sm font-semibold text-black/85">
                    {numero}
                  </h3>

                  <p className="mt-0.5 truncate text-[11px] text-black/45">
                    {isTransfer
                      ? `${fromWarehouseLabel} → ${toWarehouseLabel}`
                      : singleWarehouseLabel}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-center  ">
                <p className="text-[9px] uppercase tracking-wide text-black/35">
                  Items
                </p>
                <p className="text-xs font-semibold text-black/75">
                  {resolvedItems.length}
                </p>
              </div>
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
                />

                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {isTransfer ? (
                    <>
                      <FieldItem
                        label="Almacén origen"
                        value={fromWarehouseLabel}
                      />
                      <FieldItem
                        label="Almacén destino"
                        value={toWarehouseLabel}
                      />
                    </>
                  ) : (
                    <FieldItem label="Almacén" value={singleWarehouseLabel} />
                  )}

                  <FieldItem
                    label="Creación"
                    value={formatDateTime(resolvedDocument.createdAt)}
                  />

                  <FieldItem
                    label="Posteo"
                    value={formatDateTime(resolvedDocument.postedAt)}
                  />

                  <FieldItem
                    label="Creado por"
                    value={
                      resolvedDocument.createdBy?.email ??
                      resolvedDocument.createdBy?.name ??
                      "-"
                    }
                  />

                  <FieldItem
                    label="Posteado por"
                    value={
                      resolvedDocument.postedBy?.email ??
                      resolvedDocument.postedBy?.name ??
                      "-"
                    }
                  />
                </div>
              </section>

              <section>
                <SectionHeader
                  icon={<Package className="h-3.5 w-3.5" />}
                  title="Items"
                  meta={itemCountLabel}
                />

                {resolvedItems.length ? (
                  <div className="overflow-hidden rounded-md border border-black/5">
                    {resolvedItems.map((item, index) => {
                      const unitName = item.unitName ?? item.unit?.name;
                      const quantity = Number(item.quantity ?? 0);

                      return (
                        <div
                          key={item.id ?? item.skuId ?? `${index}`}
                          className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-black/80">
                              {getItemLabel(item)}
                            </p>

                            <p className="mt-0.5 truncate text-[10px] text-black/40">
                              {getItemCode(item)}
                              {unitName ? ` · ${unitName}` : ""}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[9px] uppercase tracking-wide text-black/35">
                              Cant.
                            </p>
                            <p className="text-xs font-semibold text-black/80">
                              {Number.isFinite(quantity) ? quantity : "-"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState message="No hay items registrados para este documento." />
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
