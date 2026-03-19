import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Trash2 } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { createProductionOrder, getProductionOrder, updateProductionOrder } from "@/services/productionService";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { money, toDateTimeInputValue, tryShowPicker } from "@/utils/functionPurchases";
import type { AddProductionOrderItemDto, CreateProductionOrderDto, ProductionOrderItem } from "@/pages/production/types/production";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate, useParams } from "react-router-dom";
import { ModalNavigateProduction } from "@/pages/production/components/ModalNavigateProduction";
import { useSidebarContext } from "@/components/dashboard/SidebarContext";
import { ProductionItemModal } from "@/pages/production/components/ProductionItemModal";

const PRIMARY = "#21b8a6";

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

export default function ProductionCreate() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();
  const { setCollapsed } = useSidebarContext();
  const { productionId } = useParams<{ productionId: string }>();
  const isEdit = Boolean(productionId);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateProductionOrderDto>(() => buildEmptyForm());
  const [pendingItem, setPendingItem] = useState<AddProductionOrderItemDto>(() => buildEmptyItem());
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [products, setProducts] = useState<FinishedProducts[]>([]);
  const [searchResults, setSearchResults] = useState<FinishedProducts[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [query, setQuery] = useState("");

  const ringStyle = { "--tw-ring-color": `${PRIMARY}33` } as CSSProperties;

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
        q:query, raw:false, withRecipes:true
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
      return;
    }
    try {
      const res = await listDocumentSeries({ warehouseId, docType: DocType.PRODUCTION, isActive: true });
      setSerie({ value: res[0].id, label: res[0].code });
      setForm((prev) => ({ ...prev, serieId: res[0].id }));
    } catch {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      showFlash(errorResponse("Error al cargar series"));
    }
  };

  useEffect(() => {
    resetForm();
    void loadWarehouses();
  }, []);

  useEffect(() => {
    setCollapsed(false);
  }, []);

  const productOptions = useMemo(
    () =>
      (searchResults ?? []).map((v) => ({
        value: v.itemId ?? v.id ?? "",
        label: `${v.productName ?? "Producto"} (${v.sku ?? "-"})`,
      })),
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
      setOpenNavigateModal(true);
    } catch {
      showFlash(errorResponse("Error al guardar la orden de produccion"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!productionId) return;

    const loadOrder = async () => {
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

    void loadOrder();
  }, [productionId, clearFlash, showFlash]);
 
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
    
  const hasInvalidPrice = (form.items ?? []).some((item) => {
    const cost = Number(item.unitCost);
    return !Number.isFinite(cost) || cost <= 0;
  });



  return (
    <div className="w-full min-h-screen bg-white">
      <PageTitle title="Orden de produccion" />
      <div className="mx-auto w-full max-w-[1500px] 
        px-4 pt-2 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Orden de produccion</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[4fr_2.5fr] 
          max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
          <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden 
            flex flex-col ">
            <div className="border-b border-black/10 p-3 sm:p-4">
              <p className="text-xs font-semibold">Productos terminados</p>
              <div className="mt-2 grid grid-cols-1 gap-2 xl:grid-cols-[1fr_auto]">
                <FilterableSelect
                  value={pendingItem.finishedItemId}
                  onChange={(value) => {
                    setPendingItem((prev) => ({ ...prev, finishedItemId: value }));
                    setOpenItemModal(Boolean(value));
                  }}
                  options={productOptions}
                  placement="bottom"
                  placeholder="Producto terminado"
                  searchPlaceholder="Buscar producto..."
                  className="h-9"
                  textSize="text-[11px]"
                  onSearchChange={(text) => setQuery(text)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs table-fixed">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-black/10 text-[10px] text-black/60">
                    <th className="py-2 px-4 text-left w-25">SKU</th>
                    <th className="py-2 px-4 text-left w-32">Producto</th>
                    <th className="py-2 px-4 text-left w-15">Unidad</th>
                    <th className="py-2 px-4 text-left w-18">Cantidad</th>
                    <th className="py-2 px-4 text-left w-22">Costo unit.</th>
                    <th className="py-2 px-4 text-left w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.items ?? []).map((item, index) => {
                    const product = products.find((p) => (p.itemId ?? p.id) === item.finishedItemId);
                    return (
                      <tr key={`${item.finishedItemId}-${index}`} className="border-b border-black/5 text-[10px]">
                        <td className="py-2 px-4 text-black/70">{product?.sku}</td>
                        <td className="py-2 px-4 text-black/70">{product?.productName}</td>
                        <td className="py-2 px-4 text-black/70">{product?.unitName}</td>
                        <td className="py-2 px-4 text-right text-black/70 tabular-nums">
                          <input
                            type="number"
                            min={1}
                            className="h-8 w-15 rounded-lg border border-black/10 bg-white px-2 text-[10px] text-right outline-none focus:ring-2"
                            style={ringStyle}
                            value={item.quantity === 0 ? 1 : item.quantity}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                          />
                        </td>
                        <td className="py-2 px-4 text-right text-black/70 tabular-nums">
                          <input
                            type="number"
                            min={0}
                            className="h-8 w-18 rounded-lg border border-black/10 bg-white px-2 text-[10px] text-right outline-none focus:ring-2"
                            style={ringStyle}
                            value={item.unitCost === 0 ? "" : item.unitCost}
                            placeholder="0"
                            onChange={(e) =>
                              updateItem(index, { unitCost: e.target.value === "" ? 0 : Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white hover:bg-black/[0.03] text-rose-600"
                              title="Eliminar"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(form.items ?? []).length === 0 && (
                <div className="px-4 py-8 text-xs text-black/60">Aun no agregas items.</div>
              )}
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

          <aside className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-auto 
            flex flex-col max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
            <div className="border-b border-black/10 px-3 sm:px-4 py-2">
              <p className="text-xs font-semibold">Datos de documento</p>
            </div>
            <div className="flex-1 overflow-hidden p-3 sm:p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-[11px] text-black/70">
                  Almacen origen
                  <FilterableSelect
                    value={form.fromWarehouseId}
                    onChange={(value) => {
                      setForm((prev) => ({ ...prev, fromWarehouseId: value, serieId: "" }));
                      void loadSeries(value);
                    }}
                    options={warehouseOptions}
                    placement="bottom"
                    placeholder="Seleccionar almacen"
                    searchPlaceholder="Buscar almacen..."
                    className="h-9"
                    textSize="text-[11px] mt-1"
                  />
                </label>
                <label className="text-[11px] text-black/70">
                  Almacen destino
                  <FilterableSelect
                    value={form.toWarehouseId}
                    onChange={(value) => {
                      setForm((prev) => ({ ...prev, toWarehouseId: value }));
                    }}
                    options={warehouseOptions}
                    placement="bottom"
                    placeholder="Seleccionar almacen"
                    searchPlaceholder="Buscar almacen..."
                    className="h-9"
                    textSize="text-[11px] mt-1"
                  />
                </label>
              </div>
              <div className="space-y-1 grid grid-cols-2 gap-4">
                <label className="text-[11px] text-black/70">
                  Serie
                  <input
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2 mt-1"
                    style={ringStyle}
                    value={serie.label}
                    placeholder="Serie"
                    disabled
                  />
                </label>
                <label className="text-[11px] text-black/70">
                  Referencia
                  <input
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2 mt-1"
                    style={ringStyle}
                    value={form.reference ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="Referencia"
                  />
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-black/70">
                  Fecha de culminacion
                  <input
                    type="datetime-local"
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2 mt-1"
                    style={ringStyle}
                    value={toDateTimeInputValue(form.manufactureDate)}
                    onClick={(e) => tryShowPicker(e.currentTarget)}
                    onChange={(e) => setForm((prev) => ({ ...prev, manufactureDate: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-black/10 px-3 sm:px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.03]"
                  onClick={resetForm}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg border px-3 py-2 text-xs text-white disabled:opacity-40"
                  style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                  disabled={
                    loading ||
                    !form.fromWarehouseId ||
                    !form.toWarehouseId ||
                    !form.serieId ||
                    !(form.items ?? []).length ||
                    hasInvalidPrice
                  }
                  onClick={saveOrder}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
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
        }}
        onGoToList={() => {
          setOpenNavigateModal(false);
          navigate(RoutesPaths.production);
        }}
        primaryColor={PRIMARY}
      />
    </div>
  );
}
