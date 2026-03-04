import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AfectType,
  CurrencyType,
  CurrencyTypes,
  PaymentFormTypes,
  PaymentTypes,
  PurchaseOrderStatuses,
  VoucherDocTypes,
} from "@/types/purchaseEnums";
import type { AfectTypeType } from "@/types/purchaseEnums";
import { FinishedProducts } from "@/types/variant";
import { listRowMaterials } from "@/services/catalogService";
import { listAll } from "@/services/supplierService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { FilterableSelect } from "@/components/SelectFilterable";
import type { CreatePurchaseOrderDto, CreditQuota, Payment, PurchaseOrder, PurchaseOrderItem } from "@/types/purchase";
import { SupplierFormModal } from "../providers/components/SupplierFormModal";
import { ProductFormModal } from "../catalog/components/ProductFormModal";
import { WarehouseFormModal } from "../warehouse/components/WarehouseFormModal";
import { ProductTypes } from "@/types/ProductTypes";
import { Modal } from "@/components/settings/modal";
import { ProductEquivalence } from "@/types/equivalence";
import { listProductEquivalences } from "@/services/equivalenceService";
import { listUnits } from "@/services/unitService";
import type { ListUnitResponse } from "@/types/unit";
import { createPurchaseOrder } from "@/services/purchaseService";
import { WarehouseOption } from "@/types/warehouse";
import { SupplierOption } from "@/types/supplier";
import { listActive } from "@/services/warehouseServices";

const PRIMARY = "#21b8a6";
const IGV = 0.18;

const money = (n: number, currency: CurrencyType) => {
  const symbol = currency === "PEN" ? "S/" : "$";
  return `${symbol} ${n.toFixed(2)}`;
};

const unitValueFromPrice = (unitPrice: number, afectType: AfectTypeType) => {
  if (afectType === AfectType.TAXED) {
    return unitPrice / (1 + IGV);
  }
  return unitPrice;
};

const recalcItem = (item: PurchaseOrderItem): PurchaseOrderItem => {
  const quantity = Math.max(0, item.quantity);
  const unitPrice = Math.max(0, item.unitPrice);
  const unitValue = unitValueFromPrice(unitPrice, item.afectType);
  const baseWithoutIgv = unitValue * quantity;
  const amountIgv =
    item.afectType === AfectType.TAXED ? unitPrice * quantity - baseWithoutIgv : 0;

  return {
    ...item,
    quantity,
    unitPrice,
    unitValue,
    baseWithoutIgv,
    amountIgv,
    porcentageIgv: item.afectType === AfectType.TAXED ? IGV * 100 : 0,
    purchaseValue: baseWithoutIgv,
  };
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};

