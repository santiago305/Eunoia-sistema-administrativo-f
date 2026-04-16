import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Newspaper, Boxes, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import {
  AfectType,
  CurrencyType,
  CurrencyTypes,
  PaymentFormTypes,
  PaymentTypes,
  VoucherDocTypes,
} from "@/pages/purchases/types/purchaseEnums";
import { listSuppliers } from "@/services/supplierService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { FloatingDateTimePicker } from "@/components/date-picker/FloatingDateTimePicker";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import type {
  CreatePurchaseOrderDto,
  PurchaseOrder,
  PurchaseOrderItem,
} from "@/pages/purchases/types/purchase";
import { SupplierFormModal } from "../providers/components/SupplierFormModal";
import { WarehouseFormModal } from "../warehouse/components/WarehouseFormModal";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { createPurchaseOrder, updatePurchaseOrder } from "@/services/purchaseService";
import { listActiveWarehouses } from "@/services/warehouseServices";
import { EquivalenceModal } from "./components/EquivalenceModal";
import { PurchasePaymentModal } from "./components/PurchasePaymentModal";
import { ModalNavegate } from "./components/ModalNavegate";
import { PageShell } from "@/components/layout/PageShell";
import {
  buildEmptyForm,
  recalcItem,
  money,
  addDaysToIsoDate,
  clampQuotas,
  addDaysToIsoDateFrom,
  buildQuotas,
  todayIso,
  normalizeMoney,
  normalizePrice,
  normalizeQuantity,
  parseDecimalInput,
  lineTotalFromItem,
} from "@/utils/functionPurchases";
import { useNavigate, useParams } from "react-router-dom";
import { getById } from "@/services/purchaseService";
import { SupplierOption } from "../providers/types/supplier";
import { WarehouseSelectOption } from "../warehouse/types/warehouse";
import { listSkus } from "@/services/skuService";
import type { ListSkusResponse } from "@/pages/catalog/types/product";
import {
  buildPurchaseSkuLabel,
  mapSkuToPurchaseSkuInfo,
  mergePurchaseSkus,
  type PurchaseSkuInfo,
} from "./utils/purchaseSkus";

const PRIMARY = "hsl(var(--primary))";
const IGV = 0.18;

