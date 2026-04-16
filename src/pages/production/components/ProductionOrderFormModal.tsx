import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Boxes, FileText, Trash2 } from "lucide-react";
import { Modal } from "@/components/modales/Modal";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { FloatingDateTimePicker } from "@/components/date-picker/FloatingDateTimePicker";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { createProductionOrder, getProductionOrder, updateProductionOrder } from "@/services/productionService";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { money } from "@/utils/functionPurchases";
import type {
  AddProductionOrderItemDto,
  CreateProductionOrderDto,
  ProductionOrderItem,
} from "@/pages/production/types/production";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { ProductionItemModal } from "@/pages/production/components/ProductionItemModal";

type ProductionOrderFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  productionId?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  primaryColor?: string;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

const toLocalDateTimeString = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const parseDateValue = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildEmptyForm = (): CreateProductionOrderDto => ({
  fromWarehouseId: "",
  toWarehouseId: "",
  serieId: "",
  reference: "",
  manufactureDate: toLocalDateTimeString(new Date()),
  items: [],
});

const buildEmptyItem = (): AddProductionOrderItemDto => ({
  finishedItemId: "",
  quantity: 1,
  unitCost: 0,
  type: "",
});

type ProductionItemRow = AddProductionOrderItemDto & {
  rowIndex: number;
  sku?: string;
  productName?: string;
  unitName?: string;
  attributes?: {
    presentation?: string;
    variant?: string;
    color?: string;
  };
  customSku?: string;
};