const addDaysToIsoDate = (days?: number | null) => {
  if (days === null || days === undefined) return "";
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const addDaysToIsoDateFrom = (baseIso: string, days?: number | null) => {
  if (!baseIso) return "";
  if (days === null || days === undefined) return baseIso;
  const date = new Date(`${baseIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const tryShowPicker = (input: HTMLInputElement) => {
  try {
    input.showPicker?.();
  } catch {
    // Ignore when the browser blocks programmatic picker opening.
  }
};

const clampQuotas = (creditDays: number, numQuotas: number) => {
  if (creditDays <= 0) return 0;
  const safeNum = Math.max(1, numQuotas);
  return Math.min(safeNum, creditDays);
};

const splitAmount = (total: number, parts: number) => {
  if (parts <= 0) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / parts);
  const amounts = Array.from({ length: parts }, () => base);
  const remainder = totalCents - base * parts;
  if (remainder > 0) {
    amounts[parts - 1] += remainder;
  }
  return amounts.map((c) => Number((c / 100).toFixed(2)));
};

const buildQuotas = (baseDateIso: string, creditDays: number, numQuotas: number, total: number): CreditQuota[] => {
  const safeNum = clampQuotas(creditDays, numQuotas);
  if (safeNum <= 0 || creditDays <= 0) return [];
  const amounts = splitAmount(total, safeNum);
  const quotas: CreditQuota[] = [];
  for (let i = 1; i <= safeNum; i += 1) {
    const dayOffset = i === safeNum ? creditDays : Math.floor((creditDays * i) / safeNum);
    quotas.push({
      number: i,
      expirationDate: addDaysToIsoDateFrom(baseDateIso, dayOffset),
      totalToPay: amounts[i - 1] ?? 0,
      totalPaid: 0,
    });
  }
  return quotas;
};

const buildEmptyForm = (): PurchaseOrder => ({
  supplierId: "",
  warehouseId: "",
  documentType: VoucherDocTypes.NOTA_VENTA,
  serie: "",
  correlative: 0,
  currency: CurrencyTypes.PEN,
  paymentForm: PaymentFormTypes.CONTADO,
  creditDays: 0,
  numQuotas: 0,
  totalTaxed: 0,
  totalExempted: 0,
  totalIgv: 0,
  purchaseValue: 0,
  total: 0,
  note: "",
  status: PurchaseOrderStatuses.DRAFT,
  expectedAt: "",
  dateIssue: todayIso(),
  dateExpiration: "",
  isActive: true,
  items: [],
  payments: [],
  quotas: [],
});


export default function PurchaseCreateLocal() {
  const { showFlash, clearFlash } = useFlashMessage();
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<FinishedProducts[]>([]);
  const [stockItemId, setStockItemId] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [equivalences, setEquivalences] = useState<ProductEquivalence[]>([]);
  const [units, setUnits] = useState<ListUnitResponse>();
  const [equivalenceProductId, setEquivalenceProductId] = useState<string | null>(null);
  const [pendingItemAfectType, setPendingItemAfectType] = useState<AfectTypeType>(AfectType.TAXED);
  const [pendingItemQuantity, setPendingItemQuantity] = useState<number>(1);
  const [pendingItemUnitPrice, setPendingItemUnitPrice] = useState<number>(0);
  const [pendingFactor, setPendingFactor] = useState<number>(0);
  const [pendingEquivalence, setPendingEquivalence] = useState<string | null>(null);
  const [pendingUnitBase, setPendingUnitBase] = useState<string | null>(null);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  
  const [openAddSupplier, setOpenAddSupplier] = useState(false);
  const [openCreateWarehouse, setOpenCreateWarehouse] = useState(false);
  const [openCreatePrima, setOpenCreatePrima] = useState(false);
  const [openEquivalences, setOpenEquivalence] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);

  const [form, setForm] = useState<PurchaseOrder>(() => buildEmptyForm());

  const ringStyle = { "--tw-ring-color": `${PRIMARY}33` } as CSSProperties;

  const loadPrimaVariants = async () => {
    try {
      const result = await listRowMaterials();
      const normalized = (result ?? [])
        .map((row) => ({
          ...row,
          stockItemId: row.stockItemId ?? row.id ?? row.primaId ?? "",
          isActive: row.isActive ?? true,
        }))
        .filter((row) => row.stockItemId);
      setProducts(normalized);
    } catch {
      setProducts([]);
      showFlash(errorResponse("Error al cargar variantes PRIMA"));
    }
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
            days: s.leadTimeDays
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
        res?.map((s) => {
          const direction = `${s.name} (${s.department}-${s.province}-${s.district})`;
          return {
            value: s.warehouseId,
            label: direction
          };
        }) ?? [];
      setWarehouseOptions(options);
    } catch {
      setWarehouseOptions([]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  };

  const loadUnits = async () => {
    try {
      const res = await listUnits();
      setUnits(res);
    } catch {
      showFlash(errorResponse("Error al cargar unidades"));
    }
  };

  const loadEquivalences = async (productId: string) => {
      setLoading(true);
      try {
          const res = await listProductEquivalences({ productId });
          const list = res ?? [];
          setEquivalences(list);
          if (list.length > 0) {
              const best = list.reduce((acc, curr) =>
                  (curr.factor ?? 0) > (acc.factor ?? 0) ? curr : acc
              );
              const fromLabel = (units ?? []).find((u) => u.id === best.fromUnitId);
              const toLabel = (units ?? []).find((u) => u.id === best.toUnitId);
              const fromName = fromLabel?.name ?? "UNIDADES";
              const toName = toLabel?.name ?? "UNIDADES";
              setPendingEquivalence(fromName);
              setPendingUnitBase(toName);
              setPendingFactor(best.factor ?? 1);
          } else {
              setPendingEquivalence("UNIDADES");
              setPendingUnitBase("UNIDADES");
              setPendingFactor(1);
          }
      } catch {
          setEquivalences([]);
          showFlash(errorResponse("Error al cargar equivalencias"));
      } finally {
          setLoading(false);
      }
  };

  const openEquivalenceModal = async (productId: string) => {
    if (!productId) return;
    setEquivalenceProductId(productId);
    setOpenEquivalence(true);
    setPendingItemAfectType(AfectType.TAXED);
    setPendingItemQuantity(1);
    setPendingItemUnitPrice(0);
    await loadEquivalences(productId);
  };

  useEffect(() => {
    void loadPrimaVariants();
    void loadSuppliers();
    void loadUnits();
    void loadWarehouses();
  }, []);

  const productOptions = (products ?? []).map((v) => ({
    value: v.stockItemId ?? v.id ?? "",
    label: `${v.productName ?? "Producto"} (${v.sku ?? "-"})`,
  }));

  const addSelectedProduct = (id?: string,  opts?: {
    quantity?: number;
    unitPrice?: number;
    afectType?: AfectTypeType;
    equivalence?: string | null;
    factor?: number;
    unitBase?: string | null;
  }) => {
    const selectedId = id ?? stockItemId;
    if (!selectedId) return;
    const quantity = Math.max(1, opts?.quantity ?? 1);
    const unitPrice = Math.max(0, opts?.unitPrice ?? 0);
    const afectType = opts?.afectType ?? AfectType.TAXED;
    const equivalence = opts?.equivalence ?? "";
    const factor = Math.max(0, opts?.factor ?? 0);
    const unitBase = opts?.unitBase ?? "";

    setForm((prev) => {
      const items = prev.items ?? [];
      const existing = items.find((item) => item.stockItemId === selectedId);

      if (existing) {
        const nextItems = items.map((item) =>
          item.stockItemId === selectedId
          ? recalcItem({ ...item, quantity: item.quantity + quantity, unitPrice, afectType, equivalence,
            factor, unitBase })
            : item
        );
        return { ...prev, items: nextItems };
      }

     const newItem: PurchaseOrderItem = recalcItem({
      stockItemId: selectedId,
      unitBase,
      equivalence,
      factor,
      afectType,
      quantity,
      porcentageIgv: IGV * 100,
      baseWithoutIgv: 0,
      amountIgv: 0,
      unitValue: 0,
      unitPrice,
      purchaseValue: 0,
    });


      return { ...prev, items: [...items, newItem] };
    });

    setStockItemId("");
  };

  const updateItem = (itemId: string, patch: Partial<PurchaseOrderItem>) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).map((item) =>
        item.stockItemId === itemId ? recalcItem({ ...item, ...patch }) : item
      ),
    }));
  };

  const removeItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((item) => item.stockItemId !== itemId),
    }));
  };

  const totals = useMemo(() => {
    const items = form.items ?? [];
    const summary = items.reduce(
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
      { totalPrice: 0, totalValue: 0, totalIgv: 0, totalTaxed: 0, totalExempted: 0 }
    );
    return summary;
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
      const product = products.find((p) => p.stockItemId === item.stockItemId);
      return {
        item,
        sku: product?.sku ?? "-",
        name: product?.productName ?? "Producto",
        unit: product?.unitName ?? "-",
      };
    });
  }, [form.items, products]);

  const addPayment = (amount?: number) => {
    setForm((prev) => ({
      ...prev,
      payments: [
        ...(prev.payments ?? []),
        {
          method: PaymentTypes.EFECTIVO,
          date: todayIso(),
          operationNumber: "",
          currency: prev.currency,
          amount: Math.max(0, amount ?? 0),
          note: "",
        },
      ],
    }));
  };

  const updatePayment = (index: number, patch: Partial<Payment>) => {
    setForm((prev) => ({
      ...prev,
      payments: (prev.payments ?? []).map((payment, i) => (i === index ? { ...payment, ...patch } : payment)),
    }));
  };

  const removePayment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      payments: (prev.payments ?? []).filter((_, i) => i !== index),
    }));
  };

  const updateQuota = (index: number, patch: Partial<CreditQuota>) => {
    setForm((prev) => ({
      ...prev,
      quotas: (prev.quotas ?? []).map((quota, i) => (i === index ? { ...quota, ...patch } : quota)),
    }));
  };

  const removeQuota = (index: number) => {
    setForm((prev) => {
      const quotas = (prev.quotas ?? []).filter((_, i) => i !== index);
      return { ...prev, quotas, numQuotas: quotas.length };
    });
  };

  const resetForm = () => {
    setForm(buildEmptyForm());
    setStockItemId("");
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
      items: form.items ?? [],
      payments: (form.payments ?? []).map((p) => ({
          currency: p.currency,
          date: p.date,
          method: p.method,
          amount: p.amount,
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
    console.log("Purchase payload:", payload);
    clearFlash();
    try {
      const res = await createPurchaseOrder(payload);

      if(res.type === 'success'){
        showFlash(successResponse("Compra registrada."));
        setOpenPaymentModal(false);
        resetForm();
      }
      if(res.type === 'error'){
        showFlash(errorResponse("Registro fallido."));
      }
    } catch {
      showFlash(errorResponse("Error al registrar la compra."));
    }
  };

  const clearEquivalence = () =>{
     setOpenEquivalence(false);
     setEquivalenceProductId(null);
     setEquivalences([]);
     setPendingItemQuantity(0);
     setPendingItemUnitPrice(0);
     setPendingFactor(0);
     setPendingEquivalence("");
     setPendingUnitBase("");
  }

  const showCredit = form.paymentForm === PaymentFormTypes.CREDITO;
  const currency = form.currency;
  const totalPaid = (form.payments ?? []).reduce((acc, p) => acc + (p.amount ?? 0), 0);
  const pendingAmount = Math.max(0, totals.totalPrice - totalPaid);

  return (
      <div className="w-full min-h-screen bg-white text-black">
          <div className="h-screen w-full px-4 sm:px-6 lg:px-8 py-6">
              <div className="mt-6 grid h-[calc(100vh-80px)] grid-cols-1 gap-4 lg:grid-cols-[4fr_2fr]">
                  <section className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
                      <div className="border-b border-black/10 p-4 sm:p-5">
                          <p className="text-sm font-semibold">Productos</p>

                          <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-[85%_1fr] px-0">
                              <div className="relative">
                                  <FilterableSelect
                                      value={stockItemId}
                                      onChange={(value) => {
                                          setStockItemId(value);
                                          void openEquivalenceModal(value);
                                      }}
                                      options={productOptions}
                                      placement="bottom"
                                      placeholder="Seleccionar producto"
                                      searchPlaceholder="Buscar producto..."
                                  />
                              </div>
                              <button
                                  type="button"
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border p-4 text-sm text-white focus:outline-none focus:ring-2"
                                  style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                                  onClick={() => setOpenCreatePrima(true)}
                              >
                                  <Plus className="h-4 w-4" />
                                  <span className="font-semibold">Crear</span>
                              </button>
                          </div>
                      </div>

                      <div className="flex-1 overflow-auto">
                          <table className="w-full text-sm">
                              <thead className="sticky top-0 z-10 bg-white">
                                  <tr className="border-b border-black/10 text-xs text-black/60">
                                      <th className="py-3 px-5 text-left">SKU</th>
                                      <th className="py-3 px-5 text-left">Producto</th>
                                      <th className="py-3 px-5 text-left">Unidad</th>
                                      <th className="py-3 px-5 text-left">Cantidad</th>
                                      <th className="py-3 px-5 text-right">Precio unit.</th>
                                      <th className="py-3 px-5 text-right">Precio total</th>
                                      <th className="py-3 px-5 text-right">Acciones</th>
                                  </tr>
                              </thead>

                              <tbody>
                                  {itemsView.map(({ item, sku, name }) => {
                                      const totalPrice = item.quantity * item.unitPrice;

                                      return (
                                          <tr key={item.stockItemId} className="border-b border-black/5">
                                              <td className="py-3 px-5">
                                                  <div className="text-black/70">{sku}</div>
                                              </td>
                                              <td className="py-3 px-5">
                                                  <div className="text-black/70">{name}</div>
                                              </td>
                                              <td className="py-3 px-5 text-black/70">
                                                  {item.equivalence} x {item.factor}
                                              </td>

                                              <td className="py-3 px-5">
                                                  <input
                                                      type="number"
                                                      min={1}
                                                      className="h-10 w-24 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                                      style={ringStyle}
                                                      value={item.quantity}
                                                      onChange={(e) => updateItem(item.stockItemId, { quantity: Number(e.target.value) })}
                                                  />
                                              </td>

                                              <td className="py-3 px-5 text-right text-black/70 tabular-nums">
                                                  <input
                                                      type="number"
                                                      min={0}
                                                      className="h-10 w-24 rounded-xl border border-black/10 bg-white px-3 text-sm text-right outline-none focus:ring-2"
                                                      style={ringStyle}
                                                      value={item.unitPrice}
                                                      onChange={(e) => updateItem(item.stockItemId, { unitPrice: Number(e.target.value) })}
                                                  />
                                              </td>
                                              <td className="py-3 px-5 text-right text-black/70 tabular-nums">{money(totalPrice, currency)}</td>

                                              <td className="py-3 px-5">
                                                  <div className="flex items-center justify-end">
                                                      <button
                                                          type="button"
                                                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03] text-rose-600"
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

                          {itemsView.length === 0 && <div className="px-5 py-10 text-sm text-black/60">Aun no agregas productos.</div>}
                      </div>

                      <div className="border-t border-black/10 px-4 sm:px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-xs text-black/60">Nota: "Precio" incluye IGV. "Valor" es base sin IGV (IGV {Math.round(IGV * 100)}%).</div>
                              <div className="flex items-center gap-2">
                                  <div className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
                                      Total valor: <span className="font-semibold text-black">{money(totals.totalValue, currency)}</span>
                                  </div>
                                  <div className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs">
                                      Total precio: <span className="font-semibold text-black">{money(totals.totalPrice, currency)}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </section>

                  <aside className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
                      <div className="border-b border-black/10 px-4 sm:px-5 py-3">
                          <p className="text-sm font-semibold">Datos del comprobante</p>
                      </div>
                      <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                  <label className="text-xs text-black/60">Tipo de comprobante</label>
                                  <select
                                      className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={form.documentType}
                                      onChange={(e) => setForm((prev) => ({ ...prev, documentType: e.target.value as PurchaseOrder["documentType"] }))}
                                  >
                                      <option value={VoucherDocTypes.FACTURA}>Factura</option>
                                      <option value={VoucherDocTypes.BOLETA}>Boleta</option>
                                      <option value={VoucherDocTypes.NOTA_VENTA}>Nota de venta</option>
                                  </select>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs text-black/60">Moneda</label>
                                  <select
                                      className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={form.currency}
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
                                  <label className="text-xs text-black/60">Serie</label>
                                  <input
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={form.serie}
                                      onChange={(e) => setForm((prev) => ({ ...prev, serie: e.target.value }))}
                                      placeholder="F001"
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs text-black/60">Numero</label>
                                  <input
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={form.correlative ? String(form.correlative) : ""}
                                      onChange={(e) => setForm((prev) => ({ ...prev, correlative: Number(e.target.value || 0) }))}
                                      placeholder="00000001"
                                  />
                              </div>
                          </div>

                          <div className="space-y-1">
                              <label className="text-xs text-black/60">Almacen</label>
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
                                  />

                                  <button
                                      type="button"
                                      className="inline-flex h-10 w-11 items-center justify-center rounded-xl border text-white focus:outline-none focus:ring-2"
                                      style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33`, ...ringStyle }}
                                      title="Agregar almacen"
                                      onClick={() => setOpenCreateWarehouse(true)}
                                  >
                                      <Plus className="h-4 w-4" />
                                  </button>
                              </div>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs text-black/60">Proveedor</label>
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
                                  />

                                  <button
                                      type="button"
                                      className="inline-flex h-10 w-11 items-center justify-center rounded-xl border text-white focus:outline-none focus:ring-2"
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
                                  <label className="text-xs text-black/60">Fecha de emision</label>
                                  <input
                                      type="date"
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={toDateInputValue(form.dateIssue)}
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
                                                  quotas: prev.paymentForm === PaymentFormTypes.CREDITO ? buildQuotas(nextDate, creditDays, numQuotas, totals.totalPrice) : (prev.quotas ?? []),
                                              };
                                          });
                                      }}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs text-black/60">Fecha de ingreso a almacen</label>
                                  <input
                                      type="date"
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={toDateInputValue(form.expectedAt)}
                                      onClick={(e) => tryShowPicker(e.currentTarget)}
                                      onChange={(e) => setForm((prev) => ({ ...prev, expectedAt: e.target.value }))}
                                  />
                              </div>
                          </div>

                          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-4">
                              <p className="text-xs font-semibold text-black">Resumen</p>
                              <div className="mt-2 space-y-1 text-xs text-black/70">
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

                      <div className="border-t border-black/10 px-4 sm:px-5 py-4">
                          <div className="flex gap-2">
                              <button type="button" className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03]" onClick={resetForm}>
                                  Limpiar
                              </button>
                              <button
                                  type="button"
                                  className="flex-1 rounded-xl border px-4 py-2 text-sm text-white disabled:opacity-40"
                                  style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                                  disabled={
                                    !form.items?.length || !form.serie.trim() || !form.supplierId
                                    || !form.correlative || !form.warehouseId || form.total === 0 
                                  }
                                  onClick={() => {
                                      setForm((prev) => ({
                                          ...prev,
                                          paymentForm: PaymentFormTypes.CONTADO,
                                          creditDays: 0,
                                          numQuotas: 0,
                                          quotas: [],
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
                                      }));
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
              onSaved={() => {
                  void loadPrimaVariants();
              }}
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
          {openEquivalences && (
              <Modal
                  onClose={() => {
                      setOpenEquivalence(false);
                      setEquivalenceProductId(null);
                      setEquivalences([]);
                  }}
                  title="Agregar Producto"
                  className="w-md"
              >
                  <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-1">
                      <label className="text-sm">
                          Tipo de afectación
                          <select
                              className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm"
                              value={pendingItemAfectType}
                              onChange={(e) => setPendingItemAfectType(e.target.value as AfectTypeType)}
                          >
                              <option value={AfectType.TAXED}>GRAVADA - OPERACION ONEROSA</option>
                              <option value={AfectType.EXEMPT}>EXONERADA - OPERACION ONEROSA</option>
                          </select>
                      </label>
                      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="text-sm">
                              Cantidad
                              <input
                                  type="number"
                                  min={1}
                                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                                  value={pendingItemQuantity}
                                  onChange={(e) => setPendingItemQuantity(Number(e.target.value || 1))}
                              />
                          </label>
                          <label className="text-sm">
                              Precio unit.
                              <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
                                  value={pendingItemUnitPrice}
                                  onChange={(e) => setPendingItemUnitPrice(Number(e.target.value || 0))}
                              />
                          </label>
                      </div>
                  </div>
                  <div className="rounded-xl border border-black/10 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 text-xs text-black/60">
                          <span>Listado de equivalencias</span>
                          <span>{loading ? "Cargando..." : `${equivalences.length} registros`}</span>
                      </div>
                      <div className="max-h-56 overflow-auto">
                          <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-white z-10">
                                  <tr className="border-b border-black/10 text-xs text-black/60">
                                      <th className="py-2 px-5 text-left">Unidad de medida</th>
                                      <th className="py-2 px-5 text-left">Equivalencia</th>
                                      <th></th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {equivalences.map((eq) => {
                                      const fromLabel = (units ?? []).find((u) => u.id === eq.fromUnitId);
                                      const toLabel = (units ?? []).find((u) => u.id === eq.toUnitId);
                                      const fromName = fromLabel?.name ?? "UNIDADES";
                                      const toName = toLabel?.name ?? "UNIDADES";
                                      const isActive = pendingEquivalence === fromName && pendingUnitBase === toName && pendingFactor === (eq.factor ?? 1);
                                      return (
                                          <tr
                                              key={eq.id}
                                              className={`border-b border-black/5 hover:bg-gray-300 hover:text-white cursor-pointer ${isActive ? "bg-gray-300 text-white" : ""}`}
                                              onClick={() => {
                                                  setPendingEquivalence(fromName || "UNIDADES");
                                                  setPendingFactor(eq.factor ?? 1);
                                                  setPendingUnitBase(toName || "UNIDADES");
                                              }}
                                          >
                                              <td className="py-2 px-5 text-left">{fromLabel ? `${fromLabel.name} x ${eq.factor}` : eq.fromUnitId}</td>
                                              <td className="py-2 px-5 text-left">
                                                  Equivale a {eq.factor} - {toLabel?.name ?? eq.toUnitId}
                                              </td>
                                              <td>
                                                  <span className="text-xs text-black/40"></span>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                          {!loading && equivalences.length === 0 && <div className="px-4 py-4 text-sm text-black/60">No hay equivalencias registradas.</div>}
                      </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                      <button
                          className="rounded-xl border border-black/10 px-4 py-2 text-sm"
                          onClick={() => {
                              clearEquivalence();
                          }}
                      >
                          Cancelar
                      </button>
                      <button
                          className="rounded-xl border px-4 py-2 text-sm text-white"
                          style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                          onClick={() => {
                              clearFlash();
                              if (!equivalenceProductId) return;
                              const hasSelection = Boolean(pendingEquivalence || pendingUnitBase);
                              const hasEquivalences = equivalences.length > 0;
                              if (hasEquivalences && !hasSelection) {
                                  showFlash(errorResponse("Debe elegir una equivalencia"));
                                  return;
                              }
                              addSelectedProduct(equivalenceProductId, {
                                  quantity: pendingItemQuantity,
                                  unitPrice: pendingItemUnitPrice,
                                  afectType: pendingItemAfectType,
                                  equivalence: pendingEquivalence,
                                  factor: pendingFactor,
                                  unitBase: pendingUnitBase,
                              });
                              clearEquivalence();
                          }}
                      >
                          Agregar
                      </button>
                  </div>
              </Modal>
          )}
          {openPaymentModal && (
              <Modal onClose={() => setOpenPaymentModal(false)} title="Agregar Pago" className="max-w-[800px]">
                  <div className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs text-black/60">Forma de pago</label>
                          <select
                              className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                              style={ringStyle}
                              value={form.paymentForm}
                              onChange={(e) => {
                                  const next = e.target.value as PurchaseOrder["paymentForm"];
                                  setForm((prev) => {
                                      if (next !== PaymentFormTypes.CREDITO) {
                                          return {
                                              ...prev,
                                              paymentForm: next,
                                              creditDays: 0,
                                              numQuotas: 0,
                                              quotas: [],
                                          };
                                      }
                                      const baseDate = toDateInputValue(prev.dateIssue) || todayIso();
                                      const creditDays = Math.max(0, prev.creditDays ?? 0);
                                      const numQuotas = clampQuotas(creditDays, prev.numQuotas ?? 0);
                                      return {
                                          ...prev,
                                          paymentForm: next,
                                          creditDays,
                                          numQuotas,
                                          payments: [],
                                          quotas: buildQuotas(baseDate, creditDays, numQuotas, totals.totalPrice),
                                      };
                                  });
                              }}
                          >
                              <option value={PaymentFormTypes.CONTADO}>Contado</option>
                              <option value={PaymentFormTypes.CREDITO}>Credito</option>
                          </select>
                      </div>

                      {showCredit && (
                          <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                  <label className="text-xs text-black/60">Dias de credito</label>
                                  <input
                                      type="number"
                                      min={0}
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={form.creditDays ?? 0}
                                      onChange={(e) => {
                                          const creditDays = Math.max(0, Number(e.target.value || 0));
                                          setForm((prev) => {
                                              const baseDate = toDateInputValue(prev.dateIssue) || todayIso();
                                              const nextNum = clampQuotas(creditDays, prev.numQuotas ?? 0);
                                              return {
                                                  ...prev,
                                                  creditDays,
                                                  numQuotas: nextNum,
                                                  quotas: buildQuotas(baseDate, creditDays, nextNum, totals.totalPrice),
                                              };
                                          });
                                      }}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs text-black/60">Numero de cuotas</label>
                                  <input
                                      type="number"
                                      min={0}
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2"
                                      style={ringStyle}
                                      value={form.numQuotas ?? 0}
                                      onChange={(e) => {
                                          const rawNum = Math.max(0, Number(e.target.value || 0));
                                          setForm((prev) => {
                                              const creditDays = Math.max(0, prev.creditDays ?? 0);
                                              const nextNum = clampQuotas(creditDays, rawNum);
                                              const baseDate = toDateInputValue(prev.dateIssue) || todayIso();
                                              return {
                                                  ...prev,
                                                  numQuotas: nextNum,
                                                  quotas: buildQuotas(baseDate, creditDays, nextNum, totals.totalPrice),
                                              };
                                          });
                                      }}
                                  />
                              </div>
                          </div>
                      )}

                      {!showCredit && (
                          <div className="rounded-3xl border border-black/10 bg-white p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold">Pagos</p>
                                  <button
                                      type="button"
                                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs text-white focus:outline-none focus:ring-2"
                                      style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                                      onClick={() => addPayment(pendingAmount)}
                                  >
                                      <Plus className="h-4 w-4" />
                                      Agregar
                                  </button>
                              </div>

                              {(form.payments ?? []).length === 0 && <div className="text-xs text-black/60">Aun no agregas pagos.</div>}

                              {(form.payments ?? []).map((payment, index) => {
                                  const otherPaid = totalPaid - (payment.amount ?? 0);
                                  const maxForPayment = Math.max(0, totals.totalPrice - otherPaid);
                                  return (
                                      <div key={`payment-${index}`} className="rounded-xl border border-black/10 p-3 space-y-2">
                                          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_50px] gap-2">
                                              <select
                                                  className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                  style={ringStyle}
                                                  value={payment.method}
                                                  onChange={(e) => updatePayment(index, { method: e.target.value as Payment["method"] })}
                                              >
                                                  {Object.values(PaymentTypes).map((method) => (
                                                      <option key={method} value={method}>
                                                          {method}
                                                      </option>
                                                  ))}
                                              </select>
                                              <input
                                                  type="date"
                                                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                  style={ringStyle}
                                                  value={toDateInputValue(payment.date)}
                                                  onClick={(e) => tryShowPicker(e.currentTarget)}
                                                  onChange={(e) => updatePayment(index, { date: e.target.value })}
                                              />

                                              <select
                                                  className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                  style={ringStyle}
                                                  value={payment.currency}
                                                  onChange={(e) => updatePayment(index, { currency: e.target.value as CurrencyType })}
                                              >
                                                  <option value={CurrencyTypes.PEN}>PEN (S/)</option>
                                                  <option value={CurrencyTypes.USD}>USD ($)</option>
                                              </select>
                                              <input
                                                  type="number"
                                                  min={0}
                                                  max={maxForPayment}
                                                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                  style={ringStyle}
                                                  value={payment.amount}
                                                  onChange={(e) => {
                                                      const next = Number(e.target.value || 0);
                                                      updatePayment(index, { amount: Math.min(Math.max(0, next), maxForPayment) });
                                                  }}
                                                  placeholder="Monto"
                                              />
                                              <div className="flex justify-end">
                                                  <button
                                                      type="button"
                                                      className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs text-rose-600"
                                                      onClick={() => removePayment(index)}
                                                  >
                                                      <Trash2 className="h-5 w-5" />
                                                  </button>
                                              </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                              <input
                                                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                  style={ringStyle}
                                                  value={payment.note ?? ""}
                                                  onChange={(e) => updatePayment(index, { note: e.target.value })}
                                                  placeholder="Número de operación"
                                              />
                                              <input
                                                  className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                  style={ringStyle}
                                                  value={payment.note ?? ""}
                                                  onChange={(e) => updatePayment(index, { note: e.target.value })}
                                                  placeholder="Nota"
                                              />
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}

                      {showCredit && (
                          <div className="rounded-3xl border border-black/10 bg-white p-4 space-y-3">
                              {(form.quotas ?? []).length === 0 && <div className="text-xs text-black/60">Aun no agregas cuotas.</div>}
                              <div className="flex-1 overflow-auto">
                                  <table className="w-full text-sm">
                                      <thead className="sticky top-0 z-10 bg-white">
                                          <tr className="border-b border-black/10 text-xs text-black/60">
                                              <th className="py-3 px-5 text-left">Fecha de pago</th>
                                              <th className="py-3 px-5 text-left">Total a pagar</th>
                                              <th className="py-3 px-5 text-right"></th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {(form.quotas ?? []).map((quota, index) => (
                                              <tr key={`quota-${index}`}>
                                                  <td className="py-2 px-5">
                                                      <input
                                                          type="date"
                                                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                          style={ringStyle}
                                                          value={toDateInputValue(quota.expirationDate)}
                                                          onClick={(e) => tryShowPicker(e.currentTarget)}
                                                          onChange={(e) => updateQuota(index, { expirationDate: e.target.value })}
                                                      />
                                                  </td>
                                                  <td className="py-2 px-5">
                                                      <input
                                                          type="number"
                                                          min={0}
                                                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                                                          style={ringStyle}
                                                          value={quota.totalToPay}
                                                          onChange={(e) => updateQuota(index, { totalToPay: Number(e.target.value || 0) })}
                                                          placeholder="Total a pagar"
                                                      />
                                                  </td>
                                                  <td className="py-2 px-5">
                                                      <div className="flex justify-end">
                                                          <button
                                                              type="button"
                                                              className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs text-rose-600"
                                                              onClick={() => removeQuota(index)}
                                                          >
                                                              <Trash2 className="h-5 w-5" />
                                                          </button>
                                                      </div>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}

                      <div
                          className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-md
                        font-semibold space-y-1"
                      >
                          <div className="flex items-center justify-between">
                              <span>Total pagado</span>
                              <span className="font-semibold">{money(totalPaid, currency)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                              <span>Pendiente</span>
                              <span className="font-semibold">{money(pendingAmount, currency)}</span>
                          </div>
                      </div>

                      <div className="flex justify-end gap-2">
                          <button className="rounded-xl border border-black/10 px-4 py-2 text-sm" onClick={() => setOpenPaymentModal(false)}>
                              Cerrar
                          </button>
                          <button
                              type="button"
                              className="rounded-xl border px-4 py-2 text-sm text-white disabled:opacity-40"
                              style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                              disabled={!form.items?.length || !form.serie.trim() || !form.supplierId}
                              onClick={savePurchase}
                          >
                              Generar Comprobante
                          </button>
                      </div>
                  </div>
              </Modal>
          )}
      </div>
  );
}
