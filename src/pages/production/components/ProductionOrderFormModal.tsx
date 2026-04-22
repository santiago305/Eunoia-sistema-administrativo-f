import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Trash2 } from "lucide-react";
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
import { getApiErrorMessage } from "@/common/utils/apiError";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant, type CatalogSearchSkuResult } from "@/services/catalogService";
import { createProductionOrder, getProductionOrder, updateProductionOrder } from "@/services/productionService";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { money, parseDecimalInput } from "@/utils/functionPurchases";
import type {
  AddProductionOrderItemDto,
  CreateProductionOrderDto,
  ProductionOrderItem,
} from "@/pages/production/types/production";
import { ProductTypes, type ProductType } from "@/pages/catalog/types/ProductTypes";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";

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

function toSkuAttributes(attributes?: Record<string, unknown> | null) {
  return Object.fromEntries(
    Object.entries({
      presentation: typeof attributes?.presentation === "string" ? attributes.presentation : undefined,
      variant: typeof attributes?.variant === "string" ? attributes.variant : undefined,
      color: typeof attributes?.color === "string" ? attributes.color : undefined,
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function normalizeProductType(value?: string | null): ProductType | undefined {
  if (!value) return undefined;

  const normalized = value.toUpperCase();
  return Object.values(ProductTypes).includes(normalized as ProductType)
    ? (normalized as ProductType)
    : undefined;
}

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
  const [products, setProducts] = useState<CatalogSearchSkuResult[]>([]);
  const [searchResults, setSearchResults] = useState<CatalogSearchSkuResult[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [query, setQuery] = useState("");
  const quantityTextByItemIdRef = useRef<Record<string, string>>({});
  const [, setQuantityTextByItemId] = useState<Record<string, string>>({});
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);

  const resetForm = () => {
    setForm(buildEmptyForm());
    setProducts([]);
    setSearchResults([]);
    setSerie({ value: "", label: "" });
    setQuery("");
    quantityTextByItemIdRef.current = {};
    setQuantityTextByItemId({});
    setEditingQuantityItemId(null);
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
    const normalizedQuery = query.trim();

    try {
      const res = await searchProductAndVariant({
        q: normalizedQuery,
        productType: ProductTypes.PRODUCT,
        isActive: true,
        page: 1,
        limit: 10,
      });
      setSearchResults((res ?? []).filter((item) => Boolean(item.stockItemId)));
    } catch {
      setSearchResults([]);
      showFlash(errorResponse("Error al cargar productos terminados"));
    }
  };

  const mapOrderProducts = (items: ProductionOrderItem[]) => {
    const map = new Map<string, CatalogSearchSkuResult>();

    items.forEach((item) => {
      const sku = item.finishedItem?.sku;
      const product = item.finishedItem?.product;
      const variant = item.finishedItem?.variant;
      const stockItemId = item.finishedItemId;
      const entityId = sku?.id ?? variant?.id ?? product?.id ?? stockItemId;
      if (!stockItemId || map.has(stockItemId)) return;

      map.set(stockItemId, {
        id: entityId,
        itemId: stockItemId,
        stockItemId,
        productId:
          item.finishedItem?.productId ??
          sku?.productId ??
          variant?.productId ??
          product?.id ??
          undefined,
        sku: sku?.backendSku ?? variant?.sku ?? product?.sku ?? undefined,
        productName: sku?.name ?? variant?.productName ?? product?.name ?? "SKU",
        productDescription: product?.description ?? variant?.productDescription ?? undefined,
        unitName: sku?.unitName ?? variant?.unitName ?? product?.baseUnitName ?? undefined,
        unitCode: sku?.unitCode ?? variant?.unitCode ?? product?.baseUnitCode ?? undefined,
        baseUnitId: sku?.baseUnitId ?? variant?.baseUnitId ?? product?.baseUnitId ?? undefined,
        isActive: sku?.isActive ?? variant?.isActive ?? product?.isActive ?? undefined,
        type: normalizeProductType(item.finishedItem?.type ?? sku?.type ?? product?.type ?? undefined),
        attributes: toSkuAttributes(
          sku?.attributes ?? variant?.attributes ?? product?.attributes ?? undefined,
        ),
        customSku: sku?.customSku ?? undefined,
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

  const addItem = (finishedItemId: string) => {
    const selected =
      searchResults.find((product) => (product.itemId ?? product.id) === finishedItemId) ??
      products.find((product) => (product.itemId ?? product.id) === finishedItemId);

    if (!finishedItemId) {
      showFlash(errorResponse("Selecciona un producto"));
      return;
    }
    if (!selected?.stockItemId) {
      showFlash(errorResponse("El producto seleccionado no tiene item de stock valido para produccion"));
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
        {
          finishedItemId,
          quantity: 1,
          unitCost: 0,
          type: selected?.type ?? ProductTypes.PRODUCT,
        },
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

  useEffect(() => {
    setQuantityTextByItemId((previous) => {
      const next: Record<string, string> = {};

      for (const item of form.items ?? []) {
        const itemId = item.finishedItemId;
        const keepExisting = editingQuantityItemId === itemId && previous[itemId] !== undefined;
        next[itemId] = keepExisting ? previous[itemId]! : String(item.quantity || 0);
      }

      quantityTextByItemIdRef.current = next;
      return next;
    });
  }, [editingQuantityItemId, form.items]);

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
            name={`qty-${row.finishedItemId}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={quantityTextByItemIdRef.current[row.finishedItemId] ?? String(row.quantity)}
            onFocus={(event) => {
              setEditingQuantityItemId(row.finishedItemId);
              event.currentTarget.select();
            }}
            onBlur={() => {
              setEditingQuantityItemId((previous) =>
                previous === row.finishedItemId ? null : previous,
              );

              const currentText =
                quantityTextByItemIdRef.current[row.finishedItemId] ?? String(row.quantity);
              const parsed = parseDecimalInput(currentText);
              const nextQuantity = parsed <= 0 ? 1 : parsed;

              setQuantityTextByItemId((previous) => {
                const updated = { ...previous, [row.finishedItemId]: String(nextQuantity) };
                quantityTextByItemIdRef.current = updated;
                return updated;
              });

              updateItem(row.rowIndex, { quantity: nextQuantity });
            }}
            onChange={(event) => {
              const nextText = event.target.value;

              setQuantityTextByItemId((previous) => {
                const updated = { ...previous, [row.finishedItemId]: nextText };
                quantityTextByItemIdRef.current = updated;
                return updated;
              });

              if (!nextText.trim()) return;

              const parsed = parseDecimalInput(nextText);
              if (parsed <= 0) return;
              updateItem(row.rowIndex, { quantity: parsed });
            }}
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
    } catch (error) {
      showFlash(errorResponse(getApiErrorMessage(error, "Error al guardar la orden de produccion")));
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
      void searchFinishedProducts();
    }, query.trim() ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [open, query]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={mode === "edit" ? "Editar orden de producción" : "Nueva orden de producción"}
        className="w-[min(92rem,calc(100vw-2rem))]"
        bodyClassName="p-0"
      >
        <div className="w-full">
          <div className="grid h-[80vh] grid-cols-1 gap-3 py-4 lg:grid-cols-[6fr_2.5fr]">
            <section className="flex flex-col gap-3 overflow-hidden">
              <div className="p-3">
                <SectionHeaderForm icon={Boxes} title="Productos terminados" />
                <div className="mt-2 grid gap-2 xl:grid-cols-1">
                  <FloatingSelect
                    label="Producto terminado"
                    name="production-finished-item"
                    value=""
                    options={productOptions}
                    onChange={(value) => {
                      if (!value) return;
                      addItem(value);
                    }}
                    searchable
                    searchPlaceholder="Buscar producto..."
                    onSearchChange={(text) => setQuery(text)}
                    className="h-12"
                    placeholder="Seleccionar producto"
                    emptyMessage="Sin productos"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3 py-0">
                <DataTable
                  tableId="production-items"
                  data={itemRows}
                  columns={columns}
                  rowKey="finishedItemId"
                  emptyMessage="Aun no agregas items."
                  animated={false}
                  hoverable={false}
                />
              </div>

              <div className="border-t border-black/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-black/60">
                    Nota: el costo total se calcula con la suma de las cantidades por costo unitario.
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                      Items: <span className="font-semibold text-black">{itemRows.length}</span>
                    </div>
                    <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                      Total costo: <span className="font-semibold text-black">{money(totalCost, "PEN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="flex flex-col overflow-hidden border-0 border-black/10 lg:border-l">
              <div className="flex-1 space-y-5 overflow-auto p-3 sm:p-4">
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
                    className="h-10"
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
                    className="h-10"
                    emptyMessage="Sin almacenes"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FloatingInput
                    label="Serie"
                    name="production-serie"
                    value={serie.label}
                    disabled
                    className="h-10 text-black/90"
                  />
                  <FloatingInput
                    label="Referencia"
                    name="production-reference"
                    value={form.reference ?? ""}
                    onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                    className="h-10"
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
                  className="h-10"
                />
              </div>

              <div className="p-3">
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
        </div>
      </Modal>
    </>
  );
}
