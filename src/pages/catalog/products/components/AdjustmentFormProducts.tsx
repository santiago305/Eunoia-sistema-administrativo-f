import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Trash2 } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { Modal } from "@/components/modales/Modal";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { Headed } from "@/components/Headed";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { createOutOrder, getStockSku } from "@/services/documentService";
import { listSkus } from "@/services/skuService";
import { money, parseDecimalInput } from "@/utils/functionPurchases";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import { ProductType } from "@/pages/catalog/types/ProductTypes";
import type { ListSkusResponse, ProductSkuWithAttributes } from "@/pages/catalog/types/product";
import { AdjustmentItemModal } from "@/pages/catalog/products/components/AdjustmentItemModal";
import { AdjustmentResultModal } from "@/pages/catalog/products/components/AdjustmentResultModal";
import type { skuStock } from "@/pages/catalog/types/documentInventory";
import { buildSkuLabelWithAttributes, buildStockSummary, emptyStockDetail, type StockDetailState } from "@/pages/catalog/types/transfer";
import { CreateOutOrder } from "@/pages/out-orders/type/outOrder";

const CURRENCY = "PEN";

export type AdjustmentFormProductsProps = {
  inModal?: boolean;
  open?: boolean;
  onClose?: () => void;
  loadDocuments?: () => void;
  onSaved?: (adjustmentId: string) => void | Promise<void>;
  type?: ProductType,
};

type PendingAdjustmentItem = {
  skuId: string;
  quantity: number;
  adjustmentType?: string;
};

type DraftAdjustmentItem = PendingAdjustmentItem;

type AdjustmentItemRow = {
  rowIndex: number;
  skuId: string;
  backendSku: string;
  customSku: string | null;
  name: string;
  unit: string;
  adjustmentType?: string;
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
  quantity: 0,
  adjustmentType: "",
});

