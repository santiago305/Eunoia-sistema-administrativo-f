import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AfectType,
  CurrencyType,
  CurrencyTypes,
  PaymentFormTypes,
  PaymentTypes,
  VoucherDocTypes,
} from "@/pages/purchases/types/purchaseEnums";
import { FinishedProducts } from "@/pages/catalog/types/variant";
import { searchProductAndVariant } from "@/services/catalogService";
import { listAll } from "@/services/supplierService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { FilterableSelect } from "@/components/SelectFilterable";
import type {
  CreatePurchaseOrderDto,
  PurchaseOrder,
  PurchaseOrderItem,
} from "@/pages/purchases/types/purchase";
import { SupplierFormModal } from "../providers/components/SupplierFormModal";
import { ProductFormModal } from "../catalog/components/ProductFormModal";
import { WarehouseFormModal } from "../warehouse/components/WarehouseFormModal";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { createPurchaseOrder, updatePurchaseOrder } from "@/services/purchaseService";
import { listActive } from "@/services/warehouseServices";
import { EquivalenceModal } from "./components/EquivalenceModal";
import { PurchasePaymentModal } from "./components/PurchasePaymentModal";
import { ModalNavegate } from "./components/ModalNavegate";
import {
  buildEmptyForm,
  recalcItem,
  money,
  addDaysToIsoDate,
  toDateTimeInputValue,
  tryShowPicker,
  clampQuotas,
  addDaysToIsoDateFrom,
  buildQuotas,
  todayIso,
} from "@/utils/functionPurchases";
import { useNavigate, useParams } from "react-router-dom";
import { getById } from "@/services/purchaseService";
import { SupplierOption } from "../providers/types/supplier";
import { WarehouseSelectOption } from "../warehouse/types/warehouse";

const PRIMARY = "#21b8a6";
const IGV = 0.18;

