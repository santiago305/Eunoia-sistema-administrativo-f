import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Package } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { getPackById } from "@/shared/services/packService";
import type { PackDetailResponse } from "@/features/catalog/types/pack";

type Props = {
  open: boolean;
  packId: string | null;
  onClose: () => void;
  primaryColor?: string;
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

const formatMoney = (value?: number | null) => {
  if (value == null) return "-";
  if (!Number.isFinite(value)) return String(value);
  return value.toFixed(2);
};

const getItemLabel = (item: PackDetailResponse["items"][number]) => {
  const name = item.sku?.name?.trim() || "SKU";
  const attrsText = (item.sku?.attributes ?? [])
    .map((attr) => (attr.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  return `${name}${attrsPart}`.trim() || item.skuId;
};

const getItemCode = (item: PackDetailResponse["items"][number]) => {
  return item.sku?.backendSku ?? item.sku?.customSku ?? item.skuId ?? "-";
};

export function ModalDetailPack({ open, packId, onClose, primaryColor }: Props) {
  const [detail, setDetail] = useState<PackDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!packId) {
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
        const response = await getPackById(packId);
        if (cancelled) return;
        setDetail(response);
      } catch (err) {
        if (cancelled) return;
        setDetail(null);
        setError(parseApiError(err, "No se pudo cargar el pack."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, packId]);

  const pack = detail?.pack ?? null;
  const items = detail?.items ?? [];

  const statusLabel = pack ? (pack.isActive ? "Activo" : "Inactivo") : null;
  const statusBadgeClassName = pack?.isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";

  const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;

  const iconClassName = useMemo(() => {
    if (!primaryColor) return "bg-slate-100 text-slate-700";
    return "bg-slate-100 text-slate-700";
  }, [primaryColor]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de pack"
      className="max-h-[70vh]"
      bodyClassName="p-0 overflow-hidden"
    >
      {!packId ? (
        <div className="px-5 py-8 text-center text-xs text-black/50">
          No hay pack seleccionado.
        </div>
      ) : (
        <div className="bg-white">
          <header className="border-b border-black/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconClassName}`}>
                  <Package className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">
                      Pack
                    </p>
                    {statusLabel ? (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${statusBadgeClassName}`}
                      >
                        {statusLabel}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-0.5 truncate text-sm font-semibold text-black/85">
                    {pack?.description ?? "—"}
                  </h3>
                </div>
              </div>

              {pack ? (
                <div className="shrink-0 text-center">
                  <p className="text-[9px] uppercase tracking-wide text-black/35">
                    Total
                  </p>
                  <p className="text-xs font-semibold text-black/75">
                    {formatMoney(pack.total)}
                  </p>
                </div>
              ) : null}
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
          ) : !pack ? (
            <div className="px-5 py-8 text-center text-xs text-black/50">
              No hay pack seleccionado.
            </div>
          ) : (
            <div className="max-h-[calc(80vh-6rem)] space-y-4 overflow-y-auto px-4 py-3">
              <section>
                <SectionHeader icon={<Package className="h-3.5 w-3.5" />} title="Resumen" />
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-2">
                  <FieldItem label="Creación" value={formatDateTime(pack.createdAt)} />
                  <FieldItem label="Actualización" value={formatDateTime(pack.updatedAt)} />
                </div>
              </section>

              <section>
                <SectionHeader icon={<Package className="h-3.5 w-3.5" />} title="Items" meta={itemCountLabel} />

                {items.length ? (
                  <div className="overflow-hidden rounded-md border border-black/5">
                    {items.map((item, index) => (
                      <div
                        key={item.id ?? `${item.skuId}-${index}`}
                        className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-black/80">
                            {getItemLabel(item)}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-black/40">
                            {getItemCode(item)}
                          </p>
                        </div>

                        <div className="grid shrink-0 grid-cols-3 gap-3 text-right">
                          <div>
                            <p className="text-[9px] uppercase tracking-wide text-black/35">
                              Cant.
                            </p>
                            <p className="text-xs font-semibold text-black/80">
                              {Number.isFinite(item.quantity) ? item.quantity : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wide text-black/35">
                              Precio
                            </p>
                            <p className="text-xs font-semibold text-black/80">
                              {formatMoney(item.price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wide text-black/35">
                              Importe
                            </p>
                            <p className="text-xs font-semibold text-black/80">
                              {formatMoney(item.lineTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No hay items registrados." />
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