export function ProductionOrderFormModal({
  open,
  mode,
  productionId,
  onClose,
  onSaved,
  primaryColor,
}: ProductionOrderFormModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const isEdit = mode === "edit" && Boolean(productionId);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateProductionOrderDto>(() => buildEmptyForm());
  const [pendingItem, setPendingItem] = useState<AddProductionOrderItemDto>(() => buildEmptyItem());
  const [openItemModal, setOpenItemModal] = useState(false);
  const [products, setProducts] = useState<FinishedProducts[]>([]);
  const [searchResults, setSearchResults] = useState<FinishedProducts[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [query, setQuery] = useState("");

  const ringStyle = {
    "--tw-ring-color": `color-mix(in srgb, ${accent} 20%, transparent)`,
  } as CSSProperties;

  const resetForm = () => {
    setForm(buildEmptyForm());
    setPendingItem(buildEmptyItem());
    setOpenItemModal(false);
    setProducts([]);
    setSearchResults([]);
    setSerie({ value: "", label: "" });
    setQuery("");
  };

  const loadWarehouses = async () => {
    try {
      const res = await listActive();
      setWarehouseOptions(
        res?.map((warehouse) => ({
          value: warehouse.warehouseId,
          label: warehouse.name,
        })) ?? [],
      );
    } catch {
      setWarehouseOptions([]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  };

  const searchFinishedProducts = async () => {
    try {
      const res = await searchProductAndVariant({
        q: query,
        raw: false,
        withRecipes: true,
      });
      setSearchResults(res ?? []);
    } catch {
      setSearchResults([]);
      showFlash(errorResponse("Error al cargar productos terminados"));
    }
  };

  const mapOrderProducts = (items: ProductionOrderItem[]) => {
    const map = new Map<string, FinishedProducts>();

    items.forEach((item) => {
      const product = item.finishedItem?.product;
      const variant = item.finishedItem?.variant;
      const stockItemId = item.finishedItemId;
      const entityId = variant?.id ?? product?.id ?? stockItemId;
      if (!stockItemId || map.has(stockItemId)) return;

      map.set(stockItemId, {
        id: entityId,
        itemId: stockItemId,
        productId: item.finishedItem?.productId ?? variant?.productId ?? product?.id ?? undefined,
        variantId: item.finishedItem?.variantId ?? variant?.id ?? null,
        sku: variant?.sku ?? product?.sku ?? undefined,
        productName: variant?.productName ?? product?.name ?? undefined,
        productDescription: variant?.productDescription ?? product?.description ?? undefined,
        unitName: variant?.unitName ?? product?.baseUnitName ?? undefined,
        unitCode: variant?.unitCode ?? product?.baseUnitCode ?? undefined,
        baseUnitId: variant?.baseUnitId ?? product?.baseUnitId ?? undefined,
        isActive: variant?.isActive ?? product?.isActive ?? undefined,
        type: item.finishedItem?.type ?? product?.type ?? undefined,
        attributes: (variant?.attributes ?? product?.attributes ?? undefined) as FinishedProducts["attributes"],
      });
    });

    return Array.from(map.values());
  };

  const loadSeries = async (warehouseId: string) => {
    if (!warehouseId) {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      return;
    }

    try {
      const response = await listDocumentSeries({
        warehouseId,
        docType: DocType.PRODUCTION,
        isActive: true,
      });
      const seriesList = Array.isArray(response) ? response : response ? [response] : [];

      if (seriesList.length === 0) {
        setSerie({ value: "", label: "" });
        setForm((prev) => ({ ...prev, serieId: "" }));
        return;
      }

      setSerie({ value: seriesList[0].id, label: seriesList[0].code });
      setForm((prev) => ({ ...prev, serieId: seriesList[0].id }));
    } catch {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      showFlash(errorResponse("Error al cargar series"));
    }
  };

  const productOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar producto" },
      ...(searchResults ?? []).map((product) => ({
        value: product.itemId ?? product.id ?? "",
        label: `${product.productName ?? "Producto"} ${product.attributes?.presentation ?? ""} ${product.attributes?.variant ?? ""} ${product.attributes?.color ?? ""}${product.sku ? ` - ${product.sku}` : ""}${product.customSku ? ` (${product.customSku})` : ""}`,
      })),
    ],
    [searchResults],
  );

  const addItem = () => {
    const { finishedItemId, quantity, unitCost } = pendingItem;
    const selected =
      searchResults.find((product) => (product.itemId ?? product.id) === finishedItemId) ??
      products.find((product) => (product.itemId ?? product.id) === finishedItemId);

    if (!finishedItemId) {
      showFlash(errorResponse("Selecciona un producto"));
      return;
    }
    if (quantity <= 0) {
      showFlash(errorResponse("La cantidad debe ser mayor a 0"));
      return;
    }
    if (unitCost < 0) {
      showFlash(errorResponse("El costo debe ser mayor o igual a 0"));
      return;
    }
    if ((form.items ?? []).some((item) => item.finishedItemId === finishedItemId)) {
      showFlash(errorResponse("El producto ya fue agregado"));
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items ?? []),
        { finishedItemId, quantity, unitCost, type: selected?.type ?? "" },
      ],
    }));

    setProducts((prev) => {
      if (!selected) return prev;
      const selectedId = selected.itemId ?? selected.id;
      if (!selectedId || prev.some((product) => (product.itemId ?? product.id) === selectedId)) {
        return prev;
      }
      return [...prev, selected];
    });

    setPendingItem(buildEmptyItem());
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateItem = (index: number, patch: Partial<AddProductionOrderItemDto>) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const totalCost = useMemo(
    () => (form.items ?? []).reduce((acc, item) => acc + item.quantity * item.unitCost, 0),
    [form.items],
  );

  const itemRows = useMemo<ProductionItemRow[]>(
    () =>
      (form.items ?? []).map((item, index) => {
        const product = products.find((entry) => (entry.itemId ?? entry.id) === item.finishedItemId);
        return {
          ...item,
          rowIndex: index,
          sku: product?.sku,
          productName: product?.productName,
          unitName: product?.unitName,
          customSku: product?.customSku,
          attributes: product?.attributes,
        };
      }),
    [form.items, products],
  );

  const columns = useMemo<DataTableColumn<ProductionItemRow>[]>(
    () => [
      {
        id: "sku",
        header: "SKU",
        cell: (row) => <span className="text-black/70">{row.customSku ?? "-"}</span>,
        headerClassName: "text-left w-[90px]",
        className: "text-black/70",
      },
      {
        id: "product",
        header: "Producto",
        cell: (row) => (
          <span className="text-black/70">
            {`${row.productName ? `${row.productName}` : ""} ${row.attributes?.presentation ?? ""} ${row.attributes?.variant ?? ""} ${row.attributes?.color ?? ""} (${row.sku ?? "-"})`}
          </span>
        ),
        headerClassName: "text-left w-[170px]",
        className: "text-black/70",
      },
      {
        id: "unit",
        header: "Unidad",
        cell: (row) => <span className="text-black/70">{row.unitName ?? "-"}</span>,
        headerClassName: "text-left w-[110px]",
        className: "text-black/70",
      },
      {
        id: "quantity",
        header: "Cantidad",
        cell: (row) => (
          <FloatingInput
            label="Cantidad"
            name={`qty-${row.rowIndex}`}
            type="number"
            min={1}
            value={String(row.quantity === 0 ? 1 : row.quantity)}
            onChange={(event) => updateItem(row.rowIndex, { quantity: Number(event.target.value) })}
            className="h-8 text-[10px]"
          />
        ),
        headerClassName: "text-left w-[130px]",
        className: "text-black/70",
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-rose-600"
              onClick={() => removeItem(row.rowIndex)}
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

  const saveOrder = async () => {
    clearFlash();

    if (!form.fromWarehouseId || !form.toWarehouseId || !form.serieId) {
      showFlash(errorResponse("Completa los datos de documento"));
      return;
    }
    if (!form.items?.length) {
      showFlash(errorResponse("Agrega al menos un item"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        reference: form.reference?.trim() || undefined,
        items: form.items ?? [],
      };

      if (isEdit && productionId) {
        await updateProductionOrder(productionId, payload);
        showFlash(successResponse("Orden de produccion actualizada"));
      } else {
        await createProductionOrder(payload);
        showFlash(successResponse("Orden de produccion creada"));
      }

      await onSaved();
    } catch {
      showFlash(errorResponse("Error al guardar la orden de produccion"));
    } finally {
      setLoading(false);
    }
  };

  const loadOrder = async (nextProductionId: string) => {
    setLoading(true);
    clearFlash();

    try {
      const data = await getProductionOrder(nextProductionId);
      setForm({
        fromWarehouseId: data.fromWarehouseId ?? "",
        toWarehouseId: data.toWarehouseId ?? "",
        serieId: data.serieId ?? "",
        reference: data.reference ?? "",
        manufactureDate: data.manufactureDate ?? toLocalDateTimeString(new Date()),
        items: (data.items ?? []).map((item) => ({
          finishedItemId: item.finishedItemId,
          quantity: item.quantity,
          unitCost: item.unitCost ?? 0,
          type: item.type ?? "",
        })),
      });
      setSerie({ value: data.serieId ?? "", label: data.serie?.code ?? "" });
      setProducts(mapOrderProducts(data.items ?? []));
    } catch {
      showFlash(errorResponse("Error al cargar la orden de produccion"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    void loadWarehouses();

    if (mode === "edit" && productionId) {
      void loadOrder(productionId);
      return;
    }

    resetForm();
  }, [open, mode, productionId]);

  useEffect(() => {
    if (open) return;
    resetForm();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        void searchFinishedProducts();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [open, query]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={mode === "edit" ? "Editar orden de producción" : "Nueva orden de producción"}
        className="w-[1400px] max-w-[96vw] h-[92vh]"
        bodyClassName="h-full p-4"
      >
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[4fr_2.5fr]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 p-3 sm:p-4">
              <SectionHeaderForm icon={Boxes} title="Productos terminados" />
              <div className="mt-3 grid grid-cols-1 gap-2">
                <FloatingSelect
                  label="Producto terminado"
                  name="production-finished-item"
                  value={pendingItem.finishedItemId}
                  options={productOptions}
                  onChange={(value) => {
                    setPendingItem((prev) => ({ ...prev, finishedItemId: value }));
                    setOpenItemModal(Boolean(value));
                  }}
                  searchable
                  searchPlaceholder="Buscar producto..."
                  onSearchChange={(text) => setQuery(text)}
                  className="h-9 text-xs"
                  placeholder="Seleccionar producto"
                  emptyMessage="Sin productos"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <DataTable
                tableId="production-items"
                data={itemRows}
                columns={columns}
                rowKey="finishedItemId"
                emptyMessage="Aun no agregas items."
                animated={false}
                tableClassName="table-fixed text-[11px]"
              />
            </div>

            <div className="border-t border-black/10 px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-black/60">Total costo items</div>
                <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                  <span className="font-semibold tabular-nums text-black">{money(totalCost, "PEN")}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 px-3 py-3 sm:px-4">
              <SectionHeaderForm icon={FileText} title="Datos de documento" />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FloatingSelect
                    label="Almacen origen"
                    name="production-from-warehouse"
                    value={form.fromWarehouseId}
                    options={warehouseOptions}
                    onChange={(value) => {
                      setForm((prev) => ({ ...prev, fromWarehouseId: value, serieId: "" }));
                      void loadSeries(value);
                    }}
                    searchable
                    className="h-9 text-xs"
                    emptyMessage="Sin almacenes"
                  />
                  <FloatingSelect
                    label="Almacen destino"
                    name="production-to-warehouse"
                    value={form.toWarehouseId}
                    options={warehouseOptions}
                    onChange={(value) => {
                      setForm((prev) => ({ ...prev, toWarehouseId: value }));
                    }}
                    searchable
                    className="h-9 text-xs"
                    emptyMessage="Sin almacenes"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FloatingInput
                    label="Serie"
                    name="production-serie"
                    value={serie.label}
                    disabled
                    className="h-9 text-xs text-black/90"
                  />
                  <FloatingInput
                    label="Referencia"
                    name="production-reference"
                    value={form.reference ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <FloatingDateTimePicker
                  label="Fecha de culminacion"
                  name="production-manufacture-date"
                  value={parseDateValue(form.manufactureDate)}
                  onChange={(date) =>
                    setForm((prev) => ({
                      ...prev,
                      manufactureDate: date ? toLocalDateTimeString(date) : "",
                    }))
                  }
                  clearable={false}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="border-t border-black/10 px-3 py-3 sm:px-4">
              <div className="flex gap-2">
                <SystemButton variant="outline" className="flex-1" onClick={onClose}>
                  Cancelar
                </SystemButton>
                <SystemButton
                  className="flex-1"
                  style={{
                    backgroundColor: accent,
                    borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
                  }}
                  disabled={
                    loading ||
                    !form.fromWarehouseId ||
                    !form.toWarehouseId ||
                    !form.serieId ||
                    !(form.items ?? []).length
                  }
                  onClick={saveOrder}
                >
                  {loading ? "Guardando..." : mode === "edit" ? "Actualizar" : "Guardar"}
                </SystemButton>
              </div>
            </div>
          </aside>
        </div>
      </Modal>

      <ProductionItemModal
        open={openItemModal}
        pendingItem={pendingItem}
        ringStyle={ringStyle}
        primaryColor={accent}
        onChange={(patch) => setPendingItem((prev) => ({ ...prev, ...patch }))}
        onClose={() => setOpenItemModal(false)}
        onAdd={() => {
          addItem();
          setOpenItemModal(false);
        }}
      />
    </>
  );
}
