import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Trash2 } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { money } from "@/utils/functionPurchases";
import { createOutOrder } from "@/services/outOrderService";
import { ModalNavigateOutOrder } from "@/pages/out-orders/components/ModalNavigateOutOrder";
import { OutOrderItemModal } from "@/pages/out-orders/components/OutOrderItemModal";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import type { AddOutOrderItemDto, CreateOutOrder } from "@/pages/out-orders/type/outOrder";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate } from "react-router-dom";

const PRIMARY = "#21b8a6";
const CURRENCY = "PEN";

const buildEmptyForm = (): CreateOutOrder => ({
  docType: DocType.OUT,
  serieId: "",
  fromWarehouseId: "",
  note: "",
  items: [],
});

const buildEmptyItem = (): AddOutOrderItemDto => ({
  itemId: "",
  quantity: 1,
  unitCost: undefined,
});

export default function OutOrder() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateOutOrder>(() => buildEmptyForm());
  const [pendingItem, setPendingItem] = useState<AddOutOrderItemDto>(() => buildEmptyItem());
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [lastSavedOutOrderId, setLastSavedOutOrderId] = useState("");
  const [products, setProducts] = useState<FinishedProducts[]>([]);
  const [searchResults, setSearchResults] = useState<FinishedProducts[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [query, setQuery] = useState("");

  const ringStyle = { "--tw-ring-color": `${PRIMARY}33` } as CSSProperties;

  const resetForm = () => {
    setForm(buildEmptyForm());
    setPendingItem(buildEmptyItem());
    setSerie({ value: "", label: "" });
    setProducts([]);
  };

  const loadWarehouses = async () => {
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
  };

  const loadSeries = async (warehouseId: string) => {
    if (!warehouseId) {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      return;
    }
    try {
      const res = await listDocumentSeries({ warehouseId, docType: DocType.OUT, isActive: true });
      if (!res?.length) {
        setSerie({ value: "", label: "" });
        setForm((prev) => ({ ...prev, serieId: "" }));
        return;
      }
      const nextSerie = res[0];
      const nextNumber = Number(nextSerie.nextNumber ?? 0) + 1;
      setSerie({
        value: nextSerie.id,
        label: `${nextSerie.code}-${nextNumber}`,
      });
      setForm((prev) => ({ ...prev, serieId: nextSerie.id }));
    } catch {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      showFlash(errorResponse("Error al cargar series"));
    }
  };

  const searchProducts = async () => {
    try {
      const res = await searchProductAndVariant({
        q: query,
        raw: false,
      });
      setSearchResults(res ?? []);
    } catch {
      setSearchResults([]);
      showFlash(errorResponse("Error al cargar productos"));
    }
  };

  const productOptions = useMemo(
    () =>
      (searchResults ?? []).map((v) => ({
        value: v.itemId ?? v.id ?? "",
        label: `${v.productName ?? "Producto"} (${v.sku ?? "-"})`,
      })),
    [searchResults],
  );

  const addItem = () => {
    const { itemId, quantity, unitCost } = pendingItem;
    const selected =
      searchResults.find((p) => (p.itemId ?? p.id) === itemId) ??
      products.find((p) => (p.itemId ?? p.id) === itemId);

    if (!itemId) {
      showFlash(errorResponse("Selecciona un producto"));
      return;
    }
    if (quantity <= 0) {
      showFlash(errorResponse("La cantidad debe ser mayor a 0"));
      return;
    }
    if (unitCost !== undefined && unitCost < 0) {
      showFlash(errorResponse("El costo debe ser mayor o igual a 0"));
      return;
    }
    if (!selected) {
      showFlash(errorResponse("Producto no encontrado"));
      return;
    }
    const alreadyAdded = (form.items ?? []).some((item) => item.itemId === itemId);
    if (alreadyAdded) {
      showFlash(errorResponse("El producto ya fue agregado"));
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: [...(prev.items ?? []), { itemId, quantity, unitCost }],
    }));
    setProducts((prev) => {
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

  const updateItem = (index: number, patch: Partial<AddOutOrderItemDto>) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const totalCost = useMemo(() => {
    return (form.items ?? []).reduce((acc, item) => acc + item.quantity * (item.unitCost ?? 0), 0);
  }, [form.items]);

  const saveOrder = async () => {
    clearFlash();
    if (!form.fromWarehouseId || !form.serieId) {
      showFlash(errorResponse("Completa los datos del documento"));
      return;
    }
    if (!form.items?.length) {
      showFlash(errorResponse("Agrega al menos un item"));
      return;
    }

    setLoading(true);
    try {
      const payload: CreateOutOrder = {
        ...form,
        note: form.note?.trim() || undefined,
        items: form.items ?? [],
      };
      const res = await createOutOrder(payload);
      const nextId = res.docId ?? "";
      setLastSavedOutOrderId(nextId);
      showFlash(successResponse("Salida registrada"));
      setOpenNavigateModal(true);
    } catch {
      showFlash(errorResponse("Error al guardar la salida"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if (query.trim()) {
        void searchProducts();
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
      <PageTitle title="Orden de salida" />
      <div className="mx-auto w-full max-w-[1500px] px-4 pt-2 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Orden de salida</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[4fr_2.5fr] max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
          <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-black/10 p-3 sm:p-4">
              <p className="text-xs font-semibold">Productos</p>
              <div className="mt-2 grid grid-cols-1 gap-2 xl:grid-cols-[1fr_auto]">
                <FilterableSelect
                  value={pendingItem.itemId}
                  onChange={(value) => {
                    setPendingItem((prev) => ({ ...prev, itemId: value }));
                    setOpenItemModal(Boolean(value));
                  }}
                  options={productOptions}
                  placement="bottom"
                  placeholder="Seleccionar producto"
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
                    const product = products.find((p) => (p.itemId ?? p.id) === item.itemId);
                    return (
                      <tr key={`${item.itemId}-${index}`} className="border-b border-black/5 text-[10px]">
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
                            value={item.unitCost ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateItem(index, { unitCost: e.target.value === "" ? undefined : Number(e.target.value) })
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
                  <span className="font-semibold text-black tabular-nums">{money(totalCost, CURRENCY)}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-auto flex flex-col max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
            <div className="border-b border-black/10 px-3 sm:px-4 py-2">
              <p className="text-xs font-semibold">Datos de documento</p>
            </div>
            <div className="flex-1 overflow-hidden p-3 sm:p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-[11px] text-black/70">
                  Almacen
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
                  Serie
                  <input
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2 mt-1"
                    style={ringStyle}
                    value={serie.label}
                    placeholder="Serie"
                    disabled
                  />
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-black/70">
                  Nota
                  <input
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2 mt-1"
                    style={ringStyle}
                    value={form.note ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Nota"
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
                  disabled={loading || !form.fromWarehouseId || !form.serieId || !(form.items ?? []).length}
                  onClick={saveOrder}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <OutOrderItemModal
        open={openItemModal}
        pendingItem={pendingItem}
        ringStyle={ringStyle}
        primaryColor={PRIMARY}
        onChange={(patch) => setPendingItem((prev) => ({ ...prev, ...patch }))}
        onClose={() => {
          setOpenItemModal(false);
          setPendingItem(buildEmptyItem());
        }}
        onAdd={() => {
          addItem();
          setOpenItemModal(false);
        }}
      />

      <ModalNavigateOutOrder
        open={openNavigateModal}
        onClose={() => setOpenNavigateModal(false)}
        onNewOutOrder={() => {
          setOpenNavigateModal(false);
          resetForm();
          setLastSavedOutOrderId("");
          navigate(RoutesPaths.outOrder);
        }}
        onGoToList={() => {
          setOpenNavigateModal(false);
          navigate(RoutesPaths.KardexFinished);
        }}
        outOrderId={lastSavedOutOrderId}
        primaryColor={PRIMARY}
      />
    </div>
  );
}
