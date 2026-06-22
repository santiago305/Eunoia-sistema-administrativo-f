import { useCallback, useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  AfectType,
  CurrencyType,
  CurrencyTypes,
  PaymentFormTypes,
  PaymentTypes,
  VoucherDocTypes,
} from "@/features/purchases/types/purchaseEnums";
import { listSuppliers } from "@/shared/services/supplierService";
import { errorResponse } from "@/shared/common/utils/response";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDateTimePicker } from "@/shared/components/components/date-picker/FloatingDateTimePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type {
  CreatePurchaseOrderDto,
  PurchaseOrder,
  PurchaseOrderItem,
} from "@/features/purchases/types/purchase";
import { SupplierFormModal } from "../providers/components/SupplierFormModal";
import { WarehouseFormModal } from "../warehouse/components/WarehouseFormModal";
import { createPurchaseOrder, updatePurchaseOrder, validatePurchaseOrderNumber } from "@/shared/services/purchaseService";
import { listActiveWarehouses } from "@/shared/services/warehouseServices";
import { EquivalenceModal } from "./components/EquivalenceModal";
import { PurchaseItemsSection } from "./components/PurchaseItemsSection";
import { PurchasePaymentModal } from "./components/PurchasePaymentModal";
import { PurchaseTypeSelect } from "./components/PurchaseTypeSelect";
import { ModalNavegate } from "./components/ModalNavegate";
import { PageShell } from "@/shared/layouts/PageShell";
import {
  buildEmptyForm,
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
} from "@/shared/utils/functionPurchases";
import { useNavigate, useParams } from "react-router-dom";
import { getById } from "@/shared/services/purchaseService";
import { SupplierOption } from "../providers/types/supplier";
import { WarehouseSelectOption } from "../warehouse/types/warehouse";
import { listSkus } from "@/shared/services/skuService";
import type { ListSkusResponse } from "@/features/catalog/types/product";
import {
  buildPurchaseSkuLabel,
  mapSkuToPurchaseSkuInfo,
  mergePurchaseSkus,
  type PurchaseSkuInfo,
} from "./utils/purchaseSkus";
import { useCompany } from "@/shared/hooks/useCompany";
import { sileo } from "sileo";
import {
  PurchaseItemTypes,
  PurchaseTypes,
  purchaseItemTypeLabels,
  purchaseTypesWithoutStock,
  type PurchaseType,
} from "./types/purchase-classification.types";

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

const getIgvRate = (item?: Partial<PurchaseOrderItem>) => {
  const rate = Number(item?.porcentageIgv ?? IGV);
  return Number.isFinite(rate) && rate > 0 ? rate : IGV;
};

const splitTotalWithIgv = (totalWithIgv: number, igvRate = IGV) => {
  const safeTotal = normalizeMoney(totalWithIgv);
  const safeRate = Number.isFinite(igvRate) && igvRate > 0 ? igvRate : IGV;

  // Fórmula correcta cuando el precio/total ingresado YA incluye IGV:
  // subtotal = total / 1.18
  // igv = total - subtotal
  const subtotalWithoutIgv = normalizeMoney(safeTotal / (1 + safeRate));
  const amountIgv = normalizeMoney(safeTotal - subtotalWithoutIgv);

  return {
    totalWithIgv: safeTotal,
    subtotalWithoutIgv,
    amountIgv,
  };
};

const getItemTotalWithIgv = (item: PurchaseOrderItem) => {
  const quantity = normalizeQuantity(item.quantity ?? 0);
  const unitPriceWithIgv = normalizePrice(item.unitPrice ?? 0);

  // El precio unitario del formulario incluye IGV.
  // Total visible = cantidad × precio unitario CON IGV.
  return normalizeMoney(quantity * unitPriceWithIgv);
};

