import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
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
import { listActiveWarehouses } from "@/services/warehouseServices";
import { listDocumentSeries } from "@/services/documentSeriesService";
import { money } from "@/utils/functionPurchases";
import { createOutOrder } from "@/services/documentService";
import { ModalNavigateOutOrder } from "@/pages/out-orders/components/ModalNavigateOutOrder";
import { OutOrderItemModal } from "@/pages/out-orders/components/OutOrderItemModal";
import { DocType, type WarehouseSelectOption } from "@/pages/warehouse/types/warehouse";
import { RoutesPaths } from "@/router/config/routesPaths";
import { useNavigate } from "react-router-dom";
import { ProductTypes } from "../catalog/types/ProductTypes";
import { listSkus } from "@/services/skuService";
import { ListSkusResponse } from "../catalog/types/product";
import { buildEmptyFormOutOrder, buildEmptyItemOutOrder, formatAttrs } from "./utils/out-orders";
import { CreateOutOrder, AddOutOrderItemDto, Direction, OutOrderItemRow } from "./type/outOrder";

const PRIMARY = "hsl(var(--primary))";
const CURRENCY = "PEN";


export default function OutOrder() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateOutOrder>(() => buildEmptyFormOutOrder());
  const [pendingItem, setPendingItem] = useState<AddOutOrderItemDto>(() => buildEmptyItemOutOrder());
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [lastSavedOutOrderId, setLastSavedOutOrderId] = useState("");
  const [productsCache, setProductsCache] = useState<ListSkusResponse>();
  const [searchResults, setSearchResults] = useState<ListSkusResponse>();
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);
  const [serie, setSerie] = useState<{ value: string; label: string }>({ value: "", label: "" });
  const [query, setQuery] = useState("");
  
  const handleCloseItemModal = useCallback(() => {
    setOpenItemModal(false);
    setPendingItem(buildEmptyItemOutOrder());
  }, []);

  const resetForm = useCallback(() => {
    setForm(buildEmptyFormOutOrder());
    setPendingItem(buildEmptyItemOutOrder());
    setSerie({ value: "", label: "" });
    setProductsCache(undefined);
    setSearchResults(undefined);
    setQuery("");
  }, []);

  const mergeSkuCache = (previous: ListSkusResponse | undefined, incoming: ListSkusResponse | undefined) => {
    const prevItems = previous?.items ?? [];
    const nextItems = incoming?.items ?? [];

    if (nextItems.length === 0) return previous;

    const map = new Map(prevItems.map((item) => [item.sku.id, item]));
    nextItems.forEach((item) => map.set(item.sku.id, item));

    const merged = Array.from(map.values());
    return {
      items: merged,
      total: merged.length,
      page: 1,
      limit: merged.length,
    };
  };

  const loadWarehouses = async () => {
    clearFlash();
    try {
      const res = await listActiveWarehouses({ page: 1, limit: 100 });
      const options =
        (res.items ?? []).map((warehouse) => ({
          value: warehouse.warehouseId,
          label: warehouse.name,
          department: warehouse.department,
          province: warehouse.province,
          district: warehouse.district,
          address: warehouse.address,
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
      if (!res) {
        setSerie({ value: "", label: "" });
        setForm((prev) => ({ ...prev, serieId: "" }));
        return;
      }
      const nextNumber = Number(res.nextNumber ?? 0);
      const paddedNumber = String(nextNumber).padStart(Number(res.padding ?? 0), "0");
      setSerie({
        value: res.id,
        label: `${res.code}${res.separator ?? "-"}${paddedNumber}`,
      });
      setForm((prev) => ({ ...prev, serieId: res.id }));
    } catch {
      setSerie({ value: "", label: "" });
      setForm((prev) => ({ ...prev, serieId: "" }));
      showFlash(errorResponse("Error al cargar series"));
    }
  };

  const searchProducts = async () => {
    try {
      const res = await listSkus({
        q: query,
        productType: ProductTypes.PRODUCT,
      });
      const response = res ?? undefined;
      setSearchResults(response);
      setProductsCache((prev) => mergeSkuCache(prev, response));
    } catch {
      showFlash(errorResponse("Error al cargar productos"));
    }
  };

  const productOptions = useMemo(
    () =>
      (searchResults?.items ?? []).map((v) => {
        const attrsText = formatAttrs(v.attributes); 

        return {
          value: v.sku.id,
          label: `${v.sku.name}${
            attrsText ? ` ${attrsText}` : ""
          }${v.sku.backendSku ? ` -${v.sku.backendSku}` : ""}${
            v.sku.customSku ? ` (${v.sku.customSku})` : ""
          }`,
        };
      }),
    [searchResults],
  );

  const addItem = () => {
    const { itemId, quantity, unitCost } = pendingItem;

    const selected =
      searchResults?.items.find((p) => p.sku.id === itemId) ??
      productsCache?.items.find((p) => p.sku.id === itemId);

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

    setProductsCache((prev) => {
      const selectedId = selected.sku.id;
      if (!selectedId) return prev;
      const items = prev?.items ?? [];
      const exists = items.some((p) => p.sku.id === selectedId);
      if (exists) return prev;
      return {
        ...(prev ?? {}),
        items: [...items, selected],
        total: [...items, selected].length,
        page: 1,
        limit: [...items, selected].length,
      };
    });
    setPendingItem(buildEmptyItemOutOrder());
  };

  const updateItem = useCallback((index: number, patch: Partial<AddOutOrderItemDto>) => {
    startTransition(() => {
      setForm((prev) => ({
        ...prev,
        items: (prev.items ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
      }));
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    startTransition(() => {
      setForm((prev) => ({
        ...prev,
        items: (prev.items ?? []).filter((_, i) => i !== index),
      }));
    });
  }, []);

  const totalCost = useMemo(() => {
    return (form.items ?? []).reduce((acc, item) => acc + item.quantity * (item.unitCost ?? 0), 0);
  }, [form.items]);

  const saveOrder = async () => {
    clearFlash();
    if (!form.warehouseId || !form.serieId) {
      showFlash(errorResponse("Completa los datos del documento"));
      return;
    }
    if (!form.items?.length) {
      showFlash(errorResponse("Agrega al menos un item"));
      return;
    }
    setLoading(true);

    const sendItems = form.items.map((obj)=>({
      skuId:obj.itemId,
      quantity:obj.quantity,
      unitCost:obj.unitCost ?? undefined
    }));
    try {
      const payload: CreateOutOrder = {
        docType:form.docType,
        warehouseId: form.warehouseId,
        direction:Direction.OUT,
        note: form.note?.trim() || undefined,
        items: sendItems ?? [],
      };
      const res = await createOutOrder(payload);
      const nextId = res.documentId ?? "";
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
        setSearchResults(undefined);
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
      const product = productsCache?.items.find((p) => (p.sku.id) === item.itemId);
      const attrsText = formatAttrs(product?.attributes);
      return {
        id: `${item.itemId}-${index}`,
        itemId: item.itemId,
        sku: product?.sku.backendSku ?? "-",
        productName: `${product?.sku.name} ${
            attrsText ? ` ${attrsText}` : ""
          }${product?.sku.backendSku ? ` -${product.sku.backendSku}` : ""}${
            product?.sku.customSku ? ` (${product.sku.customSku})` : ""
          }`,
        customSku: product?.sku.customSku,
        unitName: product?.unit?.name ?? "-",
        quantity: item.quantity,
        unitCost: item.unitCost,
      };
    });
  }, [form.items, productsCache]);

  const handleWarehouseChange = useCallback((value: string) => {
    startTransition(() => {
      setForm((prev) => ({ ...prev, warehouseId: value, serieId: "" }));
    });
    void loadSeries(value);
  }, []);

  const handleNoteChange = useCallback((value: string) => {
    startTransition(() => {
      setForm((prev) => ({ ...prev, note: value }));
    });
  }, []);

  const columns = useMemo<DataTableColumn<OutOrderItemRow>[]>(() => [
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
  ], [itemRows, removeItem, updateItem]);

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
                  value={pendingItem.itemId ?? ""}
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

            <div className="flex-1 overflow-auto">
              <DataTable
                tableId="out-order-items-table"
                data={itemRows}
                columns={columns}
                rowKey="id"
                loading={false}
                emptyMessage="Aun no agregas items."
                hoverable={false}
                animated={false}
                responsiveMode="table"
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
                  name="warehouseId"
                  value={form.warehouseId}
                  onChange={handleWarehouseChange}
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
                onChange={(e) => handleNoteChange(e.target.value)}
              />
            </div>

            <div className="border-t border-black/10 px-4 py-3">
              <div className="flex gap-2">
                <SystemButton variant="outline" className="flex-1" onClick={resetForm}>
                  Limpiar
                </SystemButton>

                <SystemButton
                  className="flex-1"
                  disabled={loading || !form.warehouseId || !form.serieId || !(form.items ?? []).length}
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
        onClose={handleCloseItemModal}
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