const toLocalDateTimeString = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const parseDateValue = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type PurchaseItemRow = {
  id: string;
  skuId: string;
  sku: string;
  name?: string;
  unit: string;
  equivalence: string | number;
  factor: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type PurchaseCreateLocalProps = {
  inModal?: boolean;
  poIdOverride?: string;
  onClose?: () => void;
  onSaved?: (poId: string) => void | Promise<void>;
};

export default function PurchaseCreateLocal({
  inModal = false,
  poIdOverride,
  onClose,
  onSaved,
}: PurchaseCreateLocalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();

  const [products, setProducts] = useState<PurchaseSkuInfo[]>([]);
  const [searchResults, setSearchResults] = useState<ListSkusResponse>();
  const [itemId, setItemId] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openCreateWarehouse, setOpenCreateWarehouse] = useState(false);
  const [openEquivalences, setOpenEquivalence] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [lastSavedPoId, setLastSavedPoId] = useState("");

  const [productQuery, setProductQuery] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [appliedSupplierSearch, setAppliedSupplierSearch] = useState("");

  const [form, setForm] = useState<PurchaseOrder>(() => buildEmptyForm());
  const { poId: routePoId } = useParams<{ poId: string }>();
  const effectivePoId = poIdOverride ?? routePoId;
  const isEdit = Boolean(effectivePoId);

  const ringStyle = {
    "--tw-ring-color": `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
  } as CSSProperties;

  const documentTypeOptions = [
    { value: VoucherDocTypes.FACTURA, label: "Factura" },
    { value: VoucherDocTypes.BOLETA, label: "Boleta" },
    { value: VoucherDocTypes.NOTA_VENTA, label: "Nota de venta" },
  ];

  const currencyOptions = [
    { value: CurrencyTypes.PEN, label: "PEN (S/)" },
    { value: CurrencyTypes.USD, label: "USD ($)" },
  ];

  const searchMaterialSkus = async (query: string) => {
    if (!query.trim()) return;

    try {
      const response = await listSkus({
        q: query,
        productType: ProductTypes.MATERIAL,
        isActive: true,
        page: 1,
        limit: 50,
      });

      const mapped = (response.items ?? []).map(mapSkuToPurchaseSkuInfo);
      setSearchResults(response);
      setProducts((prev) => mergePurchaseSkus(prev, mapped));
    } catch {
      setSearchResults(undefined);
      if (!isEdit) setProducts([]);
      showFlash(errorResponse("Error al cargar SKUs de materia prima"));
    }
  };

  const loadSuppliers = async (appliedSearch: string) => {
    clearFlash();
    try {
      const res = await listSuppliers({
        page: 1,
        limit: 100,
        q: appliedSearch?.trim() || undefined,
      });

      const options = (res.items ?? []).map((s) => {
        const fullName = [s.name, s.lastName].filter(Boolean).join(" ").trim();
        const display = (fullName || s.tradeName || "").trim();
        const doc = s.documentNumber ? ` (${s.documentNumber})` : "";
        return {
          value: s.supplierId,
          label: `${display}${doc}`.trim() || s.supplierId,
          days: s.leadTimeDays,
        };
      });
      setSupplierOptions(options);
    } catch {
      setSupplierOptions([]);
      showFlash(errorResponse("Error al cargar proveedores"));
    }
  };

  const loadWarehouses = async () => {
    clearFlash();
    try {
      const res = await listActiveWarehouses({ page: 1, limit: 100 });
      const options =
        (res.items ?? []).map((warehouse) => ({
          value: warehouse.warehouseId,
          label: warehouse.name,
        })) ?? [];
      setWarehouseOptions(options);
    } catch {
      setWarehouseOptions([]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  };

  const productOptions = useMemo(
    () =>
      (searchResults?.items ?? [])
        .map(mapSkuToPurchaseSkuInfo)
        .map((sku) => ({
          value: sku.skuId,
          label: buildPurchaseSkuLabel(sku),
        })),
    [searchResults],
  );

  const updateItem = (itemIdToUpdate: string, patch: Partial<PurchaseOrderItem>) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).map((item) => {
        if (item.skuId !== itemIdToUpdate) return item;

        const normalizedPatch: Partial<PurchaseOrderItem> = { ...patch };

        if (normalizedPatch.quantity !== undefined) {
          normalizedPatch.quantity = normalizeQuantity(normalizedPatch.quantity);
        }

        if (normalizedPatch.unitPrice !== undefined) {
          normalizedPatch.unitPrice = normalizePrice(normalizedPatch.unitPrice);
        }

        return recalcItem({ ...item, ...normalizedPatch });
      }),
    }));
  };

  const removeItem = (itemIdToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((item) => item.skuId !== itemIdToRemove),
    }));
  };

  const totals = useMemo(() => {
    const items = form.items ?? [];

    return items.reduce(
      (acc, item) => {
        const lineTotal = normalizeMoney(lineTotalFromItem(item));
        const lineValue = normalizeMoney(item.purchaseValue ?? 0);
        const lineIgv = normalizeMoney(item.amountIgv ?? 0);
        const isTaxed = item.afectType === AfectType.TAXED;

        acc.totalPrice = normalizeMoney(acc.totalPrice + lineTotal);
        acc.totalValue = normalizeMoney(acc.totalValue + lineValue);
        acc.totalIgv = normalizeMoney(acc.totalIgv + lineIgv);
        acc.totalTaxed = normalizeMoney(acc.totalTaxed + (isTaxed ? lineValue : 0));
        acc.totalExempted = normalizeMoney(acc.totalExempted + (!isTaxed ? lineValue : 0));

        return acc;
      },
      { totalPrice: 0, totalValue: 0, totalIgv: 0, totalTaxed: 0, totalExempted: 0 },
    );
  }, [form.items]);

  const itemRows = useMemo<PurchaseItemRow[]>(() => {
    return (form.items ?? []).map((item) => {
      const product = products.find((p) => p.skuId === item.skuId);

      return {
        id: item.skuId,
        skuId: item.skuId,
        sku: product?.backendSku ?? product?.customSku ?? "-",
        name: item.name ?? "-",
        unit: item.unitBase ?? "-",
        equivalence: item.equivalence,
        factor: Number(item.factor ?? 1),
        quantity: normalizeQuantity(item.quantity ?? 0),
        unitPrice: normalizePrice(item.unitPrice ?? 0),
        totalPrice: normalizeMoney(lineTotalFromItem(item)),
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
      totalTaxed: normalizeMoney(form.totalTaxed),
      totalExempted: normalizeMoney(form.totalExempted),
      totalIgv: normalizeMoney(form.totalIgv),
      purchaseValue: normalizeMoney(form.purchaseValue),
      total: normalizeMoney(form.total),
      note: form.note ?? "",
      status: form.status,
      expectedAt: form.expectedAt ?? "",
      dateIssue: form.dateIssue ?? "",
      dateExpiration: form.dateExpiration ? form.dateExpiration : undefined,
      items: (form.items ?? []).map(({ sku, name ,...rest }) => ({
        ...rest,
        quantity: normalizeQuantity(rest.quantity),
        unitPrice: normalizePrice(rest.unitPrice),
        unitValue: normalizePrice(rest.unitValue),
        baseWithoutIgv: normalizeMoney(rest.baseWithoutIgv),
        amountIgv: normalizeMoney(rest.amountIgv),
        purchaseValue: normalizeMoney(rest.purchaseValue),
      })),
      payments: (form.payments ?? []).map((p) => ({
        currency: p.currency,
        date: p.date,
        method: p.method,
        amount: normalizeMoney(p.amount ?? 0),
        quotaId: p.quotaId ?? undefined,
        poId: p.poId ?? undefined,
        note: p.note ?? undefined,
        operationNumber: p.operationNumber ?? undefined,
      })),
      quotas: (form.quotas ?? []).map((q) => ({
        number: q.number,
        expirationDate: q.expirationDate,
        paymentDate: q.paymentDate ?? undefined,
        totalToPay: normalizeMoney(q.totalToPay),
        totalPaid: normalizeMoney(q.totalPaid ?? 0),
        poId: q.poId ?? undefined,
      })),
    };

    clearFlash();

    try {
      const res = effectivePoId ? await updatePurchaseOrder(effectivePoId, payload) : await createPurchaseOrder(payload);
      if (res.type === "success") {
        showFlash(successResponse("Compra registrada."));
        const nextPoId = res.order?.poId ?? effectivePoId ?? "";
        if (nextPoId) setLastSavedPoId(nextPoId);
        setOpenPaymentModal(false);
        setOpenNavigateModal(true);
        if (nextPoId) {
          await onSaved?.(nextPoId);
        }
      }

      if (res.type === "error") {
        showFlash(errorResponse("Registro fallido."));
      }
    } catch {
      showFlash(errorResponse("Error al registrar la compra."));
    }
  };

  const loadPurchase = async (poId: string) => {
    try {
      const data = await getById(poId);
      const skusFromOrder = (data.items ?? [])
        .map((item) => item.sku ?? null).filter((sku): 
        sku is NonNullable<typeof sku> => Boolean(sku?.sku?.id));
      if (skusFromOrder.length > 0) {
        setProducts((prev) => mergePurchaseSkus(prev, skusFromOrder.map(mapSkuToPurchaseSkuInfo)));
      }

      setForm((prev) => ({
        ...prev,
        ...data,
        items: (data.items ?? []).map((item) => {
          const { sku, ...rest } = item;
          const skuEntity = sku?.sku;
          const skuId = sku?.sku.id ?? "";
          const skuInfo = sku ? mapSkuToPurchaseSkuInfo(sku) : undefined;
          const resolvedName =
            skuInfo ? buildPurchaseSkuLabel(skuInfo) : (skuEntity?.name ?? rest.name ?? "SKU");

          return recalcItem({
            ...rest,
            skuId,
            name: resolvedName,
            sku: skuEntity
              ? {
                  id: skuEntity.id,
                  backendSku: skuEntity.backendSku ?? null,
                  customSku: skuEntity.customSku ?? null,
                  name: skuEntity.name ?? null,
                }
              : undefined,
            factor: Number(rest.factor ?? 1),
          });
        }),
        payments: data.payments ?? [],
        quotas: data.quotas ?? [],
      }));
    } catch {
      showFlash(errorResponse("Error al cargar la compra."));
    }
  };

  useEffect(() => {
    if (!effectivePoId) return;
    void loadPurchase(effectivePoId);
  }, [effectivePoId]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (productQuery.trim()) {
        void searchMaterialSkus(productQuery);
      } else {
        setSearchResults(undefined);
      }
    }, 1000);

    return () => clearTimeout(id);
  }, [productQuery, isEdit]);

  useEffect(() => {
    const id = setTimeout(() => {
      setAppliedSupplierSearch(supplierQuery);
    }, 500);

    return () => clearTimeout(id);
  }, [supplierQuery]);

  useEffect(() => {
    void loadSuppliers(appliedSupplierSearch);
  }, [appliedSupplierSearch]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      totalTaxed: normalizeMoney(totals.totalTaxed),
      totalExempted: normalizeMoney(totals.totalExempted),
      totalIgv: normalizeMoney(totals.totalIgv),
      purchaseValue: normalizeMoney(totals.totalValue),
      total: normalizeMoney(totals.totalPrice),
    }));
  }, [totals.totalTaxed, totals.totalExempted, totals.totalIgv, totals.totalValue, totals.totalPrice]);

  useEffect(() => {
    void loadWarehouses();
  }, []);

  const handleCreateSaved = () => {
    setOpenCreate(false);
    void loadSuppliers(appliedSupplierSearch);
  };

  const currency = form.currency;

  const itemColumns = useMemo<DataTableColumn<PurchaseItemRow>[]>(() => {
    return [
      {
        id: "name",
        header: "Producto",
        cell: (row) => (
          <span className="text-black/70">
            {row.name}
          </span>
        ),
        headerClassName: "text-left",
        sortable: false,
      },
      {
        id: "unit",
        header: "Unidad",
        cell: (row) => (
          <span className="text-black/70">
            {row.equivalence} x {row.factor}
          </span>
        ),
        headerClassName: "text-left",
        sortable: false,
      },
      {
        id: "quantity",
        header: "Cantidad",
        cell: (row) => (
          <div className="w-24">
            <FloatingInput
              label="Cant."
              name={`quantity-${row.skuId}`}
              type="number"
              min={0}
              step="0.001"
              value={String(row.quantity)}
              onChange={(e) =>
                updateItem(row.skuId, {
                  quantity: parseDecimalInput(e.target.value),
                })
              }
              className="h-9 text-xs"
            />
          </div>
        ),
        headerClassName: "text-left",
        hideable: false,
        sortable: false,
      },
      {
        id: "unitPrice",
        header: "Precio unit.",
        cell: (row) => (
          <div className="w-24">
            <FloatingInput
              label="P. unit"
              name={`unit-price-${row.skuId}`}
              type="number"
              min={0}
              step="0.0001"
              value={String(row.unitPrice)}
              onChange={(e) =>
                updateItem(row.skuId, {
                  unitPrice: parseDecimalInput(e.target.value),
                })
              }
              className="h-9 text-xs text-right"
            />
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
        sortable: false,
      },
      {
        id: "totalPrice",
        header: "Precio total",
        cell: (row) => (
          <div className="w-28">
            <FloatingInput
              label="Total"
              name={`total-price-${row.skuId}`}
              type="number"
              min={0}
              step="0.01"
              value={String(row.totalPrice || 0)}
              onChange={(e) => {
                const nextTotal = normalizeMoney(parseDecimalInput(e.target.value));
                const nextUnitPrice =
                  row.quantity > 0 ? normalizePrice(nextTotal / row.quantity) : 0;

                updateItem(row.skuId, { unitPrice: nextUnitPrice });
              }}
              className="h-9 text-xs text-right"
            />
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
        sortable: false,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: (row) => (
          <div className="flex items-center justify-end">
            <SystemButton
              variant="danger"
              size="icon"
              className="h-8 w-8"
              title="Eliminar"
              onClick={() => removeItem(row.skuId)}
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
        sortable: false,
      },
    ];
  }, []);

  const content = (
    <>
      <div className={inModal ? "w-full" : "h-screen w-full py-0"}>
        <div
          className={`mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[6fr_2.5fr] ${
            inModal ? "h-[80vh]" : "h-[calc(100vh-64px)]"
          }`}
        >
          <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-black/10 p-3 sm:p-4">
              <SectionHeaderForm icon={Boxes} title="Productos" />

              <div className="mt-2 grid gap-2 xl:grid-cols-1">
                <FloatingSelect
                  label="Producto"
                  name="producto"
                  value={itemId}
                  onChange={(value) => {
                    setItemId(value);
                    setOpenEquivalence(Boolean(value));
                  }}
                  options={productOptions}
                  searchable
                  searchPlaceholder="Buscar producto..."
                  emptyMessage="Sin productos"
                  onSearchChange={(text) => setProductQuery(text)}
                  className="h-12"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <DataTable
                tableId="purchase-create-items-table"
                data={itemRows}
                columns={itemColumns}
                rowKey="id"
                emptyMessage="Aun no agregas productos."
                hoverable={false}
                animated={false}
              />
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
              <SectionHeaderForm icon={Newspaper} title="Documento" />
            </div>

            <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <FloatingSelect
                  label="Tipo"
                  name="document-type"
                  value={form.documentType}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      documentType: value as PurchaseOrder["documentType"],
                    }))
                  }
                  options={documentTypeOptions}
                />

                <FloatingSelect
                  label="Moneda"
                  name="currency"
                  value={form.currency}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      currency: value as CurrencyType,
                    }))
                  }
                  options={currencyOptions}
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FloatingInput
                  label="Serie"
                  name="serie"
                  value={form.serie}
                  onChange={(e) => setForm((prev) => ({ ...prev, serie: e.target.value }))}
                />

                <FloatingInput
                  label="Número"
                  name="correlative"
                  type="number"
                  value={form.correlative ? String(form.correlative) : ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      correlative: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <FloatingSelect
                    label="Almacén"
                    name="warehouse"
                    value={form.warehouseId}
                    onChange={(value) => {
                      setForm((prev) => ({
                        ...prev,
                        warehouseId: value,
                      }));
                    }}
                    options={warehouseOptions}
                    searchable
                    searchPlaceholder="Buscar almacén..."
                    emptyMessage="Sin almacenes"
                  />

                  <SystemButton
                    size="icon"
                    className="h-10 w-10"
                    style={{
                      backgroundColor: PRIMARY,
                      borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                    }}
                    title="Agregar almacén"
                    onClick={() => setOpenCreateWarehouse(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </SystemButton>
                </div>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <FloatingSelect
                    label="Proveedor"
                    name="supplier"
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
                    searchable
                    searchPlaceholder="Buscar proveedor..."
                    emptyMessage="Sin proveedores"
                    onSearchChange={(text) => setSupplierQuery(text)}
                  />

                  <SystemButton
                    size="icon"
                    className="h-10 w-10"
                    style={{
                      backgroundColor: PRIMARY,
                      borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                    }}
                    title="Agregar proveedor"
                    onClick={() => setOpenCreate(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </SystemButton>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FloatingDateTimePicker
                  label="Fecha de emisión"
                  name="date-issue"
                  value={parseDateValue(form.dateIssue)}
                  onChange={(date) => {
                    const nextDate = date ? toLocalDateTimeString(date) : "";
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
                  clearable={false}
                />
                <FloatingDateTimePicker
                  label="Fecha de ingreso a almacén"
                  name="expected-at"
                  value={parseDateValue(form.expectedAt)}
                  onChange={(date) =>
                    setForm((prev) => ({
                      ...prev,
                      expectedAt: date ? toLocalDateTimeString(date) : "",
                    }))
                  }
                />
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 mt-2">
                <p className="text-[11px] font-semibold text-black">Resumen</p>
                <div className="mt-2 space-y-1 text-[11px] text-black/70">
                  <div className="flex items-center justify-between">
                    <span>Items</span>
                    <span className="font-semibold tabular-nums">{itemRows.length}</span>
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
                <SystemButton variant="outline" className="flex-1" onClick={onClose}>
                  Cerrar 
                </SystemButton>
                <SystemButton
                  className="flex-1"
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
                                  amount: normalizeMoney(totals.totalPrice),
                                  note: "",
                                },
                              ],
                      };
                    });
                    setOpenPaymentModal(true);
                  }}
                >
                  Agregar Pago
                </SystemButton>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {openCreate && (
        <SupplierFormModal
          open={openCreate}
          mode="create"
          onClose={() => setOpenCreate(false)}
          onSaved={handleCreateSaved}
          primaryColor={PRIMARY}
        />
      )}

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
          onClose?.();
          navigate("/compras");
        }}
        poId={lastSavedPoId || effectivePoId}
        primaryColor={PRIMARY}
        isEdit={isEdit}
      />
    </>
  );

  if (inModal) return content;
  return <PageShell>{content}</PageShell>;
}
