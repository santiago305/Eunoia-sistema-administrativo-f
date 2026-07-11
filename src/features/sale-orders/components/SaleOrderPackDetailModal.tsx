  import { useEffect, useMemo, useState, type ReactNode } from "react";
  import { Package } from "lucide-react";
  import { Modal } from "@/shared/components/modales/Modal";
  import { parseApiError } from "@/shared/common/utils/handleApiError";
  import { getPackById } from "@/shared/services/packService";
  import type { PackDetailResponse } from "@/features/catalog/types/pack";
  import { getSaleOrderStocksBySkuIds } from "@/features/sale-orders/services/saleOrderStockService";
  import type { skuStock } from "@/features/catalog/types/documentInventory";

  type Props = {
    open: boolean;
    packId: string | null;
    warehouseId?: string | null;
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
          <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/55">{title}</h4>
        </div>
        {meta ? <span className="text-[11px] text-black/40">{meta}</span> : null}
      </div>
    );
  }

  function EmptyState({ message }: { message: string }) {
    return <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">{message}</div>;
  }

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

  const getItemCode = (item: PackDetailResponse["items"][number]) => item.sku?.backendSku ?? item.sku?.customSku ?? item.skuId ?? "-";

  export function SaleOrderPackDetailModal({ open, packId, warehouseId, onClose, primaryColor }: Props) {
    const [detail, setDetail] = useState<PackDetailResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [stockBySkuId, setStockBySkuId] = useState<Record<string, skuStock | null>>({});
    const [stockLoading, setStockLoading] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);

    useEffect(() => {
      if (!open || !packId) {
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
    const itemCountLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;

    const statusLabel = pack ? (pack.isActive ? "Activo" : "Inactivo") : null;
    const statusBadgeClassName = pack?.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";

    const iconClassName = useMemo(() => {
      if (!primaryColor) return "bg-slate-100 text-slate-700";
      return "bg-slate-100 text-slate-700";
    }, [primaryColor]);

    useEffect(() => {
      if (!open || !detail || !packId || !warehouseId) {
        setStockBySkuId({});
        setStockLoading(false);
        setStockError(null);
        return;
      }

      let cancelled = false;

      const run = async () => {
        setStockLoading(true);
        setStockError(null);
        try {
          const skuIds = Array.from(
            new Set((detail.items ?? []).map((item) => item.skuId).filter(Boolean)),
          ).sort();
          const stocks = await getSaleOrderStocksBySkuIds({
            warehouseId,
            skuIds,
          });

          if (cancelled) return;
          setStockBySkuId(stocks);
        } catch (err) {
          if (cancelled) return;
          setStockBySkuId({});
          setStockError(parseApiError(err, "No se pudo cargar el stock."));
        } finally {
          if (!cancelled) setStockLoading(false);
        }
      };

      void run();

      return () => {
        cancelled = true;
      };
    }, [detail, open, packId, warehouseId]);

    return (
      <Modal open={open} onClose={onClose} title="Detalle de pack" className="w-[840px]" bodyClassName="p-0 overflow-hidden">
        {!packId ? (
          <div className="px-5 py-8 text-center text-xs text-black/50">No hay pack seleccionado.</div>
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
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">Pack</p>
                      {statusLabel ? (
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${statusBadgeClassName}`}>
                          {statusLabel}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-0.5 truncate text-md font-semibold text-black/85">{pack?.description ?? "—"}</h3>
                    {warehouseId ? (
                      <p className="mt-0.5 text-xs text-black/40">Stock según almacén seleccionado</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-black/40">Selecciona un almacén para ver stock</p>
                    )}
                  </div>
                </div>

                {pack ? (
                  <div className="shrink-0 text-center">
                    <p className="text-xs uppercase tracking-wide text-black/35">Total</p>
                    <p className="text-lg font-semibold text-black/75">{formatMoney(pack.total)}</p>
                  </div>
                ) : null}
              </div>
            </header>

            {loading ? (
              <div className="px-5 py-8 text-center text-xs text-black/50">Cargando detalle...</div>
            ) : error ? (
              <div className="px-5 py-8 text-center text-xs text-rose-600">{error}</div>
            ) : !pack ? (
              <div className="px-5 py-8 text-center text-xs text-black/50">No hay pack seleccionado.</div>
            ) : (
              <div className="max-h-[calc(80vh-6rem)] space-y-4 overflow-y-auto px-4 py-3">
                <section>
                  <SectionHeader icon={<Package className="h-3.5 w-3.5" />} title="Items" meta={itemCountLabel} />

                  {stockError ? (
                    <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{stockError}</div>
                  ) : null}

                  {items.length ? (
                    <div className="mt-5 grid grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((item, index) => {
                        const stock = warehouseId ? stockBySkuId[item.skuId] ?? null : null;
                        return (
                          <div
                            key={item.id ?? `${item.skuId}-${index}`}
                            className="w-full max-w-[260px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="h-[170px] overflow-hidden bg-slate-100">
                              {item.sku?.image ? (
                                <img
                                  src={item.sku.image ?? undefined}
                                  alt={getItemLabel(item)}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-8 w-8 text-slate-400" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 p-3">
                              <div>
                                <p className="line-clamp-2 text-sm font-semibold text-black/80">{getItemLabel(item)}</p>
                                <p className="mt-1 truncate text-xs text-black/40">{getItemCode(item)}</p>
                              </div>

                              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-black/35">Cant.</p>
                                  <p className="text-sm font-semibold text-black/80">{Number.isFinite(item.quantity) ? item.quantity : "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-black/35">Precio</p>
                                  <p className="text-sm font-semibold text-black/80">{formatMoney(item.price)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-black/35">Total</p>
                                  <p className="text-sm font-semibold text-black/80">{formatMoney(item.lineTotal)}</p>
                                </div>
                              </div>

                              {warehouseId ? (
                                <div className="grid grid-cols-3 gap-2 rounded-xl border border-black/5 bg-white p-2 text-center">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide text-black/35">Total</p>
                                    <p className="text-sm font-semibold text-black/80">{stockLoading ? "..." : stock ? stock.onHand : "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide text-black/35">Disp.</p>
                                    <p className="text-sm font-semibold text-black/80">{stockLoading ? "..." : stock ? stock.available : "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide text-black/35">Reserv.</p>
                                    <p className="text-sm font-semibold text-black/80">{stockLoading ? "..." : stock ? stock.reserved : "-"}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-md bg-slate-50 px-3 py-2 text-center text-xs text-black/45">
                                  Selecciona un almacen para ver stock.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

