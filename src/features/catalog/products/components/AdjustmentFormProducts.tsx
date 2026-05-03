import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Trash2 } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SectionHeaderForm } from "@/shared/components/components/SectionHederForm";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { Headed } from "@/shared/components/components/Headed";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { listActive } from "@/shared/services/warehouseServices";
import { listDocumentSeries } from "@/shared/services/documentSeriesService";
import { createOutOrder, getStockSku } from "@/shared/services/documentService";
import { listSkus } from "@/shared/services/skuService";
import { findOwnUser } from "@/shared/services/userService";
import { useAuth } from "@/shared/hooks/useAuth";
import { subscribeInventoryStockUpdated } from "@/shared/services/inventoryRealtimeService";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { DocType, type WarehouseSelectOption } from "@/features/warehouse/types/warehouse";
import { ProductType, ProductTypes } from "@/features/catalog/types/ProductTypes";
import type { ListSkusResponse, ProductSkuWithAttributes } from "@/features/catalog/types/product";
import type { skuStock } from "@/features/catalog/types/documentInventory";
import { buildSkuLabelWithAttributes, buildStockSummary, emptyStockDetail, type StockDetailState } from "@/features/catalog/types/transfer";
import { CreateOutOrder, Direction } from "@/features/out-orders/type/outOrder";

export type AdjustmentFormProductsProps = {
  inModal?: boolean;
  open?: boolean;
  onClose?: () => void;
  loadDocuments?: () => void;
  onSaved?: (adjustmentId: string) => void | Promise<void>;
  type?: ProductType;
  initialSku?: {
    skuId: string;
    name?: string;
    backendSku?: string;
    customSku?: string | null;
  } | null;
};

type PendingAdjustmentItem = {
  skuId: string;
};

type DraftAdjustmentItem = {
  skuId: string;
  quantity: number;
};

type AdjustmentItemRow = {
  rowIndex: number;
  skuId: string;
  backendSku: string;
  customSku: string | null;
  name: string;
  unit: string;
  quantity: number;
};

const buildEmptyForm = (): CreateOutOrder => ({
  docType: DocType.ADJUSTMENT,
  serieId: "",
  warehouseId: "",
  note: "",
  items: [],
});

const buildEmptyPendingItem = (): PendingAdjustmentItem => ({
  skuId: "",
});