export default function PurchaseCreateLocal() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();

  const [products, setProducts] = useState<FinishedProducts[]>([]);
  const [itemId, setItemId] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);

  const [openAddSupplier, setOpenAddSupplier] = useState(false);
  const [openCreateWarehouse, setOpenCreateWarehouse] = useState(false);
  const [openCreatePrima, setOpenCreatePrima] = useState(false);
  const [openEquivalences, setOpenEquivalence] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [lastSavedPoId, setLastSavedPoId] = useState("");

  const [productQuery, setProductQuery] = useState("");

  const [form, setForm] = useState<PurchaseOrder>(() => buildEmptyForm());
  const { poId } = useParams<{ poId: string }>();
  const isEdit = Boolean(poId);

  const ringStyle = { "--tw-ring-color": `${PRIMARY}33` } as CSSProperties;

  const mergeProducts = (current: FinishedProducts[], incoming: FinishedProducts[]) => {
    const map = new Map<string, FinishedProducts>();

    current.forEach((item) => {
      const key = item.itemId ?? item.id ?? "";
      if (!key) return;
      map.set(key, item);
    });

    incoming.forEach((item) => {
      const key = item.itemId ?? item.id ?? "";
      if (!key) return;
      map.set(key, item);
    });

    return Array.from(map.values());
  };

  const searchPrimaVariants = async () => {
    if (!productQuery.trim()) return;

    try {
      const result = await searchProductAndVariant({
        q: productQuery,
        raw: true,
      });

      const normalized: FinishedProducts[] = (result ?? [])
        .map((row: any) => {
          const resolvedItemId = row.itemId ?? row.primaId ?? row.id ?? "";
          const resolvedProductId = row.productId ?? (row.type === "PRODUCT" ? resolvedItemId : undefined);
          const resolvedVariantId = row.variantId ?? (row.type === "VARIANT" ? resolvedItemId : null);

          return {
            ...row,
            id: resolvedItemId,
            itemId: resolvedItemId,
            productId: resolvedProductId,
            variantId: resolvedVariantId,
            isActive: row.isActive ?? true,
          };
        })
        .filter((row) => row.itemId);

      setProducts((prev) => (isEdit ? mergeProducts(prev, normalized) : normalized));
    } catch {
      if (!isEdit) setProducts([]);
      showFlash(errorResponse("Error al cargar variantes PRIMA"));
    }
  };

  const mapOrderProducts = (items: PurchaseOrderItem[]) => {
    const map = new Map<string, FinishedProducts>();

    items.forEach((item) => {
      const product = item.stockItem?.product;
      const variant = item.stockItem?.variant;

      const resolvedItemId = item.stockItemId;
      if (!resolvedItemId || map.has(resolvedItemId)) return;

      map.set(resolvedItemId, {
        id: resolvedItemId,
        itemId: resolvedItemId,
        productId: product?.id ?? variant?.productId ?? undefined,
        variantId: variant?.id ?? null,
        sku: variant?.sku ?? product?.sku ?? undefined,
        productName: variant?.productName ?? product?.name ?? undefined,
        productDescription: variant?.productDescription ?? product?.description ?? undefined,
        unitName: variant?.unitName ?? product?.baseUnitName ?? undefined,
        unitCode: variant?.unitCode ?? product?.baseUnitCode ?? undefined,
        baseUnitId: variant?.baseUnitId ?? product?.baseUnitId ?? undefined,
        isActive: variant?.isActive ?? product?.isActive ?? undefined,
        type: item.stockItem?.type ?? undefined,
      });
    });

    return Array.from(map.values());
  };

  const loadSuppliers = async () => {
    clearFlash();
    try {
      const res = await listAll();
      const options =
        res?.map((s) => {
          const fullName = [s.name, s.lastName].filter(Boolean).join(" ").trim();
          const display = (fullName || s.tradeName || "").trim();
          const doc = s.documentNumber ? ` (${s.documentNumber})` : "";
          return {
            value: s.supplierId,
            label: `${display}${doc}`.trim() || s.supplierId,
            days: s.leadTimeDays,
          };
        }) ?? [];
      setSupplierOptions(options);
    } catch {
      setSupplierOptions([]);
      showFlash(errorResponse("Error al cargar proveedores"));
    }
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

  useEffect(() => {
    void loadSuppliers();
    void loadWarehouses();
  }, []);

  const productOptions = (products ?? []).map((v) => ({
    value: v.itemId,
    label: `${v.productName ?? "Producto"} (${v.sku ?? "-"})`,
  }));

  const updateItem = (itemIdToUpdate: string, patch: Partial<PurchaseOrderItem>) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).map((item) =>
        item.stockItemId === itemIdToUpdate ? recalcItem({ ...item, ...patch }) : item,
      ),
    }));
  };

  const removeItem = (itemIdToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((item) => item.stockItemId !== itemIdToRemove),
    }));
  };

  const totals = useMemo(() => {
    const items = form.items ?? [];
    return items.reduce(
      (acc, item) => {
        const lineTotal = item.unitPrice * item.quantity;
        const lineValue = item.purchaseValue;
        const lineIgv = item.amountIgv;
        const isTaxed = item.afectType === AfectType.TAXED;

        acc.totalPrice += lineTotal;
        acc.totalValue += lineValue;
        acc.totalIgv += lineIgv;
        acc.totalTaxed += isTaxed ? lineValue : 0;
        acc.totalExempted += !isTaxed ? lineValue : 0;

        return acc;
      },
      { totalPrice: 0, totalValue: 0, totalIgv: 0, totalTaxed: 0, totalExempted: 0 },
    );
  }, [form.items]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      totalTaxed: totals.totalTaxed,
      totalExempted: totals.totalExempted,
      totalIgv: totals.totalIgv,
      purchaseValue: totals.totalValue,
      total: totals.totalPrice,
    }));
  }, [totals.totalTaxed, totals.totalExempted, totals.totalIgv, totals.totalValue, totals.totalPrice]);

  const itemsView = useMemo(() => {
    return (form.items ?? []).map((item) => {
      const product = products.find((p) => p.itemId === item.stockItemId);

      return {
        item,
        sku: product?.sku ?? "-",
        name: product?.productName ?? "Producto",
        unit: product?.unitName ?? "-",
      };
    });
  }, [form.items, products]);

  const resetForm = () => {
    setForm(buildEmptyForm());
    setItemId("");
  };

  const savePurchase = async () => {
    if (!form.items?.length || !form.serie.trim() || !form.supplierId) return;

    const payload: CreatePurchaseOrderDto = {
      supplierId: form.supplierId,
      warehouseId: form.warehouseId,
      documentType: form.documentType,
      serie: form.serie,
      correlative: Number(form.correlative ?? 0),
      currency: form.currency,
      paymentForm: form.paymentForm,
      creditDays: form.creditDays ?? 0,
      numQuotas: form.numQuotas ?? 0,
      totalTaxed: form.totalTaxed,
      totalExempted: form.totalExempted,
      totalIgv: form.totalIgv,
      purchaseValue: form.purchaseValue,
      total: form.total,
      note: form.note ?? "",
      status: form.status,
      expectedAt: form.expectedAt ?? "",
      dateIssue: form.dateIssue ?? "",
      dateExpiration: form.dateExpiration ? form.dateExpiration : undefined,
      items: (form.items ?? []).map(({ stockItem, ...rest }) => rest),
      payments: (form.payments ?? []).map((p) => ({
        currency: p.currency,
        date: p.date,
        method: p.method,
        amount: p.amount ?? 0,
        quotaId: p.quotaId ?? undefined,
        poId: p.poId ?? undefined,
        note: p.note ?? undefined,
        operationNumber: p.operationNumber ?? undefined,
      })),
      quotas: (form.quotas ?? []).map((q) => ({
        number: q.number,
        expirationDate: q.expirationDate,
        paymentDate: q.paymentDate ?? undefined,
        totalToPay: q.totalToPay,
        totalPaid: q.totalPaid ?? undefined,
        poId: q.poId ?? undefined,
      })),
    };

    clearFlash();

    try {
      const res = poId ? await updatePurchaseOrder(poId, payload) : await createPurchaseOrder(payload);

      if (res.type === "success") {
        showFlash(successResponse("Compra registrada."));
        const nextPoId = res.order?.poId ?? poId ?? "";
        if (nextPoId) setLastSavedPoId(nextPoId);
        setOpenPaymentModal(false);
        setOpenNavigateModal(true);
      }

      if (res.type === "error") {
        showFlash(errorResponse("Registro fallido."));
      }
    } catch {
      showFlash(errorResponse("Error al registrar la compra."));
    }
  };

  useEffect(() => {
    if (!poId) return;

    const loadPurchase = async () => {
      try {
        const data = await getById(poId);

        setForm((prev) => ({
          ...prev,
          ...data,
          items: (data.items ?? []).map(({ stockItem, ...rest }) => rest),
          payments: data.payments ?? [],
          quotas: data.quotas ?? [],
        }));

        const mappedProducts = mapOrderProducts(data.items ?? []);
        setProducts(mappedProducts);
      } catch {
        showFlash(errorResponse("Error al cargar la compra."));
      }
    };

    void loadPurchase();
  }, [poId, showFlash]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (productQuery.trim()) {
        void searchPrimaVariants();
      } else if (!isEdit) {
        setProducts([]);
      }
    }, 500);

    return () => clearTimeout(id);
  }, [productQuery, isEdit]);

  const currency = form.currency;

  return (
    <div className="w-full min-h-screen bg-white text-black">
      <div className="h-screen w-full px-3 sm:px-4 lg:px-6 py-0">
        <div className="mt-4 grid h-[calc(100vh-64px)] grid-cols-1 gap-3 lg:grid-cols-[4fr_2fr]">
          <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-black/10 p-3 sm:p-4">
              <p className="text-xs font-semibold">Productos</p>

              <div className="mt-2 grid gap-2 xl:grid-cols-[85%_1fr] px-0 grid-cols-[85%_1fr]">
                <div className="relative">
                  <FilterableSelect
                    value={itemId}
                    onChange={(value) => {
                      setItemId(value);
                      if (value) {
                        setOpenEquivalence(true);
                      } else {
                        setOpenEquivalence(false);
                      }
                    }}
                    options={productOptions}
                    placement="bottom"
                    placeholder="Seleccionar producto"
                    searchPlaceholder="Buscar producto..."
                    onSearchChange={(text) => setProductQuery(text)}
                  />
                </div>

                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs text-white focus:outline-none focus:ring-2"
                  style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                  onClick={() => setOpenCreatePrima(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-semibold">Crear</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-black/10 text-[11px] text-black/60">
                    <th className="py-2 px-4 text-left">SKU</th>
                    <th className="py-2 px-4 text-left">Producto</th>
                    <th className="py-2 px-4 text-left">Unidad</th>
                    <th className="py-2 px-4 text-left">Cantidad</th>
                    <th className="py-2 px-4 text-right">Precio unit.</th>
                    <th className="py-2 px-4 text-right">Precio total</th>
                    <th className="py-2 px-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {itemsView.map(({ item, sku, name }) => {
                    const totalPrice = item.quantity * item.unitPrice;

                    return (
                      <tr key={item.stockItemId} className="border-b border-black/5">
                        <td className="py-2 px-4">
                          <div className="text-black/70">{sku}</div>
                        </td>

                        <td className="py-2 px-4">
                          <div className="text-black/70">{name}</div>
                        </td>

                        <td className="py-2 px-4 text-black/70">
                          {item.equivalence} x {item.factor}
                        </td>

                        <td className="py-2 px-4">
                          <input
                            type="number"
                            min={1}
                            className="h-9 w-20 rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                            style={ringStyle}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.stockItemId, { quantity: Number(e.target.value) })
                            }
                          />
                        </td>

                        <td className="py-2 px-4 text-right text-black/70 tabular-nums">
                          <input
                            type="number"
                            min={0}
                            className="h-9 w-20 rounded-lg border border-black/10 bg-white px-2 text-xs text-right outline-none focus:ring-2"
                            style={ringStyle}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.stockItemId, { unitPrice: Number(e.target.value) })
                            }
                          />
                        </td>

                        <td className="py-2 px-4 text-right text-black/70 tabular-nums">
                          {money(totalPrice, currency)}
                        </td>

                        <td className="py-2 px-4">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white hover:bg-black/[0.03] text-rose-600"
                              title="Eliminar"
                              onClick={() => removeItem(item.stockItemId)}
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

              {itemsView.length === 0 && (
                <div className="px-4 py-8 text-xs text-black/60">Aun no agregas productos.</div>
              )}
            </div>

            <div className="border-t border-black/10 px-3 sm:px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-black/60">
                  Nota: "Precio" incluye IGV. "Valor" es base sin IGV (IGV {Math.round(IGV * 100)}%).
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                    Total valor: <span className="font-semibold text-black">{money(totals.totalValue, currency)}</span>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
                    Total precio: <span className="font-semibold text-black">{money(totals.totalPrice, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-black/10 px-3 sm:px-4 py-2">
              <p className="text-xs font-semibold">Datos del comprobante</p>
            </div>

            <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-black/60">Tipo de comprobante</label>
                  <select
                    className="h-9 w-full appearance-none rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                    style={ringStyle}
                    value={form.documentType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        documentType: e.target.value as PurchaseOrder["documentType"],
                      }))
                    }
                  >
                    <option value={VoucherDocTypes.FACTURA}>Factura</option>
                    <option value={VoucherDocTypes.BOLETA}>Boleta</option>
                    <option value={VoucherDocTypes.NOTA_VENTA}>Nota de venta</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-black/60">Moneda</label>
                  <select
                    className="h-9 w-full appearance-none rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                    style={ringStyle}
                    value={form.currency}
                    disabled={true}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        currency: e.target.value as CurrencyType,
                      }))
                    }
                  >
                    <option value={CurrencyTypes.PEN}>PEN (S/)</option>
                    <option value={CurrencyTypes.USD}>USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-black/60">Serie</label>
                  <input
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                    style={ringStyle}
                    value={form.serie}
                    onChange={(e) => setForm((prev) => ({ ...prev, serie: e.target.value }))}
                    placeholder="F001"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-black/60">Numero</label>
                  <input
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                    style={ringStyle}
                    value={form.correlative ? String(form.correlative) : ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        correlative: Number(e.target.value || 0),
                      }))
                    }
                    placeholder="00000001"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-black/60">Almacen</label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <FilterableSelect
                    value={form.warehouseId}
                    onChange={(value) => {
                      setForm((prev) => ({
                        ...prev,
                        warehouseId: value,
                      }));
                    }}
                    options={warehouseOptions}
                    placement="bottom"
                    placeholder="Seleccionar almacen"
                    searchPlaceholder="Buscar almacen..."
                    className="h-9"
                    textSize="text-[11px]"
                  />

                  <button
                    type="button"
                    className="inline-flex h-9 w-10 items-center justify-center rounded-lg border text-white focus:outline-none focus:ring-2"
                    style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33`, ...ringStyle }}
                    title="Agregar almacen"
                    onClick={() => setOpenCreateWarehouse(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-black/60">Proveedor</label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <FilterableSelect
                    value={form.supplierId}
                    onChange={(value) => {
                      const selected = supplierOptions.find((s) => s.value === value);
                      const leadDays = selected?.days ?? 0;

                      setForm((prev) => ({
                        ...prev,
                        supplierId: value,
                        expectedAt: addDaysToIsoDate(leadDays),
                      }));
                    }}
                    options={supplierOptions}
                    placement="bottom"
                    placeholder="Seleccionar proveedor"
                    searchPlaceholder="Buscar proveedor..."
                    className="h-9"
                    textSize="text-[11px]"
                  />

                  <button
                    type="button"
                    className="inline-flex h-9 w-10 items-center justify-center rounded-lg border text-white focus:outline-none focus:ring-2"
                    style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33`, ...ringStyle }}
                    title="Agregar proveedor"
                    onClick={() => setOpenAddSupplier(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-black/60">Fecha de emision</label>
                  <input
                    type="datetime-local"
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                    style={ringStyle}
                    value={toDateTimeInputValue(form.dateIssue)}
                    onClick={(e) => tryShowPicker(e.currentTarget)}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      const selected = supplierOptions.find((s) => s.value === form.supplierId);
                      const leadDays = selected?.days ?? 0;

                      setForm((prev) => {
                        const creditDays = Math.max(0, prev.creditDays ?? 0);
                        const numQuotas = clampQuotas(creditDays, prev.numQuotas ?? 0);

                        return {
                          ...prev,
                          dateIssue: nextDate,
                          expectedAt: addDaysToIsoDateFrom(nextDate, leadDays),
                          quotas:
                            prev.paymentForm === PaymentFormTypes.CREDITO
                              ? buildQuotas(nextDate, creditDays, numQuotas, totals.totalPrice)
                              : (prev.quotas ?? []),
                        };
                      });
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-black/60">Fecha de ingreso a almacen</label>
                  <input
                    type="datetime-local"
                    className="h-9 w-full rounded-lg border border-black/10 bg-white px-2 text-xs outline-none focus:ring-2"
                    style={ringStyle}
                    value={toDateTimeInputValue(form.expectedAt)}
                    onClick={(e) => tryShowPicker(e.currentTarget)}
                    onChange={(e) => setForm((prev) => ({ ...prev, expectedAt: e.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 mt-2">
                <p className="text-[11px] font-semibold text-black">Resumen</p>
                <div className="mt-2 space-y-1 text-[11px] text-black/70">
                  <div className="flex items-center justify-between">
                    <span>Items</span>
                    <span className="font-semibold tabular-nums">{itemsView.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total valor</span>
                    <span className="font-semibold tabular-nums">{money(totals.totalValue, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total precio</span>
                    <span className="font-semibold tabular-nums">{money(totals.totalPrice, currency)}</span>
                  </div>
                </div>
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
                    !form.items?.length ||
                    !form.serie.trim() ||
                    !form.supplierId ||
                    !form.correlative ||
                    !form.warehouseId ||
                    form.total === 0
                  }
                  onClick={() => {
                    setForm((prev) => {
                      const shouldInit = !isEdit;
                      return {
                        ...prev,
                        paymentForm: shouldInit ? PaymentFormTypes.CONTADO : prev.paymentForm,
                        creditDays: shouldInit ? 0 : prev.creditDays,
                        numQuotas: shouldInit ? 0 : prev.numQuotas,
                        quotas: shouldInit ? [] : prev.quotas,
                        payments:
                          (prev.payments ?? []).length > 0
                            ? prev.payments
                            : [
                                {
                                  method: PaymentTypes.EFECTIVO,
                                  date: todayIso(),
                                  operationNumber: "",
                                  currency: prev.currency,
                                  amount: totals.totalPrice,
                                  note: "",
                                },
                              ],
                      };
                    });
                    setOpenPaymentModal(true);
                  }}
                >
                  Agregar Pago
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {openAddSupplier && (
        <SupplierFormModal
          open={openAddSupplier}
          mode="create"
          onClose={() => setOpenAddSupplier(false)}
          onSaved={() => {
            void loadSuppliers();
          }}
          primaryColor={PRIMARY}
        />
      )}

      <ProductFormModal
        open={openCreatePrima}
        mode="create"
        productType={ProductTypes.PRIMA}
        primaryColor={PRIMARY}
        entityLabel="materia prima"
        onClose={() => setOpenCreatePrima(false)}
      />

      <WarehouseFormModal
        open={openCreateWarehouse}
        mode="create"
        onClose={() => setOpenCreateWarehouse(false)}
        onSaved={() => {
          void loadWarehouses();
        }}
        primaryColor={PRIMARY}
        entityLabel="almacén"
      />

      <EquivalenceModal
        open={openEquivalences}
        itemId={itemId}
        products={products}
        documentType={form.documentType}
        primaryColor={PRIMARY}
        igv={IGV}
        setForm={setForm}
        setItemId={setItemId}
        onClose={() => setOpenEquivalence(false)}
      />

      {openPaymentModal && (
        <PurchasePaymentModal
          open={openPaymentModal}
          onClose={() => setOpenPaymentModal(false)}
          form={form}
          setForm={setForm}
          totalPrice={totals.totalPrice}
          ringStyle={ringStyle}
          primaryColor={PRIMARY}
          currency={currency}
          formatMoney={money}
          onSave={savePurchase}
          saveDisabled={!form.items?.length || !form.serie.trim() || !form.supplierId}
          isEdit={isEdit}
        />
      )}

      <ModalNavegate
        open={openNavigateModal}
        onClose={() => setOpenNavigateModal(false)}
        onNewPurchase={() => {
          setOpenNavigateModal(false);
          resetForm();
          setLastSavedPoId("");
          if (isEdit) {
            navigate("/compra");
          }
        }}
        onGoToList={() => {
          setOpenNavigateModal(false);
          navigate("/compras");
        }}
        poId={lastSavedPoId || poId}
        primaryColor={PRIMARY}
        isEdit={isEdit}
      />
    </div>
  );
}