export default function AdjustmentFormProducts({
  inModal = true,
  open = true,
  onClose,
  onSaved,
  loadDocuments,
  type,
}: AdjustmentFormProductsProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateOutOrder>(() => buildEmptyForm());
  const [pendingItem, setPendingItem] = useState<PendingAdjustmentItem>(() => buildEmptyPendingItem());
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [lastSavedAdjustmentId, setLastSavedAdjustmentId] = useState("");
  const [searchResults, setSearchResults] = useState<ListSkusResponse>();
  const [selectedSkus, setSelectedSkus] = useState<ProductSkuWithAttributes[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const skuSearchTimeoutRef = useRef<number | null>(null);
  const latestSkuQueryRef = useRef("");
  const [items, setItems] = useState<DraftAdjustmentItem[]>([]);
  const [stockDetail, setStockDetail] = useState<StockDetailState>(emptyStockDetail);

  const resetForm = useCallback(() => {
    if (skuSearchTimeoutRef.current) {
      window.clearTimeout(skuSearchTimeoutRef.current);
      skuSearchTimeoutRef.current = null;
    }
    latestSkuQueryRef.current = "";
    setLoading(false);
    setForm(buildEmptyForm());
    setPendingItem(buildEmptyPendingItem());
    setOpenItemModal(false);
    setOpenNavigateModal(false);
    setLastSavedAdjustmentId("");
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
        q: requestQuery,
        productType: type,
        isActive: true,
        page: 1,
        limit: 50,
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

    skuSearchTimeoutRef.current = window.setTimeout(() => {
      skuSearchTimeoutRef.current = null;

      const trimmed = latestSkuQueryRef.current.trim();
      if (!trimmed) {
        setSearchResults(undefined);
        return;
      }

      void searchSkus(trimmed);
    }, 500);
  }, [searchSkus]);

  const addItem = () => {
    clearFlash();

    const { skuId, quantity, adjustmentType } = pendingItem;

    if (!skuId) {
      showFlash(errorResponse("Selecciona un SKU"));
      return false;
    }

    if (!adjustmentType) {
      showFlash(errorResponse("Selecciona el tipo de ajuste"));
      return false;
    }

    if (quantity === 0) {
      showFlash(errorResponse("La cantidad no puede ser 0"));
      return false;
    }

    const selected =
      (searchResults?.items ?? []).find((s) => s.sku.id === skuId) ??
      selectedSkus.find((s) => s.sku.id === skuId);

    if (!selected) {
      showFlash(errorResponse("SKU no encontrado"));
      return false;
    }

    const alreadyAdded = items.some((item) => item.skuId === skuId);
    if (alreadyAdded) {
      showFlash(errorResponse("El SKU ya fue agregado"));
      return false;
    }

    setItems((prev) => [...prev, { skuId, quantity, adjustmentType }]);

    setSelectedSkus((prev) => {
      const exists = prev.some((s) => s.sku.id === selected.sku.id);
      return exists ? prev : [...prev, selected];
    });

    setPendingItem(buildEmptyPendingItem());
    return true;
  };

  const removeItem = (skuId: string) => {
    setItems((prev) => prev.filter((item) => item.skuId !== skuId));
    setStockDetail((prev) => (prev.selectedSkuId === skuId ? emptyStockDetail : prev));
  };

  const updateItem = (skuId: string, patch: Partial<DraftAdjustmentItem>) => {
    setItems((prev) => prev.map((item) => (item.skuId === skuId ? { ...item, ...patch } : item)));
  };

  const totalCost = useMemo(() => {
    return 0;
  }, []);

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
        adjustmentType: item.adjustmentType,
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
        id: "type",
        header: "Tipo",
        cell: (row) => <span className="text-black/70">{row.adjustmentType || "-"}</span>,
        headerClassName: "text-left w-[110px]",
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

    setLoading(true);
    try {
      const payload = {
      ...form,
        items: items.map(item => ({
          skuId: item.skuId,
          quantity: Math.abs(item.quantity),
          direction: item.adjustmentType
        }))
      };

      const res = await createOutOrder(payload);
      const adjustmentId = res?.documentId ?? res.docId ?? "";

      setLastSavedAdjustmentId(adjustmentId);
      showFlash(successResponse("Ajuste registrado"));

      if (adjustmentId) {
        await onSaved?.(adjustmentId);
      }

      setOpenNavigateModal(true);
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
    resetForm();
    void loadWarehouses();
  }, [loadWarehouses, open, resetForm]);

  const summaryBase = stockDetail.from;
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
                  label="Buscar SKU"
                  name="adjustment-sku"
                  value={pendingItem.skuId}
                  options={(searchResults?.items ?? []).map((item) => ({
                    value: item.sku.id,
                    label: buildSkuLabelWithAttributes(item),
                  }))}
                  onChange={(value) => {
                    if (!value) {
                      setPendingItem(buildEmptyPendingItem());
                      setOpenItemModal(false);
                      return;
                    }
                    setPendingItem({ ...buildEmptyPendingItem(), skuId: value });
                    setOpenItemModal(true);
                  }}
                  searchable
                  searchPlaceholder="Buscar SKU..."
                  onSearchChange={handleSkuSearchChange}
                  className="h-11 text-xs"
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
                <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-black/70">
                  <span>Total costo items</span>
                  <span className="font-semibold text-black tabular-nums">
                    {money(totalCost, CURRENCY)}
                  </span>
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
                    <span>Nombre</span>
                    <span className="font-semibold text-right">{summaryBase?.name ?? "-"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>SKU backend</span>
                    <span className="font-semibold tabular-nums text-right">
                      {summaryBase?.backendSku ?? "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>SKU interno</span>
                    <span className="font-semibold tabular-nums text-right">
                      {summaryBase?.customSku ?? "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Unidad</span>
                    <span className="font-semibold text-right">{summaryBase?.unit ?? "-"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Stock físico</span>
                    <span className="font-semibold tabular-nums text-right">
                      {stockDetail.loading
                        ? "Cargando..."
                        : stockDetail.error
                        ? "-"
                        : summaryBase?.onHand ?? "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Stock reservado</span>
                    <span className="font-semibold tabular-nums text-right">
                      {stockDetail.loading
                        ? "Cargando..."
                        : stockDetail.error
                        ? "-"
                        : summaryBase?.reserved ?? "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span>Stock disponible</span>
                    <span className="font-semibold tabular-nums text-right">
                      {stockDetail.loading
                        ? "Cargando..."
                        : stockDetail.error
                        ? "-"
                        : summaryBase?.available ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="flex gap-2">
                <SystemButton
                  className="flex-1"
                  disabled={loading}
                  onClick={saveAdjustment}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </SystemButton>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AdjustmentItemModal
        open={openItemModal}
        pendingItem={pendingItem}
        sectionTitle="Productos"
        messages={{
          missingType: "Debe ingresar el tipo de ajuste",
          zeroQuantity: "La cantidad no puede ser cero",
        }}
        onChange={(patch) => setPendingItem((prev) => ({ ...prev, ...patch }))}
        onClose={() => {
          setOpenItemModal(false);
          setPendingItem(buildEmptyPendingItem());
        }}
        onAdd={() => {
          const ok = addItem();
          if (!ok) return;
          setOpenItemModal(false);
        }}
      />

      <AdjustmentResultModal
        open={openNavigateModal}
        onClose={() => setOpenNavigateModal(false)}
        onNew={() => {
          setOpenNavigateModal(false);
          resetForm();
          setLastSavedAdjustmentId("");
        }}
        onGoToList={() => {
          setOpenNavigateModal(false);
          handleClose();
        }}
        adjustmentId={lastSavedAdjustmentId}
        title="Ajuste de inventario procesado"
        goToLabel={inModal ? "Volver al listado" : "Ir a listado de ajustes"}
      />
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      
      title="Nuevo ajuste"
      className="w-[min(92rem,calc(100vw-2rem))]"
      bodyClassName="p-0"
    >
      {content}
    </Modal>
  );
}