export default function AdjustmentFormProducts({
  inModal = true,
  open = true,
  onClose,
  onSaved,
  loadDocuments,
  type,
  initialSku,
}: AdjustmentFormProductsProps) {
  const { userId } = useAuth();
  const { showFlash, clearFlash } = useFlashMessage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateOutOrder>(() => buildEmptyForm());
  const [pendingItem, setPendingItem] = useState<PendingAdjustmentItem>(() => buildEmptyPendingItem());
  const [searchResults, setSearchResults] = useState<ListSkusResponse>();
  const [selectedSkus, setSelectedSkus] = useState<ProductSkuWithAttributes[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const skuSearchTimeoutRef = useRef<number | null>(null);
  const latestSkuQueryRef = useRef("");
  const [items, setItems] = useState<DraftAdjustmentItem[]>([]);
  const [stockDetail, setStockDetail] = useState<StockDetailState>(emptyStockDetail);
  const seededSkuRef = useRef<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("-");
  const [adjustmentCheck, setAdjustmentCheck] = useState<{
    loading: boolean;
    possible: boolean;
    reasons: string[];
  }>({
    loading: false,
    possible: false,
    reasons: [],
  });
  const [realtimeStockVersion, setRealtimeStockVersion] = useState(0);

  const resetForm = useCallback(() => {
    if (skuSearchTimeoutRef.current) {
      window.clearTimeout(skuSearchTimeoutRef.current);
      skuSearchTimeoutRef.current = null;
    }
    latestSkuQueryRef.current = "";
    setLoading(false);
    setForm(buildEmptyForm());
    setPendingItem(buildEmptyPendingItem());
    setSerie({ value: "", label: "" });
    setSearchResults(undefined);
    setSelectedSkus([]);
    setItems([]);
    setStockDetail(emptyStockDetail);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose?.();
    loadDocuments?.();
  }, [loadDocuments, onClose, resetForm]);

  const loadWarehouses = useCallback(async () => {
    clearFlash();
    try {
      const res = await listActive();
      const options =
        res?.map((s) => ({
          value: s.warehouseId,
          label: s.name,
        })) ?? [];
      setWarehouseOptions(options);
    } catch {
      setWarehouseOptions([]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  }, [clearFlash, showFlash]);

  const loadSeries = async (warehouseId: string) => {
    if (!warehouseId) {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      setStockDetail(emptyStockDetail);
      return;
    }

    try {
      const response = await listDocumentSeries({
        warehouseId,
        docType: DocType.ADJUSTMENT,
        isActive: true,
      });

      const seriesList = Array.isArray(response) ? response : response ? [response] : [];

      if (seriesList.length === 0) {
        setSerie({ value: "", label: "" });
        setForm((prev) => ({ ...prev, serieId: "" }));
        return;
      }

      const nextSerie = seriesList[0];
      const nextNumber = Number(nextSerie.nextNumber ?? 0);
      const paddedNumber = String(nextNumber).padStart(Number(nextSerie.padding ?? 0), "0");

      setSerie({
        value: nextSerie.id,
        label: `${nextSerie.code}${nextSerie.separator ?? "-"}${paddedNumber}`,
      });

      setForm((prev) => ({ ...prev, serieId: nextSerie.id }));
    } catch {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      showFlash(errorResponse("Error al cargar series"));
    }
  };

  const searchSkus = useCallback(async (skuQuery: string) => {
    const requestQuery = skuQuery.trim();
    try {
      const res = await listSkus({
        q: requestQuery || undefined,
        productType: type ?? ProductTypes.PRODUCT,
        isActive: true,
        page: 1,
        limit: 10,
      });

      if (latestSkuQueryRef.current.trim() !== requestQuery) return;
      setSearchResults(res);
    } catch {
      if (latestSkuQueryRef.current.trim() !== requestQuery) return;
      setSearchResults(undefined);
      showFlash(errorResponse("Error al cargar SKUs"));
    }
  }, [showFlash, type]);

  const handleSkuSearchChange = useCallback((text: string) => {
    latestSkuQueryRef.current = text;

    if (skuSearchTimeoutRef.current) {
      window.clearTimeout(skuSearchTimeoutRef.current);
    }

    const delay = text.trim() ? 350 : 0;
    skuSearchTimeoutRef.current = window.setTimeout(() => {
      skuSearchTimeoutRef.current = null;
      void searchSkus(latestSkuQueryRef.current);
    }, delay);
  }, [searchSkus]);

  const addItem = (skuId: string, quantity = 1) => {
    clearFlash();

    if (!skuId) {
      showFlash(errorResponse("Selecciona un SKU"));
      return;
    }

    if (quantity === 0) {
      showFlash(errorResponse("La cantidad no puede ser 0"));
      return;
    }

    const selected =
      (searchResults?.items ?? []).find((s) => s.sku.id === skuId) ??
      selectedSkus.find((s) => s.sku.id === skuId);

    if (!selected) {
      showFlash(errorResponse("SKU no encontrado"));
      return;
    }

    const alreadyAdded = items.some((item) => item.skuId === skuId);
    if (alreadyAdded) {
      showFlash(errorResponse("El SKU ya fue agregado"));
      return;
    }

    setItems((prev) => [...prev, { skuId, quantity }]);

    setSelectedSkus((prev) => {
      const exists = prev.some((s) => s.sku.id === selected.sku.id);
      return exists ? prev : [...prev, selected];
    });

    setPendingItem(buildEmptyPendingItem());
  };

  const removeItem = (skuId: string) => {
    setItems((prev) => prev.filter((item) => item.skuId !== skuId));
    setStockDetail((prev) => (prev.selectedSkuId === skuId ? emptyStockDetail : prev));
  };

  const updateItem = (skuId: string, patch: Partial<DraftAdjustmentItem>) => {
    setItems((prev) => prev.map((item) => (item.skuId === skuId ? { ...item, ...patch } : item)));
  };

  const totalItems = useMemo(() => items.length, [items]);
  const totalQuantity = useMemo(
    () => items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0),
    [items],
  );

  const itemRows = useMemo<AdjustmentItemRow[]>(() => {
    return items.map((item, index) => {
      const skuData = selectedSkus.find((s) => s.sku.id === item.skuId);

      return {
        rowIndex: index,
        skuId: item.skuId,
        backendSku: skuData?.sku.backendSku ?? "-",
        customSku: skuData?.sku.customSku ?? null,
        name: skuData ? buildSkuLabelWithAttributes(skuData) : "-",
        unit: skuData?.unit?.name ?? "-",
        quantity: item.quantity,
      };
    });
  }, [items, selectedSkus]);

  const columns = useMemo<DataTableColumn<AdjustmentItemRow>[]>(
    () => [
      {
        id: "name",
        header: "Nombre",
        cell: (row) => (
          <span className="text-black/70">{row.name}</span>
        ),
        headerClassName: "text-left w-[240px]",
        className: "text-black/70",
      },
      {
        id: "quantity",
        header: "Cantidad",
        stopRowClick: true,
        cell: (row) => (
          <FloatingInput
            label="Cantidad"
            name={`qty-${row.skuId}`}
            type="number"
            step="0.001"
            value={String(row.quantity)}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(e) => updateItem(row.skuId, { quantity: parseDecimalInput(e.target.value) })}
            className="h-8 text-[10px]"
          />
        ),
        headerClassName: "text-left w-[130px]",
        className: "text-black/70",
      },
      {
        id: "actions",
        header: "",
        stopRowClick: true,
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-600"
              onClick={() => removeItem(row.skuId)}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        headerClassName: "text-right w-[50px]",
        className: "text-right",
      },
    ],
    [],
  );

  const saveAdjustment = async () => {
    clearFlash();

    if (!form.warehouseId || !form.serieId) {
      showFlash(errorResponse("Completa los datos del documento"));
      return;
    }

    if (!items.length) {
      showFlash(errorResponse("Agrega al menos un item"));
      return;
    }
    if (adjustmentCheck.loading) {
      showFlash(errorResponse("Validando ajuste..."));
      return;
    }
    if (!adjustmentCheck.possible) {
      showFlash(errorResponse(adjustmentCheck.reasons[0] ?? "No es posible realizar el ajuste"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
      ...form,
        items: items.map(item => ({
          skuId: item.skuId,
          quantity: Math.abs(item.quantity),
          direction: item.quantity < 0 ? Direction.OUT : Direction.IN,
        }))
      };

      const res = await createOutOrder(payload);
      const adjustmentId = res?.documentId ?? res.docId ?? "";
      showFlash(successResponse("Ajuste registrado en borrador"));

      if (adjustmentId) {
        await onSaved?.(adjustmentId);
      }
      handleClose();
    } catch {
      showFlash(errorResponse("Error al guardar el ajuste"));
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (row: AdjustmentItemRow) => {
    if (!form.warehouseId) {
      showFlash(errorResponse("Selecciona el almacén"));
      return;
    }

    if (!row.skuId) {
      showFlash(errorResponse("No se encontró el SKU seleccionado"));
      return;
    }

    const skuData = selectedSkus.find((s) => s.sku.id === row.skuId);
    if (!skuData) {
      showFlash(errorResponse("No se encontró el SKU seleccionado"));
      return;
    }

    setStockDetail({
      loading: true,
      error: null,
      selectedSkuId: row.skuId,
      from: null,
      to: null,
    });

    try {
      const fromStock = (await getStockSku({
        warehouseId: form.warehouseId,
        skuId: row.skuId,
      })) as skuStock;

      setStockDetail({
        loading: false,
        error: null,
        selectedSkuId: row.skuId,
        from: buildStockSummary(skuData, fromStock),
        to: null,
      });
    } catch {
      setStockDetail({
        loading: false,
        error: "Error al obtener stock",
        selectedSkuId: row.skuId,
        from: buildStockSummary(skuData, null),
        to: null,
      });
    }
  };

  useEffect(() => {
    if (open) return;
    if (skuSearchTimeoutRef.current) {
      window.clearTimeout(skuSearchTimeoutRef.current);
      skuSearchTimeoutRef.current = null;
    }
    latestSkuQueryRef.current = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    seededSkuRef.current = null;
    resetForm();
    void loadWarehouses();
    latestSkuQueryRef.current = "";
    void searchSkus("");
  }, [loadWarehouses, open, resetForm, searchSkus]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadCurrentUser = async () => {
      try {
        const response = await findOwnUser();
        const user = "data" in response ? response.data : response;
        const name = user?.name?.trim() || "-";
        if (!cancelled) {
          setCurrentUserName(name);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserName("-");
        }
      }
    };

    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  useEffect(() => {
    let cancelled = false;
    const validateAdjustment = async () => {
      if (!form.warehouseId) {
        setAdjustmentCheck({
          loading: false,
          possible: false,
          reasons: ["Selecciona almacén"],
        });
        return;
      }
      if (!items.length) {
        setAdjustmentCheck({
          loading: false,
          possible: false,
          reasons: ["Agrega al menos un SKU"],
        });
        return;
      }

      setAdjustmentCheck((prev) => ({ ...prev, loading: true }));
      const reasons: string[] = [];

      await Promise.all(
        items.map(async (item) => {
          const skuData = selectedSkus.find((s) => s.sku.id === item.skuId);
          const skuLabel = skuData?.sku.name || skuData?.sku.backendSku || item.skuId;
          const qty = Number(item.quantity) || 0;

          if (qty === 0) {
            reasons.push(`La cantidad para ${skuLabel} no puede ser 0`);
            return;
          }

          if (qty < 0) {
            try {
              const stock = await getStockSku({
                warehouseId: form.warehouseId,
                skuId: item.skuId,
              });
              const available = Number(stock?.available ?? 0);
              const requested = Math.abs(qty);
              if (available <= 0 || available < requested) {
                reasons.push(`Stock de ${skuLabel} no es suficiente para el ajuste`);
              }
            } catch {
              reasons.push(`No se pudo validar stock de ${skuLabel}`);
            }
          }
        }),
      );

      if (!cancelled) {
        setAdjustmentCheck({
          loading: false,
          possible: reasons.length === 0,
          reasons,
        });
      }
    };

    void validateAdjustment();
    return () => {
      cancelled = true;
    };
  }, [form.warehouseId, items, selectedSkus, realtimeStockVersion]);

  useEffect(() => {
    if (!open) return;
    const unsubscribe = subscribeInventoryStockUpdated((event) => {
      if (!form.warehouseId || event.warehouseId !== form.warehouseId) return;
      setRealtimeStockVersion((current) => current + 1);
    }, {
      warehouseIds: form.warehouseId ? [form.warehouseId] : undefined,
    });
    return unsubscribe;
  }, [open, form.warehouseId]);

  useEffect(() => {
    if (!open || !initialSku?.skuId) return;
    if (seededSkuRef.current === initialSku.skuId) return;
    seededSkuRef.current = initialSku.skuId;

    setSelectedSkus((prev) => {
      if (prev.some((item) => item.sku.id === initialSku.skuId)) return prev;
      return [
        ...prev,
        {
          sku: {
            id: initialSku.skuId,
            name: initialSku.name ?? initialSku.backendSku ?? "Producto",
            backendSku: initialSku.backendSku ?? "",
            customSku: initialSku.customSku ?? null,
          },
          attributes: [],
          unit: null,
        },
      ];
    });

    setItems((prev) => {
      if (prev.some((item) => item.skuId === initialSku.skuId)) return prev;
      return [...prev, { skuId: initialSku.skuId, quantity: 1 }];
    });
  }, [initialSku, open]);

  const warehouseName = warehouseOptions.find((option) => option.value === form.warehouseId)?.label ?? "-";
  const selectedRowId = stockDetail.selectedSkuId;

  const viewportHeightClasses = inModal ? "h-[80vh]" : "h-[calc(100vh-64px)]";

  const content = (
    <>
      <div className={inModal ? "w-full" : "h-screen w-full py-0"}>
        {!inModal ? (
          <div className="pt-2">
            <Headed
              title="Ajuste de productos terminados"
              subtitle="Al reducir stock solo puedes reducir hasta dejarlo en (0)."
              size="lg"
            />
          </div>
        ) : null}

        <div className={`py-4 grid grid-cols-1 gap-3 lg:grid-cols-[6fr_2.5fr] ${viewportHeightClasses}`}>
          <section className="overflow-hidden flex flex-col gap-3">
            <div className="p-3">
              <SectionHeaderForm icon={Boxes} title="Productos" />

              <div className="mt-3 grid grid-cols-1 gap-2">
                <FloatingSelect
                  label="Producto"
                  name="adjustment-sku"
                  value={pendingItem.skuId}
                  options={(searchResults?.items ?? []).map((item) => ({
                    value: item.sku.id,
                    label: buildSkuLabelWithAttributes(item),
                  }))}
	                  onChange={(value) => {
	                    if (!value) {
	                      setPendingItem(buildEmptyPendingItem());
	                      return;
	                    }
	                    setPendingItem({ skuId: value });
	                    addItem(value, 1);
	                  }}
                  searchable
                  searchPlaceholder="Buscar producto..."
                  emptyMessage="Sin productos"
                  onSearchChange={handleSkuSearchChange}
                  className="h-12"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 py-0">
              <DataTable
                tableId="adjustment-products-items"
                data={itemRows}
                columns={columns}
                rowKey="skuId"
                responsiveCards
                emptyMessage="Aún no agregas items."
                animated={false}
                tableClassName="text-[11px]"
                onRowClick={handleRowClick}
                rowClassName={(row) => (row.skuId === selectedRowId ? "bg-primary/5" : undefined)}
              />
            </div>

            <div className="px-3 sm:px-4 py-3">
              <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3">
                <div className="space-y-1 text-[11px] text-black/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>Items</span>
                    <span className="font-semibold text-black tabular-nums">{totalItems}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>Cantidad total</span>
                    <span className="font-semibold text-black tabular-nums">{totalQuantity}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="overflow-hidden flex flex-col border-0 border-black/10 lg:border-l">
            <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <FloatingSelect
                  label="Almacén"
                  name="adjustment-warehouse"
                  value={form.warehouseId ?? ""}
                  options={warehouseOptions}
                  onChange={(value) => {
                    setForm((prev) => ({
                      ...prev,
                      warehouseId: value,
                      serieId: "",
                    }));
                    setStockDetail(emptyStockDetail);
                    void loadSeries(value);
                  }}
                  className="h-11 w-full text-xs"
                  searchable
                />

                <FloatingInput
                  label="Serie"
                  name="adjustment-serie"
                  value={serie.label}
                  disabled
                  className="h-11 w-full text-xs text-black/90"
                />

                <div className="col-span-2 w-full">
                  <FloatingInput
                    label="Nota"
                    name="adjustment-note"
                    value={form.note ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
                    }
                    className="h-11 w-full text-xs"
                  />
                </div>
              </div>

              <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3 mt-2">
                <p className="text-[11px] font-semibold text-black">Resumen</p>

                <div className="mt-2 space-y-1 text-[11px] text-black/70">
                  <div className="flex items-center justify-between gap-3">
                    <span>Items</span>
                    <span className="font-semibold tabular-nums text-right">{totalItems}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Cantidad total</span>
                    <span className="font-semibold tabular-nums text-right">{totalQuantity}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Usuario</span>
                    <span className="font-semibold text-right">{currentUserName}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Almacén</span>
                    <span className="font-semibold text-right">{warehouseName}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Ajuste</span>
                    <span className="font-semibold tabular-nums text-right">
                      {adjustmentCheck.loading ? "Validando..." : adjustmentCheck.possible ? "Posible" : "No posible"}
                    </span>
                  </div>

                  {!adjustmentCheck.loading && adjustmentCheck.reasons.length > 0 ? (
                    <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700">
                      {adjustmentCheck.reasons[0]}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="flex gap-2">
                <SystemButton
                  className="flex-1"
                  disabled={
                    loading ||
                    adjustmentCheck.loading ||
                    !adjustmentCheck.possible ||
                    !form.warehouseId ||
                    !form.serieId ||
                    !items.length
                  }
                  onClick={saveAdjustment}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </SystemButton>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nuevo ajuste"
      bodyClassName="p-0"
    >
      {content}
    </Modal>
  );
}
