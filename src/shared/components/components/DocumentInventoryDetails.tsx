import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Factory,
  Package,
  ReceiptText,
  Wrench,
} from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import type { InventoryDocument } from "@/features/catalog/types/documentInventory";
import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import { DocStatus, DocType } from "@/features/warehouse/types/warehouse";

export type InventoryDocumentDetailItem = {
  id?: string | null;
  skuId?: string | null;
  sku?: ProductSkuWithAttributes | null;
  name?: string | null;
  backendSku?: string | null;
  customSku?: string | null;
  unitName?: string | null;
  quantity?: number | null;
};

export type InventoryDocumentDetail = {
  document: InventoryDocument;
  items: InventoryDocumentDetailItem[];
};

type Props = {
  open: boolean;
  documentId?: string | null;
  document: InventoryDocument | null;
  items?: InventoryDocumentDetailItem[];
  onClose: () => void;
  loadDetail?: (documentId: string) => Promise<InventoryDocumentDetail>;
};

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
  headerClassName: string;
  accentClassName: string;
  toneClassName: string;
};

function getDocumentConfig(docType: DocType): DocumentConfig {
  switch (docType) {
    case DocType.ADJUSTMENT:
      return {
        title: "Detalle de ajuste",
        icon: <Wrench className="h-4 w-4" />,
        headerClassName:
          "border-b border-black/8 bg-gradient-to-r from-amber-50 via-white to-rose-50",
        accentClassName: "border-amber-400",
        toneClassName: "bg-amber-100 text-amber-700",
      };

    case DocType.TRANSFER:
      return {
        title: "Detalle de transferencia",
        icon: <ArrowLeftRight className="h-4 w-4" />,
        headerClassName:
          "border-b border-black/8 bg-gradient-to-r from-sky-50 via-white to-emerald-50",
        accentClassName: "border-sky-400",
        toneClassName: "bg-sky-100 text-sky-700",
      };

    case DocType.IN:
      return {
        title: "Detalle de ingreso",
        icon: <ArrowDown className="h-4 w-4" />,
        headerClassName:
          "border-b border-black/8 bg-gradient-to-r from-emerald-50 via-white to-sky-50",
        accentClassName: "border-emerald-400",
        toneClassName: "bg-emerald-100 text-emerald-700",
      };

    case DocType.OUT:
      return {
        title: "Detalle de salida",
        icon: <ArrowUp className="h-4 w-4" />,
        headerClassName:
          "border-b border-black/8 bg-gradient-to-r from-rose-50 via-white to-amber-50",
        accentClassName: "border-rose-400",
        toneClassName: "bg-rose-100 text-rose-700",
      };

    case DocType.PRODUCTION:
      return {
        title: "Detalle de producción",
        icon: <Factory className="h-4 w-4" />,
        headerClassName:
          "border-b border-black/8 bg-gradient-to-r from-violet-50 via-white to-sky-50",
        accentClassName: "border-violet-400",
        toneClassName: "bg-violet-100 text-violet-700",
      };

    default:
      return {
        title: "Detalle de documento",
        icon: <ReceiptText className="h-4 w-4" />,
        headerClassName:
          "border-b border-black/8 bg-gradient-to-r from-slate-50 via-white to-slate-50",
        accentClassName: "border-slate-300",
        toneClassName: "bg-slate-100 text-slate-700",
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
  const num =
    document.correlative != null ? String(document.correlative) : "";
  const padded =
    document.seriePadding != null
      ? num.padStart(document.seriePadding, "0")
      : num;
  return [serie, padded].filter(Boolean).join(sep) || document.id;
};

const getItemLabel = (item: InventoryDocumentDetailItem) => {
  return (
    item.name ??
    item.sku?.sku?.name ??
    item.backendSku ??
    item.customSku ??
    item.sku?.sku?.backendSku ??
    item.sku?.sku?.customSku ??
    item.skuId ??
    "Item"
  );
};

const getItemCode = (item: InventoryDocumentDetailItem) => {
  return (
    item.backendSku ??
    item.customSku ??
    item.sku?.sku?.backendSku ??
    item.sku?.sku?.customSku ??
    item.skuId ??
    "-"
  );
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
    <div
      className={`flex items-center justify-between gap-3 border-l-2 px-3 py-2 ${accentClassName}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-black/60">{icon}</span>
        <h4 className="text-[12px] font-semibold tracking-[0.08em] text-black/70 uppercase">
          {title}
        </h4>
      </div>
      {meta ? <span className="text-[10px] text-black/45">{meta}</span> : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-2 text-[12px]">
      <span className="text-black/45">{label}</span>
      <span className="min-w-0 text-black/72">{value}</span>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return <div className="px-3 py-4 text-[12px] text-black/45">{message}</div>;
}

export function DocumentInventoryDetails({
  open,
  documentId,
  document,
  items,
  onClose,
  loadDetail,
}: Props) {
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

  const itemCountLabel = `${resolvedItems.length} item${
    resolvedItems.length === 1 ? "" : "s"
  }`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config.title}
      className="w-[min(48rem,calc(100vw-1rem))]"
      bodyClassName="p-0"
      description={numero && numero !== "-" ? `${docTypeLabel} ${numero}` : undefined}
    >
      <div className="max-h-[78vh] overflow-auto">
        {resolvedDocument ? (
          <div className="bg-white">
            <div className={`px-4 py-4 sm:px-5 ${config.headerClassName}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/55">
                    {docTypeLabel}
                  </p>
                  <h3 className="text-[15px] font-semibold text-black/85">
                    {numero}
                  </h3>
                  <p className="text-[11px] text-black/50">
                    {resolvedDocument.docType === DocType.TRANSFER
                      ? `${fromWarehouseLabel} → ${toWarehouseLabel}`
                      : singleWarehouseLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {statusLabel ? (
                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${config.toneClassName}`}
                    >
                      {statusLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="px-5 py-6 text-[12px] text-black/50">
                Cargando detalle...
              </div>
            ) : error ? (
              <div className="px-5 py-6 text-[12px] text-rose-600">{error}</div>
            ) : (
              <div className="divide-y divide-black/8">
                <section className="px-4 py-3 sm:px-5">
                  <SectionTitle
                    icon={<ReceiptText className="h-4 w-4" />}
                    title="Resumen"
                    accentClassName={config.accentClassName}
                    meta={itemCountLabel}
                  />

                  <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                    <div className="divide-y divide-black/6">
                      <InfoRow
                        label={
                          resolvedDocument.docType === DocType.TRANSFER
                            ? "Origen"
                            : "Almacén"
                        }
                        value={
                          resolvedDocument.docType === DocType.TRANSFER
                            ? fromWarehouseLabel
                            : singleWarehouseLabel
                        }
                      />
                      {resolvedDocument.docType === DocType.TRANSFER ? (
                        <InfoRow label="Destino" value={toWarehouseLabel} />
                      ) : null}
                      <InfoRow
                        label="Creación"
                        value={formatDateTime(resolvedDocument.createdAt)}
                      />
                    </div>

                    <div className="divide-y divide-black/6">
                      <InfoRow
                        label="Posteo"
                        value={formatDateTime(resolvedDocument.postedAt)}
                      />
                      <InfoRow
                        label="Creado por"
                        value={
                          resolvedDocument.createdBy?.email ??
                          resolvedDocument.createdBy?.name ??
                          "-"
                        }
                      />
                      <InfoRow
                        label="Posteado"
                        value={
                          resolvedDocument.postedBy?.email ??
                          resolvedDocument.postedBy?.name ??
                          "-"
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className="px-4 py-3 sm:px-5">
                  <SectionTitle
                    icon={<Package className="h-4 w-4" />}
                    title="Items"
                    accentClassName={config.accentClassName}
                    meta={itemCountLabel}
                  />

                  <div className="mt-3 divide-y divide-black/6 border-t border-black/6">
                    {resolvedItems.length ? (
                      resolvedItems.map((item, index) => (
                        <div
                          key={item.id ?? item.skuId ?? `${index}`}
                          className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-black/80">
                              {getItemLabel(item)}
                            </p>
                            <p className="mt-1 text-[10px] text-black/45">
                              {getItemCode(item)}{" "}
                              {item.unitName ? `· ${item.unitName}` : ""}
                            </p>
                          </div>

                          <div className="sm:min-w-[160px] sm:text-right">
                            <p className="text-[10px] text-black/40">Cantidad</p>
                            <p className="mt-1 text-[12px] font-semibold text-black/78">
                              {Number.isFinite(Number(item.quantity ?? 0))
                                ? Number(item.quantity ?? 0)
                                : "-"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptySection message="No hay items registrados para este documento." />
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-6 text-[12px] text-black/50">
            No hay documento seleccionado.
          </div>
        )}
      </div>
    </Modal>
  );
}

