import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/settings/modal";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { listFinishedProducts } from "@/services/catalogService";
import { createProductionOrder } from "@/services/productionService";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { money, toDateTimeInputValue, tryShowPicker } from "@/utils/functionPurchases";
import type { AddProductionOrderItemDto, CreateProductionOrderDto } from "@/pages/production/types/production";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import type { FinishedProducts } from "@/pages/catalog/types/variant";

type ProductionOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  primaryColor?: string;
};

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
  type: ""
});

export function ProductionOrderModal({ open, onClose, onCreated, primaryColor = "#21b8a6" }: ProductionOrderModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateProductionOrderDto>(() => buildEmptyForm());
  const [pendingItem, setPendingItem] = useState<AddProductionOrderItemDto>(() => buildEmptyItem());
  const [openItemModal, setOpenItemModal] = useState(false);
  const [products, setProducts] = useState<FinishedProducts[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({value: "",label: "",});

  const ringStyle = { "--tw-ring-color": `${primaryColor}33` } as CSSProperties;

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

  const loadFinishedProducts = async () => {
    try {
      const res = await listFinishedProducts();
      const normalized =
        (res ?? [])
          .map((row) => ({
            ...row,
            stockItemId: row.stockItemId ?? row.id ?? "",
            isActive: row.isActive ?? true,
          }))
          .filter((row) => row.stockItemId) ?? [];
      setProducts(normalized);
    } catch {
      setProducts([]);
      showFlash(errorResponse("Error al cargar productos terminados"));
    }
  };


  const loadSeries = async (warehouseId: string) => {
    if (!warehouseId) {
      setSerie({value:'',label:''});
      return;
    }
    try {
      const res = await listDocumentSeries({ warehouseId, docType: DocType.PRODUCTION, isActive: true });
      setSerie({value: res[0].id, label:res[0].code});
      setForm((prev) => ({ ...prev, serieId: res[0].id }))
    } catch {
      setSerie({value:'',label:''});
      setForm( (prev)=> ({...prev, serieId:''}));
      showFlash(errorResponse("Error al cargar series"));
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadWarehouses();
    void loadFinishedProducts();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm(buildEmptyForm());
    setPendingItem(buildEmptyItem());
    setOpenItemModal(false);
    setSerie({value:'',label:''});
  }, [open]);

  const productOptions = useMemo(
    () =>
      (products ?? []).map((v) => ({
        value: v.stockItemId ?? v.id ?? "",
        label: `${v.productName ?? "Producto"} (${v.sku ?? "-"})`,
      })),
    [products]
  );


  const addItem = () => {
    const { finishedItemId, quantity, unitCost } = pendingItem;
    const selected = products.find((p) => (p.stockItemId ?? p.id) === finishedItemId);

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
      await createProductionOrder({
        ...form,
        reference: form.reference?.trim() || undefined,
        items: form.items ?? [],
      });
      showFlash(successResponse("Orden de producción creada"));
      console.log("order created -> calling onCreated");
      onCreated?.();
      onClose();
    } catch {
      showFlash(errorResponse("Error al crear la orden de producción"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal title="Orden de producción" onClose={onClose} className="max-w-[1000px]">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[4fr_2.5fr] p-2">
        <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
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
                  const product = products.find((p) => (p.stockItemId ?? p.id) === item.finishedItemId);
                  return (
                    <tr key={`${item.finishedItemId}-${index}`} className="border-b border-black/5 
                      text-[10px]">
                      <td className="py-2 px-4 text-black/70">{product?.sku}</td>
                      <td className="py-2 px-4 text-black/70">{product?.productName}</td>
                      <td className="py-2 px-4 text-black/70">{product?.unitName}</td>
                      <td className="py-2 px-4 text-right text-black/70 tabular-nums">
                        <input
                          type="number"
                          min={1}
                          className="h-8 w-15 rounded-lg border border-black/10 bg-white px-2 text-[10px]
                           text-right outline-none focus:ring-2"
                          style={ringStyle}
                          value={item.quantity === 0 ? 1 : item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="py-2 px-4 text-right text-black/70 tabular-nums">
                        <input
                          type="number"
                          min={0}
                          className="h-8 w-18 rounded-lg border border-black/10 bg-white px-2 text-[10px] 
                          text-right outline-none focus:ring-2"
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

            {(form.items ?? []).length === 0 && <div className="px-4 py-8 text-xs text-black/60">Aún no agregas items.</div>}
          </div>

          <div className="border-t border-black/10 px-3 sm:px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-black/60">Total costo items</div>
              <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                <span className="font-semibold text-black tabular-nums">{money(totalCost, 'PEN')}</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-auto flex flex-col
        h-100">
          <div className="border-b border-black/10 px-3 sm:px-4 py-2">
            <p className="text-xs font-semibold">Datos de documento</p>
          </div>
          <div className="flex-1 overflow-hidden p-3 sm:p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <label className="text-[11px] text-black/70">Almacen origen
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
              <label className="text-[11px] text-black/70">Almacen destino
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
              <label className="text-[11px] text-black/70">Serie
                <input
                  className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs 
                  outline-none focus:ring-2 mt-1"
                  style={ringStyle}
                  value={serie.label}
                  placeholder="Serie"
                  disabled={true}
                />
              </label>
              <label className="text-[11px] text-black/70">Referencia
                <input
                  className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs 
                  outline-none focus:ring-2 mt-1"
                  style={ringStyle}
                  value={form.reference ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                  placeholder="Referencia"
                />
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-black/70">Fecha de culminación
                <input
                  type="datetime-local"
                  className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs
                   outline-none focus:ring-2 mt-1"
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
                onClick={() => setForm(buildEmptyForm())}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border px-3 py-2 text-xs text-white disabled:opacity-40"
                style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` }}
                disabled={loading || !form.fromWarehouseId || !form.toWarehouseId || !form.serieId || !(form.items ?? []).length}
                onClick={saveOrder}
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </aside>
      </div>
      {openItemModal && (
        <Modal title="Agregar item" onClose={() => setOpenItemModal(false)} className="max-w-xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-black/60">
              Cantidad
              <input
                type="number"
                min={1}
                className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                style={ringStyle}
                value={pendingItem.quantity}
                onChange={(e) => setPendingItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                placeholder="Cantidad"
              />
            </label>
            <label className="text-[11px] text-black/60">
              Costo unit.
              <input
                type="number"
                className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                style={ringStyle}
                value={pendingItem.unitCost === 0 ? "" : pendingItem.unitCost}
                onChange={(e) =>
                  setPendingItem((prev) => ({
                    ...prev,
                    unitCost: e.target.value === "" ? 0 : Number(e.target.value),
                  }))
                }
                placeholder="0"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-lg border border-black/10 px-4 py-2 text-xs" onClick={() => setOpenItemModal(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs text-white focus:outline-none focus:ring-2"
              style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}33` }}
              onClick={() => {
                addItem();
                setOpenItemModal(false);
              }}
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
