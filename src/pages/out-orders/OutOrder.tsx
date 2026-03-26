import { useEffect, useMemo, useState } from "react";
import { Boxes, ClipboardList, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import { searchProductAndVariant } from "@/services/catalogService";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { money } from "@/utils/functionPurchases";
import { createOutOrder } from "@/services/documentService";
import { ModalNavigateOutOrder } from "@/pages/out-orders/components/ModalNavigateOutOrder";
import { OutOrderItemModal } from "@/pages/out-orders/components/OutOrderItemModal";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import type { AddOutOrderItemDto, CreateOutOrder } from "@/pages/out-orders/type/outOrder";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate } from "react-router-dom";

const PRIMARY = "hsl(var(--primary))";
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

type OutOrderItemRow = {
  id: string;
  itemId: string;
  sku: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitCost?: number;
};

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

  const resetForm = () => {
    setForm(buildEmptyForm());
    setPendingItem(buildEmptyItem());
    setSerie({ value: "", label: "" });
    setProducts([]);
    setSearchResults([]);
    setQuery("");
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
      const res = await listDocumentSeries({
        warehouseId,
        docType: DocType.OUT,
        isActive: true,
      });

      if (!res?.length) {
        setSerie({ value: "", label: "" });
        setForm((prev) => ({ ...prev, serieId: "" }));
        return;
      }

      const nextSerie = res[0];
      const nextNumber = Number(nextSerie.nextNumber ?? 0);

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
        label: `${v.productName ?? "Materia vrima"} ${v.attributes?.presentation ?? ""} ${v.attributes?.variant ?? ""} ${v.attributes?.color ?? ""}
        ${v.sku ? ` - ${v.sku}`: ""} (${v.customSku ?? "-"})`,      })),
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

  const itemRows = useMemo<OutOrderItemRow[]>(() => {
    return (form.items ?? []).map((item, index) => {
      const product = products.find((p) => (p.itemId ?? p.id) === item.itemId);

      return {
        id: `${item.itemId}-${index}`,
        itemId: item.itemId,
        sku: product?.sku ?? "-",
        productName: product?.productName ?? "Producto",
        unitName: product?.unitName ?? "-",
        quantity: item.quantity,
        unitCost: item.unitCost,
      };
    });
  }, [form.items, products]);

  const columns: DataTableColumn<OutOrderItemRow>[] = [
    {
      id: "sku",
      header: "SKU",
      accessorKey: "sku",
      hideable: false,
      sortable: false,
    },
    {
      id: "productName",
      header: "Producto",
      accessorKey: "productName",
      hideable: false,
      sortable: false,
    },
    {
      id: "unitName",
      header: "Unidad",
      accessorKey: "unitName",
      sortable: false,
    },
    {
      id: "quantity",
      header: "Cantidad",
      cell: (row) => {
        const index = itemRows.findIndex((item) => item.id === row.id);
        return (
          <div className="w-24">
            <FloatingInput
              label="Cantidad"
              name={`quantity-${row.id}`}
              type="number"
              min={1}
              value={String(row.quantity === 0 ? 1 : row.quantity)}
              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              className="h-9 text-xs"
            />
          </div>
        );
      },
      className: "text-right",
      headerClassName: "text-right",
      sortable: false,
      hideable: false,
    },
    {
      id: "unitCost",
      header: "Costo unit.",
      cell: (row) => {
        const index = itemRows.findIndex((item) => item.id === row.id);
        return (
          <div className="w-28">
            <FloatingInput
              label="Costo"
              name={`unitCost-${row.id}`}
              type="number"
              min={0}
              value={row.unitCost ?? ""}
              onChange={(e) =>
                updateItem(index, {
                  unitCost: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className="h-9 text-xs text-right"
            />
          </div>
        );
      },
      className: "text-right",
      headerClassName: "text-right",
      sortable: false,
    },
    {
      id: "actions",
      header: "",
      cell: (row) => {
        const index = itemRows.findIndex((item) => item.id === row.id);
        return (
          <div className="flex justify-end">
            <SystemButton
              type="button"
              variant="danger"
              size="icon"
              title="Eliminar"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        );
      },
      className: "text-right",
      headerClassName: "text-right",
      sortable: false,
      hideable: false,
    },
  ];

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
            <div className="border-b border-black/10 p-4 space-y-4">
              <SectionHeaderForm icon={Boxes} title="Productos" />

              <div className="grid grid-cols-1 gap-2">
                <FloatingSelect
                  label="Producto"
                  name="pending-item"
                  value={pendingItem.itemId}
                  onChange={(value) => {
                    setPendingItem((prev) => ({ ...prev, itemId: value }));
                    setOpenItemModal(Boolean(value));
                  }}
                  options={productOptions}
                  searchable
                  searchPlaceholder="Buscar producto..."
                  emptyMessage="Sin productos"
                  onSearchChange={(text) => setQuery(text)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <DataTable
                tableId="out-order-items-table"
                data={itemRows}
                columns={columns}
                rowKey="id"
                loading={false}
                emptyMessage="Aun no agregas items."
                hoverable={false}
                animated={false}
                tableClassName="table-fixed text-[11px]"
              />
            </div>

            <div className="border-t border-black/10 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-black/60">Total costo items</div>
                <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                  <span className="font-semibold text-black tabular-nums">
                    {money(totalCost, CURRENCY)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-auto flex flex-col max-h-[calc(100vh-100px)] min-h-[calc(100vh-100px)]">
            <div className="border-b border-black/10 p-4">
              <SectionHeaderForm icon={ClipboardList} title="Datos de documento" />
            </div>

            <div className="flex-1 overflow-hidden p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FloatingSelect
                  label="Almacén"
                  name="fromWarehouseId"
                  value={form.fromWarehouseId}
                  onChange={(value) => {
                    setForm((prev) => ({ ...prev, fromWarehouseId: value, serieId: "" }));
                    void loadSeries(value);
                  }}
                  options={warehouseOptions}
                  searchable
                  searchPlaceholder="Buscar almacén..."
                  emptyMessage="Sin almacenes"
                />

                <FloatingInput
                  label="Serie"
                  name="serie"
                  value={serie.label}
                  className="text-black/90"
                  disabled
                />
              </div>

              <FloatingInput
                label="Nota"
                name="note"
                value={form.note ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>

            <div className="border-t border-black/10 px-4 py-3">
              <div className="flex gap-2">
                <SystemButton variant="outline" className="flex-1" onClick={resetForm}>
                  Limpiar
                </SystemButton>

                <SystemButton
                  className="flex-1"
                  disabled={loading || !form.fromWarehouseId || !form.serieId || !(form.items ?? []).length}
                  onClick={saveOrder}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </SystemButton>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <OutOrderItemModal
        open={openItemModal}
        pendingItem={pendingItem}
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