const recalcItem = (item: PurchaseOrderItem): PurchaseOrderItem => {
  const quantity = normalizeQuantity(item.quantity ?? 0);
  const unitPriceWithIgv = normalizePrice(item.unitPrice ?? 0);
  const igvRate = getIgvRate(item);
  const totalWithIgv = normalizeMoney(quantity * unitPriceWithIgv);
  const { subtotalWithoutIgv, amountIgv } = splitTotalWithIgv(totalWithIgv, igvRate);
  const unitValueWithoutIgv = quantity > 0 ? normalizePrice(subtotalWithoutIgv / quantity) : 0;

  return {
    ...item,
    quantity,
    unitPrice: unitPriceWithIgv, // precio unitario CON IGV
    unitValue: unitValueWithoutIgv, // precio unitario SIN IGV
    baseWithoutIgv: subtotalWithoutIgv,
    purchaseValue: subtotalWithoutIgv,
    amountIgv,
    porcentageIgv: igvRate,
    afectType: AfectType.TAXED,
  };
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
  itemType: string;
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
  const showFeedbackRef = useRef((msg: { type?: string; message?: string }) => {
    if ((msg?.type ?? "error") === "success") sileo.success({ title: msg?.message ?? "Operación correcta" });
    else sileo.error({ title: msg?.message ?? "Ocurrió un error" });
  });
  const { hasCompany } = useCompany();
  const navigate = useNavigate();
  const companyActionDisabled = !hasCompany;

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
  const [documentNumberError, setDocumentNumberError] = useState<string | null>(null);
  const { poId: routePoId } = useParams<{ poId: string }>();
  const effectivePoId = poIdOverride ?? routePoId;
  const isEdit = Boolean(effectivePoId);
  const requiresWarehouse = !purchaseTypesWithoutStock.includes((form.purchaseType ?? PurchaseTypes.INVENTORY) as PurchaseType);

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

  const searchMaterialSkus = useCallback(async (query: string) => {
    const normalizedQuery = query.trim();
    try {
      const response = await listSkus({
        q: normalizedQuery || undefined,
        isActive: true,
        page: 1,
        limit: 10,
      });

      const mapped = (response.items ?? []).map(mapSkuToPurchaseSkuInfo);
      setSearchResults(response);
      setProducts((prev) => mergePurchaseSkus(prev, mapped));
    } catch {
      setSearchResults(undefined);
      if (!isEdit) setProducts([]);
      showFeedbackRef.current(errorResponse("Error al cargar SKUs de materia prima"));
    }
  }, [isEdit]);

  
    const handleClosePayment = useCallback(()=>{
        setOpenPaymentModal(false)
    },[])

    const handleCloseEquivalence = useCallback(()=>{
        setOpenEquivalence(false)
    },[])
  const loadSuppliers = useCallback(async (appliedSearch: string) => {
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
      showFeedbackRef.current(errorResponse("Error al cargar proveedores"));
    }
  }, []);

  const loadWarehouses = useCallback(async () => {
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
      showFeedbackRef.current(errorResponse("Error al cargar almacenes"));
    }
  }, []);

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
        const lineTotal = getItemTotalWithIgv(item);
        const { subtotalWithoutIgv, amountIgv } = splitTotalWithIgv(lineTotal, getIgvRate(item));

        acc.totalPrice = normalizeMoney(acc.totalPrice + lineTotal);
        acc.totalValue = normalizeMoney(acc.totalValue + subtotalWithoutIgv);
        acc.totalIgv = normalizeMoney(acc.totalIgv + amountIgv);
        acc.totalTaxed = normalizeMoney(acc.totalTaxed + subtotalWithoutIgv);
        acc.totalExempted = 0;

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
        totalPrice: getItemTotalWithIgv(item),
        itemType: purchaseItemTypeLabels[item.itemType ?? PurchaseItemTypes.PRODUCT],
      };
    });
  }, [form.items, products]);

  const resetForm = () => {
    setForm(buildEmptyForm());
    setItemId("");
  };

  const savePurchase = async () => {
    if (!form.items?.length || !form.serie.trim() || !form.supplierId || (requiresWarehouse && !form.warehouseId)) return;
    if (documentNumberError) {
      sileo.error({ title: "Número de orden ya registrado" });
      return;
    }

    const payload: CreatePurchaseOrderDto = {
      supplierId: form.supplierId,
      warehouseId: form.warehouseId || undefined,
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
      note: form.note?.trim() || undefined,
      status: form.status,
      purchaseType: form.purchaseType,
      receptionStatus: form.receptionStatus,
      paymentStatus: form.paymentStatus,
      isRecurringSource: form.isRecurringSource ?? false,
      recurringTemplateId: form.recurringTemplateId ?? undefined,
      requiresReceipt: form.requiresReceipt,
      requiresStockEntry: form.requiresStockEntry,
      requiresAssetCreation: form.requiresAssetCreation,
      expectedAt: form.expectedAt?.trim() ? form.expectedAt : undefined,
      dateIssue: form.dateIssue?.trim() ? form.dateIssue : undefined,
      dateExpiration: form.dateExpiration?.trim() ? form.dateExpiration : undefined,
      items: (form.items ?? []).map((item) => {
        const calculatedItem = recalcItem(item);
        const resolvedFactor = Number(calculatedItem.factor ?? 1);

        return {
          skuId: calculatedItem.skuId,
          itemType: calculatedItem.itemType ?? PurchaseItemTypes.PRODUCT,
          internalMaterialId: calculatedItem.internalMaterialId ?? undefined,
          assetCategoryId: calculatedItem.assetCategoryId ?? undefined,
          serviceName: calculatedItem.serviceName ?? undefined,
          description: calculatedItem.description ?? undefined,
          warehouseId: calculatedItem.warehouseId ?? (form.warehouseId || undefined),
          affectsStock: calculatedItem.affectsStock ?? true,
          generatesAsset: calculatedItem.generatesAsset ?? false,
          isService: calculatedItem.isService ?? false,
          isSubscription: calculatedItem.isSubscription ?? false,
          unitBase: calculatedItem.unitBase,
          equivalence: calculatedItem.equivalence,
          factor: Number.isFinite(resolvedFactor) && resolvedFactor > 0 ? resolvedFactor : 1,
          afectType: calculatedItem.afectType,
          quantity: normalizeQuantity(calculatedItem.quantity),
          porcentageIgv: calculatedItem.porcentageIgv ?? IGV,
          baseWithoutIgv: normalizeMoney(calculatedItem.baseWithoutIgv),
          amountIgv: normalizeMoney(calculatedItem.amountIgv),
          unitValue: normalizePrice(calculatedItem.unitValue),
          unitPrice: normalizePrice(calculatedItem.unitPrice),
          purchaseValue: normalizeMoney(calculatedItem.purchaseValue),
        };
      }),
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

    try {
      const res = effectivePoId ? await updatePurchaseOrder(effectivePoId, payload) : await createPurchaseOrder(payload);
      if (res.type === "success") {
        sileo.success({ title: "Compra creada" });
        const nextPoId = res.order?.poId ?? effectivePoId ?? "";
        if (nextPoId) setLastSavedPoId(nextPoId);
        setOpenPaymentModal(false);
        if (nextPoId) {
          await onSaved?.(nextPoId);
        }
        if (inModal) {
          resetForm();
          setOpenNavigateModal(false);
          onClose?.();
        } else {
          setOpenNavigateModal(true);
        }
      }

      if (res.type === "error") {
        sileo.error({ title: "Registro fallido" });
      }
    } catch {
      sileo.error({ title: "Error al registrar la compra" });
    }
  };

  useEffect(() => {
    const serie = form.serie?.trim();
    const correlative = Number(form.correlative ?? 0);
    if (!serie || !correlative) {
      setDocumentNumberError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await validatePurchaseOrderNumber({
          serie,
          correlative,
          excludePoId: effectivePoId,
        });
        setDocumentNumberError(response.exists ? "Ya está inscrito ese número de orden." : null);
      } catch {
        setDocumentNumberError(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [effectivePoId, form.correlative, form.serie]);

  const loadPurchase = useCallback(async (poId: string) => {
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
      showFeedbackRef.current(errorResponse("Error al cargar la compra."));
    }
  }, []);

  useEffect(() => {
    if (!effectivePoId) return;
    void loadPurchase(effectivePoId);
  }, [effectivePoId, loadPurchase]);

  useEffect(() => {
    const id = setTimeout(() => {
      void searchMaterialSkus(productQuery);
    }, productQuery.trim() ? 350 : 0);

    return () => clearTimeout(id);
  }, [productQuery, searchMaterialSkus]);

  useEffect(() => {
    const id = setTimeout(() => {
      setAppliedSupplierSearch(supplierQuery);
    }, 500);

    return () => clearTimeout(id);
  }, [supplierQuery]);

  useEffect(() => {
    void loadSuppliers(appliedSupplierSearch);
  }, [appliedSupplierSearch, loadSuppliers]);

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
  }, [loadWarehouses]);

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
        id: "itemType",
        header: "Tipo",
        accessorKey: "itemType",
        className: "text-black/70",
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
          <div className="flex items-center justify-center">
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
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        hideable: false,
        sortable: false,
      },
    ];
  }, []);

  const content = (
    <>
      <div className={inModal ? "w-full" : "h-screen w-full py-0"}>
        <div
          className={`py-4 grid grid-cols-1 gap-3 lg:grid-cols-[6fr_2.5fr] ${
            inModal ? "h-[80vh]" : "h-[calc(100vh-64px)]"
          }`}
        >
          <PurchaseItemsSection
            itemId={itemId}
            productOptions={productOptions}
            itemRows={itemRows}
            itemColumns={itemColumns}
            totalValueLabel={money(totals.totalValue, currency)}
            totalPriceLabel={money(totals.totalPrice, currency)}
            igvPercent={Math.round(IGV * 100)}
            onSelectItem={(value) => {
              setItemId(value);
              setOpenEquivalence(Boolean(value));
            }}
            onSearchProduct={setProductQuery}
          />

          <aside className="overflow-hidden flex flex-col border-0 border-black/10 lg:border-l">

            <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-5">
              <PurchaseTypeSelect
                value={(form.purchaseType ?? PurchaseTypes.INVENTORY) as PurchaseType}
                onChange={(purchaseType) => {
                  const noStock = purchaseTypesWithoutStock.includes(purchaseType);
                  setForm((prev) => ({
                    ...prev,
                    purchaseType,
                    warehouseId: noStock ? "" : prev.warehouseId,
                    requiresReceipt: !noStock,
                    requiresStockEntry: !noStock,
                    requiresAssetCreation: purchaseType === PurchaseTypes.FIXED_ASSET,
                  }));
                }}
              />

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
                  error={documentNumberError ?? undefined}
                  onChange={(e) => setForm((prev) => ({ ...prev, serie: e.target.value }))}
                />

                <FloatingInput
                  label="Número"
                  name="correlative"
                  type="number"
                  value={form.correlative ? String(form.correlative) : ""}
                  error={documentNumberError ?? undefined}
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
                    disabled={!requiresWarehouse}
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
                    disabled={companyActionDisabled || !requiresWarehouse}
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
                    disabled={companyActionDisabled}
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
                  label="Fecha de ingreso"
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

              <div className="rounded-sm border border-black/10 bg-black/[0.02] p-3 mt-2">
                <p className="text-xs font-semibold text-black">Resumen</p>
                <div className="mt-2 space-y-1 text-[11px] text-black/70">
                  <div className="flex items-center justify-between">
                    <span>Items</span>
                    <span className="font-semibold tabular-nums">{itemRows.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sub total</span>
                    <span className="font-semibold tabular-nums">{money(totals.totalValue, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>IGV ({Math.round(IGV * 100)}%)</span>
                    <span className="font-semibold tabular-nums">{money(totals.totalIgv, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span className="font-semibold tabular-nums">{money(totals.totalPrice, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="flex gap-2">
                <SystemButton
                  className="flex-1"
                  disabled={
                    companyActionDisabled ||
                    !form.items?.length ||
                    !form.serie.trim() ||
                    Boolean(documentNumberError) ||
                    !form.supplierId ||
                    !form.correlative ||
                    (requiresWarehouse && !form.warehouseId) ||
                    totals.totalPrice === 0                   
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
          purchaseType={(form.purchaseType ?? PurchaseTypes.INVENTORY) as PurchaseType}
          onClose={handleCloseEquivalence}
      />

      {openPaymentModal && (
        <PurchasePaymentModal
          open={openPaymentModal}
          onClose={handleClosePayment}
          form={form}
          setForm={setForm}
          totalPrice={totals.totalPrice}
          ringStyle={ringStyle}
          primaryColor={PRIMARY}
          currency={currency}
          formatMoney={money}
          onSave={savePurchase}
          saveDisabled={companyActionDisabled || !form.items?.length || !form.serie.trim() || !form.supplierId || (requiresWarehouse && !form.warehouseId)}
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

