import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import type { SaleOrderItemComponentInput, SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { getStockSku } from "@/shared/services/documentService";
import type { skuStock } from "@/features/catalog/types/documentInventory";
import { getSku } from "@/shared/services/skuService";
import { getSaleOrderItemComponents } from "@/shared/services/saleOrderService";
import { parseApiError } from "@/shared/common/utils/handleApiError";

type Props = {
  open: boolean;
  onClose: () => void;
  warehouseId?: string;
  item: SaleOrderItemInput | null;
  showStock?: boolean;
};

type SkuDetail = Awaited<ReturnType<typeof getSku>>;

type SkuData = {
  name?: string | null;
  backendSku?: string | null;
  customSku?: string | null;
  image?: string | null;
  attributes?: Array<{ value?: string | null }>;
};

const formatStock = (value?: number | null) => {
  if (value == null) return "-";
  if (!Number.isFinite(value)) return String(value);
  return value.toLocaleString("es-PE", { maximumFractionDigits: 3 });
};

const formatSkuAttrs = (attributes?: Array<{ value?: string | null }> | null) => {
  return (attributes ?? [])
    .map((attr) => (attr.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
};

const normalizeSku = (sku: SkuDetail | null | undefined): SkuData => {
  const data = sku as unknown as {
    sku?: {
      name?: string | null;
      backendSku?: string | null;
      customSku?: string | null;
      image?: string | null;
    } | null;
    attributes?: Array<{ value?: string | null }>;
  } | null | undefined;

  return {
    name: data?.sku?.name ?? null,
    backendSku: data?.sku?.backendSku ?? null,
    customSku: data?.sku?.customSku ?? null,
    image: data?.sku?.image ?? null,
    attributes: data?.attributes ?? [],
  };
};

const buildSkuLabel = (sku: SkuDetail | null | undefined, fallback = "SKU") => {
  const data = normalizeSku(sku);

  const name = (data.name ?? "").trim();
  const attrsText = formatSkuAttrs(data.attributes);
  const skuPart = data.backendSku ? ` -${data.backendSku}` : "";
  const customPart = data.customSku ? ` (${data.customSku})` : "";
  const attrsPart = attrsText ? ` ${attrsText}` : "";

  const label = `${name}${attrsPart}${skuPart}${customPart}`.trim();

  return label || fallback;
};

const buildComponentSkuLabel = (sku: {
  name?: string | null;
  backendSku?: string | null;
  customSku?: string | null;
}) => {
  const name = (sku.name ?? "").trim();
  const skuPart = sku.backendSku ? ` -${sku.backendSku}` : "";
  const customPart = sku.customSku ? ` (${sku.customSku})` : "";

  return `${name}${skuPart}${customPart}`.trim();
};

const getSkuImage = (sku: SkuDetail | null | undefined) => {
  const data = normalizeSku(sku);
  return data.image ?? null;
};

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">{message}</div>;
}

export function SaleOrderItemComponentsStockModal({ open, onClose, warehouseId, item, showStock = true }: Props) {
  const [loadedComponents, setLoadedComponents] = useState<SaleOrderItemComponentInput[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [componentsError, setComponentsError] = useState<string | null>(null);

  const components = useMemo<SaleOrderItemComponentInput[]>(() => {
    if (item?.components?.length) return item.components;
    return loadedComponents;
  }, [item?.components, loadedComponents]);

  const shouldShowStock = Boolean(showStock && warehouseId);

  const [stocksBySkuId, setStocksBySkuId] = useState<Record<string, skuStock | null>>({});
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [skuById, setSkuById] = useState<Record<string, SkuDetail | null>>({});
  const [loadingSku, setLoadingSku] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);

  const hasComponents = components.length > 0;

  const uniqueSkuIds = useMemo(() => {
    const values = components
      .map((component) => component.skuId ?? component.sku?.id ?? "")
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [components]);

  useEffect(() => {
    if (!open) {
      setLoadedComponents([]);
      setLoadingComponents(false);
      setComponentsError(null);

      setStocksBySkuId({});
      setLoadingStock(false);
      setStockError(null);

      setSkuById({});
      setLoadingSku(false);
      setSkuError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const itemId = item?.id;

    if (!itemId || item?.components?.length) {
      setLoadedComponents([]);
      setLoadingComponents(false);
      setComponentsError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoadingComponents(true);
      setComponentsError(null);

      try {
        const response = await getSaleOrderItemComponents(itemId);
        const found = response.items.find((row) => row.saleOrderItemId === itemId);

        const nextComponents: SaleOrderItemComponentInput[] = (found?.components ?? []).map((component) => ({
          skuId: component.sku.id,
          skuLabel: buildComponentSkuLabel(component.sku),
          quantity: Number(component.quantity ?? 0),
          unitPrice: Number(component.unitPrice ?? 0),
          total: Number(component.total ?? 0),
          referencePackItemId: component.referencePackItemId ?? undefined,
        }));

        if (!cancelled) setLoadedComponents(nextComponents);
      } catch (err) {
        if (!cancelled) {
          setLoadedComponents([]);
          setComponentsError(parseApiError(err, "No se pudieron cargar los componentes del item."));
        }
      } finally {
        if (!cancelled) setLoadingComponents(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, item?.id, item?.components]);

  useEffect(() => {
    if (!open || !uniqueSkuIds.length) {
      setSkuById({});
      setLoadingSku(false);
      setSkuError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoadingSku(true);
      setSkuError(null);

      try {
        const pairs = await Promise.all(
          uniqueSkuIds.map(async (skuId) => {
            try {
              const data = await getSku(skuId);
              return [skuId, data] as const;
            } catch {
              return [skuId, null] as const;
            }
          }),
        );

        if (!cancelled) setSkuById(Object.fromEntries(pairs));
      } catch (err) {
        if (!cancelled) {
          setSkuById({});
          setSkuError(parseApiError(err, "No se pudo cargar la información de los SKU."));
        }
      } finally {
        if (!cancelled) setLoadingSku(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, uniqueSkuIds]);

  useEffect(() => {
    if (!open) return;

    if (!shouldShowStock || !hasComponents) {
      setStocksBySkuId({});
      setLoadingStock(false);
      setStockError(null);
      return;
    }

    const warehouseIdValue = warehouseId;
    if (!warehouseIdValue) return;

    let cancelled = false;

    const run = async () => {
      setLoadingStock(true);
      setStockError(null);

      try {
        const pairs = await Promise.all(
          uniqueSkuIds.map(async (skuId) => {
            try {
              const data = await getStockSku({ warehouseId: warehouseIdValue, skuId });
              return [skuId, data] as const;
            } catch {
              return [skuId, null] as const;
            }
          }),
        );

        if (!cancelled) setStocksBySkuId(Object.fromEntries(pairs));
      } catch (err) {
        if (!cancelled) {
          setStocksBySkuId({});
          setStockError(parseApiError(err, "No se pudo cargar el stock."));
        }
      } finally {
        if (!cancelled) setLoadingStock(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, shouldShowStock, hasComponents, uniqueSkuIds, warehouseId]);

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl" bodyClassName="p-0 overflow-hidden" title="Detalle">
      {!item ? (
        <div className="px-5 py-8 text-center text-xs text-black/50">No hay item seleccionado.</div>
      ) : (
        <div className="bg-white">
          <header className="border-b border-black/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">Item</p>
                <h3 className="mt-0.5 truncate text-md font-semibold text-black/85">{item.description ?? "—"}</h3>
              </div>
            </div>
          </header>

          <div className="max-h-[calc(80vh-6rem)] scroll-area scrollbar-panel overflow-y-auto bg-gray-100/90 px-4 py-3">
            {loadingComponents ? (
              <div className="px-5 py-8 text-center text-xs text-black/50">Cargando componentes...</div>
            ) : !hasComponents ? (
              <EmptyState message="Este item no tiene componentes." />
            ) : (
              <>
                {showStock && !warehouseId ? (
                  <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Selecciona un almacén para ver stock.
                  </div>
                ) : null}

                {componentsError ? (
                  <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{componentsError}</div>
                ) : null}

                {stockError ? <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{stockError}</div> : null}

                {skuError ? <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{skuError}</div> : null}

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {components.map((component, index) => {
                    const skuId = component.skuId ?? component.sku?.id ?? "";
                    const sku = skuId ? skuById[skuId] ?? null : null;
                    const stock = skuId ? stocksBySkuId[skuId] ?? null : null;

                    const label = buildSkuLabel(sku, component.skuLabel || "Cargando SKU...");
                    const image = getSkuImage(sku) ?? component.skuImage ?? null;

                    const stockValue = (value?: number | null) => {
                      if (!shouldShowStock) return null;
                      if (loadingStock) return "…";
                      return formatStock(value);
                    };

                    return (
                      <div
                        key={`${skuId || "unknown"}-${index}`}
                        className="w-full overflow-hidden rounded-xl border border-black/5 bg-white px-3 py-2"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="h-30 w-full overflow-hidden rounded-md bg-slate-100">
                            {image ? (
                              <img
                                src={image}
                                alt={label}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-md font-semibold text-black/80">
                              {loadingSku && !sku ? "Cargando SKU..." : label}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 rounded-lg bg-slate-50 px-2 py-2">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-black/35">Cant.</p>
                              <p className="text-sm font-semibold text-black/80 tabular-nums">
                                {Number(component.quantity ?? 0).toLocaleString("es-PE", { maximumFractionDigits: 3 })}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-black/35">Precio</p>
                              <p className="text-sm font-semibold text-black/80 tabular-nums">
                                {Number(component.unitPrice ?? 0).toFixed(2)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-black/35">Total</p>
                              <p className="text-sm font-semibold text-black/80 tabular-nums">
                                {Number(component.total ?? 0).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {showStock ? (
                            <div className="mt-2 border-t border-black/5 pt-2">
                              <div className="mb-1 flex items-center justify-between">
                                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-black/45">Stock</p>
                                {loadingStock && shouldShowStock ? (
                                  <span className="text-[10px] text-black/35">Cargando...</span>
                                ) : null}
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-black/35">Total</p>
                                  <p className="text-sm font-semibold text-black/80 tabular-nums">
                                    {stockValue(stock?.onHand) ?? "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-black/35">Disponible</p>
                                  <p className="text-sm font-semibold text-black/80 tabular-nums">
                                    {stockValue(stock?.available) ?? "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-black/35">Reserva</p>
                                  <p className="text-sm font-semibold text-black/80 tabular-nums">
                                    {stockValue(stock?.reserved) ?? "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
