import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Boxes, FileText, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
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
import { money, toDateTimeInputValue, tryShowPicker } from "@/utils/functionPurchases";
import type {
  AddProductionOrderItemDto,
  CreateProductionOrderDto,
  ProductionOrderItem,
} from "@/pages/production/types/production";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate, useParams } from "react-router-dom";
import { ModalNavigateProduction } from "@/pages/production/components/ModalNavigateProduction";
import { ProductionItemModal } from "@/pages/production/components/ProductionItemModal";
import { Headed } from "@/components/Headed";

const PRIMARY = "hsl(var(--primary))";

const buildEmptyForm = (): CreateProductionOrderDto => ({
  fromWarehouseId: "",
  toWarehouseId: "",
  serieId: "",
  reference: "",
  manufactureDate: new Date().toISOString(),
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
  customSku?:string;
};

export default function ProductionCreate() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();
  const { productionId } = useParams<{ productionId: string }>();
  const isEdit = Boolean(productionId);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateProductionOrderDto>(() => buildEmptyForm());
  const [pendingItem, setPendingItem] = useState<AddProductionOrderItemDto>(() => buildEmptyItem());
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [lastSavedProductionId, setLastSavedProductionId] = useState("");
  const [products, setProducts] = useState<FinishedProducts[]>([]);
  const [searchResults, setSearchResults] = useState<FinishedProducts[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [query, setQuery] = useState("");

  const ringStyle = {
    "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
  } as CSSProperties;

  const resetForm = () => {
    setForm(buildEmptyForm());
    setPendingItem(buildEmptyItem());
    setOpenItemModal(false);
    setSerie({ value: "", label: "" });
  };

  const loadWarehouses = async () => {
    try {
      const res = await listActive();
      const options =
        res?.map((s) => ({
          value: s.warehouseId,
          label: `${s.name}`,
        })) ?? [];
      setWarehouseOptions(options);
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
      setSearchResults(res);
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
      const id = variant?.id ?? product?.id ?? item.finishedItemId;
      if (!id || map.has(id)) return;

      map.set(id, {
        id,
        itemId: id,
        sku: variant?.sku ?? product?.sku ?? undefined,
        productName: variant?.productName ?? product?.name ?? undefined,
        productDescription: variant?.productDescription ?? product?.description ?? undefined,
        unitName: variant?.unitName ?? product?.baseUnitName ?? undefined,
        unitCode: variant?.unitCode ?? product?.baseUnitCode ?? undefined,
        baseUnitId: variant?.baseUnitId ?? product?.baseUnitId ?? undefined,
        isActive: variant?.isActive ?? product?.isActive ?? undefined,
        type: item.finishedItem?.type ?? product?.type ?? undefined,
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
      const res = await listDocumentSeries({
        warehouseId,
        docType: DocType.PRODUCTION,
        isActive: true,
      });

      if (!res?.length) {
        setSerie({ value: "", label: "" });
        setForm((prev) => ({ ...prev, serieId: "" }));
        return;
      }

      setSerie({ value: res[0].id, label: res[0].code });
      setForm((prev) => ({ ...prev, serieId: res[0].id }));
    } catch {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      showFlash(errorResponse("Error al cargar series"));
    }
  };

  const productOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar producto" },
      ...(searchResults ?? []).map((v) => ({
        value: v.itemId ?? v.id ?? "",
        label: `${v.productName ?? "Materia prima"} ${v.attributes?.presentation ?? ""} ${v.attributes?.variant ?? ""} ${v.attributes?.color ?? ""}
        ${v.sku ? ` - ${v.sku}`: ""} ${v.customSku ? `( ${v.customSku} )`: ""}`,      })),
    ],
    [searchResults]
  );

  const addItem = () => {
    const { finishedItemId, quantity, unitCost } = pendingItem;
    const selected =
      searchResults.find((p) => (p.itemId ?? p.id) === finishedItemId) ??
      products.find((p) => (p.itemId ?? p.id) === finishedItemId);

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

    const alreadyAdded = (form.items ?? []).some((item) => item.finishedItemId === finishedItemId);
    if (alreadyAdded) {
      showFlash(errorResponse("El producto ya fue agregado"));
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items ?? []),
        {
          finishedItemId,
          quantity,
          unitCost,
          type: selected?.type ?? "",
        },
      ],
    }));

    setProducts((prev) => {
      if (!selected) return prev;
      const selectedId = selected.itemId ?? selected.id;
      if (!selectedId) return prev;
      const exists = prev.some((p) => (p.itemId ?? p.id) === selectedId);
      return exists ? prev : [...prev, selected];
    });

    setPendingItem(buildEmptyItem());
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, patch: Partial<AddProductionOrderItemDto>) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const totalCost = useMemo(() => {
    return (form.items ?? []).reduce((acc, item) => acc + item.quantity * item.unitCost, 0);
  }, [form.items]);

  const itemRows = useMemo<ProductionItemRow[]>(() => {
    return (form.items ?? []).map((item, index) => {
      const product = products.find((p) => (p.itemId ?? p.id) === item.finishedItemId);

      return {
        ...item,
        rowIndex: index,
        sku: product?.sku,
        productName: product?.productName,
        unitName: product?.unitName,
        customSku: product?.customSku,
        attributes:product?.attributes
      };
    });
  }, [form.items, products]);

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
        cell: (row) => <span className="text-black/70"> {`${row.productName ? `${row.productName}` : "" } ${row.attributes?.presentation ?? ""}
          ${row.attributes?.variant ?? ""}  ${row.attributes?.color ?? ""} ${row.attributes?.color ?? ""} (${row.sku ?? "-"})`}</span>,
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
            onChange={(e) =>
              updateItem(row.rowIndex, {
                quantity: Number(e.target.value),
              })
            }
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
    []
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
        const res = await updateProductionOrder(productionId, payload);
        showFlash(successResponse("Orden de produccion actualizada"));
        const nextId = res.productionId;
        if (nextId) setLastSavedProductionId(nextId);
      } else {
        const res = await createProductionOrder(payload);
        showFlash(successResponse("Orden de produccion creada"));
        const nextId = res.productionId;
        if (nextId) setLastSavedProductionId(nextId);
      }

      setOpenNavigateModal(true);
    } catch {
      showFlash(errorResponse("Error al guardar la orden de produccion"));
    } finally {
      setLoading(false);
    }
  };

  const loadOrder = async (productionId: string) => {
    setLoading(true);
    clearFlash();

    try {
      const data = await getProductionOrder(productionId);

      setForm({
        fromWarehouseId: data.fromWarehouseId ?? "",
        toWarehouseId: data.toWarehouseId ?? "",
        serieId: data.serieId ?? "",
        reference: data.reference ?? "",
        manufactureDate: data.manufactureDate ?? new Date().toISOString(),
        items: (data.items ?? []).map((item) => ({
          finishedItemId: item.finishedItemId,
          quantity: item.quantity,
          unitCost: item.unitCost ?? 0,
          type: item.type ?? "",
        })),
      });

      setSerie({
        value: data.serieId ?? "",
        label: data.serie?.code ?? "",
      });

      const mappedProducts = mapOrderProducts(data.items ?? []);
      setProducts(mappedProducts);
    } catch {
      showFlash(errorResponse("Error al cargar la orden de produccion"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!productionId) return;
    void loadOrder(productionId);
  }, [productionId]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (query.trim()) {
        void searchFinishedProducts();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    resetForm();
    void loadWarehouses();
  }, []);

  return (
    <div className="w-full min-h-screen bg-white">
      <PageTitle title="Orden de produccion" />

      <div className="mx-auto w-full max-w-[1500px] px-4 pt-2 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between my-4">
          <Headed
            title="Orden de Producción"
            size="lg"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[4fr_2.5fr] max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
          <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
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

            <div className="flex-1 overflow-auto">
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

            <div className="border-t border-black/10 px-3 sm:px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-black/60">Total costo items</div>
                <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                  <span className="font-semibold text-black tabular-nums">{money(totalCost, "PEN")}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-auto flex flex-col max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
            <div className="border-b border-black/10 px-3 sm:px-4 py-3">
              <SectionHeaderForm icon={FileText} title="Datos de documento" />
            </div>

            <div className="flex-1 overflow-hidden p-3 sm:p-4 space-y-5 mt-2 ">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <FloatingInput
                label="Fecha de culminacion"
                name="production-manufacture-date"
                type="datetime-local"
                value={toDateTimeInputValue(form.manufactureDate)}
                onClick={(e) => tryShowPicker(e.currentTarget)}
                onChange={(e) => setForm((prev) => ({ ...prev, manufactureDate: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="border-t border-black/10 px-3 sm:px-4 py-3">
              <div className="flex gap-2">
                <SystemButton variant="outline" className="flex-1" onClick={resetForm}>
                  Limpiar
                </SystemButton>

                <SystemButton
                  className="flex-1"
                  disabled={
                    loading ||
                    !form.fromWarehouseId ||
                    !form.toWarehouseId ||
                    !form.serieId ||
                    !(form.items ?? []).length }
                  onClick={saveOrder}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </SystemButton>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ProductionItemModal
        open={openItemModal}
        pendingItem={pendingItem}
        ringStyle={ringStyle}
        primaryColor={PRIMARY}
        onChange={(patch) => setPendingItem((prev) => ({ ...prev, ...patch }))}
        onClose={() => setOpenItemModal(false)}
        onAdd={() => {
          addItem();
          setOpenItemModal(false);
        }}
      />

      <ModalNavigateProduction
        open={openNavigateModal}
        onClose={() => setOpenNavigateModal(false)}
        onNewProduction={() => {
          setOpenNavigateModal(false);
          resetForm();
          setLastSavedProductionId("");
          if (isEdit) {
            navigate(RoutesPaths.productionCreate);
          }
        }}
        onGoToList={() => {
          setOpenNavigateModal(false);
          navigate(RoutesPaths.production);
        }}
        productionId={lastSavedProductionId || productionId}
        primaryColor={PRIMARY}
      />
    </div>
  );
}