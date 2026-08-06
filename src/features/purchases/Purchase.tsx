import { useCallback, useEffect, useMemo, useState, useRef, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  AfectType,
  CurrencyType,
  CurrencyTypes,
  PaymentFormTypes,
  VoucherDocTypes,
} from "@/features/purchases/types/purchaseEnums";
import { listSuppliers } from "@/shared/services/supplierService";
import { errorResponse } from "@/shared/common/utils/response";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
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
import {
  createPurchaseOrder,
  getNextPurchaseOrderCorrelative,
  listPayments as listPurchasePayments,
  updatePurchaseOrder,
  validatePurchaseOrderNumber,
} from "@/shared/services/purchaseService";
import { uploadPurchaseAttachment } from "@/shared/services/purchaseAttachmentService";
import { listActiveWarehouses } from "@/shared/services/warehouseServices";
import { EquivalenceModal } from "./components/EquivalenceModal";
import { PurchaseItemsSection } from "./components/PurchaseItemsSection";
import { PurchasePaymentModal } from "./components/PurchasePaymentModal";
import { PurchaseTypeSelect } from "./components/PurchaseTypeSelect";
import { ModalNavegate } from "./components/ModalNavegate";
import { SaleOrderEditorSection } from "@/features/sale-orders/components/editor/SaleOrderEditorSection";
import { PageShell } from "@/shared/layouts/PageShell";
import {
  buildEmptyForm,
  money,
  addDaysToIsoDate,
  clampQuotas,
  addDaysToIsoDateFrom,
  buildQuotas,
  normalizeMoney,
  normalizePrice,
  normalizeQuantity,
  parseDecimalInput,
} from "@/shared/utils/functionPurchases";
import { useNavigate, useParams } from "react-router-dom";
import { getById } from "@/shared/services/purchaseService";
import { SupplierOption } from "../providers/types/supplier";
import { WarehouseSelectOption } from "../warehouse/types/warehouse";
import {
  buildPurchaseSkuLabel,
  mapSkuToPurchaseSkuInfo,
  mergePurchaseSkus,
  type PurchaseSkuInfo,
} from "./utils/purchaseSkus";
import { useCompany } from "@/shared/hooks/useCompany";
import { sileo } from "sileo";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import {
  PurchaseItemTypes,
  PurchaseTypes,
  purchaseItemTypeLabels,
  type PurchaseType,
} from "./types/purchase-classification.types";
import { getPurchaseCreateErrorMessage } from "./utils/purchaseCreateFeedback";
import {
  stripPaymentEvidenceFile,
  uploadPaymentEvidenceFiles,
} from "./utils/purchasePaymentEvidence";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_IGV_PERCENT = 18;

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
  const percent = Number(item?.porcentageIgv ?? DEFAULT_IGV_PERCENT);
  const safePercent = Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_IGV_PERCENT;
  return safePercent / 100;
};

const splitTotalWithIgv = (totalWithIgv: number, igvRate = DEFAULT_IGV_PERCENT / 100) => {
  const safeTotal = normalizeMoney(totalWithIgv);
  const safeRate = Number.isFinite(igvRate) && igvRate >= 0 ? igvRate : DEFAULT_IGV_PERCENT / 100;

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
  const { subtotalWithoutIgv, amountIgv } = item.afectType === AfectType.TAXED
    ? splitTotalWithIgv(totalWithIgv, igvRate)
    : {
        subtotalWithoutIgv: totalWithIgv,
        amountIgv: 0,
      };
  const unitValueWithoutIgv = quantity > 0 ? normalizePrice(subtotalWithoutIgv / quantity) : 0;

  return {
    ...item,
    quantity,
    unitPrice: unitPriceWithIgv, // precio unitario CON IGV
    unitValue: unitValueWithoutIgv, // precio unitario SIN IGV
    baseWithoutIgv: subtotalWithoutIgv,
    purchaseValue: subtotalWithoutIgv,
    amountIgv,
    porcentageIgv: item.afectType === AfectType.TAXED ? Number(item.porcentageIgv ?? DEFAULT_IGV_PERCENT) : 0,
  };
};

const getItemKey = (item: PurchaseOrderItem, index: number) =>
  item.skuId || item.clientKey || `item-${index}`;

const itemAffectsStock = (item: PurchaseOrderItem) =>
  item.affectsStock ?? Boolean(item.skuId);

const purchaseTypeRequiresWarehouse = (
  purchaseType: PurchaseType,
  items: PurchaseOrderItem[] = [],
) =>
  purchaseType === PurchaseTypes.INVENTORY ||
  purchaseType === PurchaseTypes.RAW_MATERIAL ||
  (purchaseType === PurchaseTypes.MIXED && items.some(itemAffectsStock));

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
  onFooterChange?: (footer: ReactNode | null) => void;
  onSaved?: (poId: string) => void | Promise<void>;
};

export default function PurchaseCreateLocal({
  inModal = false,
  poIdOverride,
  onClose,
  onFooterChange,
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
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseSelectOption[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openCreateWarehouse, setOpenCreateWarehouse] = useState(false);
  const [openEquivalences, setOpenEquivalence] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openNavigateModal, setOpenNavigateModal] = useState(false);
  const [lastSavedPoId, setLastSavedPoId] = useState("");
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [paymentDraftForm, setPaymentDraftForm] = useState<PurchaseOrder | null>(null);

  const [supplierQuery, setSupplierQuery] = useState("");
  const [appliedSupplierSearch, setAppliedSupplierSearch] = useState("");

  const [form, setForm] = useState<PurchaseOrder>(() => buildEmptyForm());
  const [igvPercent, setIgvPercent] = useState(DEFAULT_IGV_PERCENT);
  const [documentNumberError, setDocumentNumberError] = useState<string | null>(null);
  const [automaticNumberError, setAutomaticNumberError] = useState<string | null>(null);
  const [isLoadingCorrelative, setIsLoadingCorrelative] = useState(false);
  const { poId: routePoId } = useParams<{ poId: string }>();
  const effectivePoId = poIdOverride ?? routePoId;
  const isEdit = Boolean(effectivePoId);
  const requiresWarehouse = purchaseTypeRequiresWarehouse(
    (form.purchaseType ?? PurchaseTypes.INVENTORY) as PurchaseType,
    form.items ?? [],
  );

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

  const handleClosePayment = useCallback(() => {
    setPaymentDraftForm(null);
    setOpenPaymentModal(false);
  }, []);

  const handleCloseEquivalence = useCallback(() => {
    setOpenEquivalence(false);
    setEditingItemKey(null);
  }, []);
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

  const updateItem = useCallback((itemIdToUpdate: string, patch: Partial<PurchaseOrderItem>) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).map((item, index) => {
        if (getItemKey(item, index) !== itemIdToUpdate) return item;

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
  }, []);

  const removeItem = useCallback((itemIdToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((item, index) => getItemKey(item, index) !== itemIdToRemove),
    }));
  }, []);

  const totals = useMemo(() => {
    const items = form.items ?? [];

    return items.reduce(
      (acc, item) => {
        const lineTotal = getItemTotalWithIgv(item);
        const { subtotalWithoutIgv, amountIgv } = item.afectType === AfectType.TAXED
          ? splitTotalWithIgv(lineTotal, getIgvRate(item))
          : {
              subtotalWithoutIgv: lineTotal,
              amountIgv: 0,
            };

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

  const saveDisabled =
    companyActionDisabled ||
    !form.items?.length ||
    !form.serie.trim() ||
    Boolean(documentNumberError) ||
    Boolean(automaticNumberError) ||
    isLoadingCorrelative ||
    !form.supplierId ||
    !form.correlative ||
    (requiresWarehouse && !form.warehouseId) ||
    totals.totalPrice === 0;

  const itemRows = useMemo<PurchaseItemRow[]>(() => {
    return (form.items ?? []).map((item, index) => {
      const product = products.find((p) => p.skuId === item.skuId);

      return {
        id: getItemKey(item, index),
        skuId: item.skuId,
        sku: product?.backendSku ?? product?.customSku ?? "-",
        name: item.name ?? item.description ?? "-",
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

  const editingItem = useMemo(
    () =>
      editingItemKey
        ? (form.items ?? []).find((item, index) => getItemKey(item, index) === editingItemKey) ?? null
        : null,
    [editingItemKey, form.items],
  );

  const openCreateItemModal = useCallback(() => {
    setEditingItemKey(null);
    setOpenEquivalence(true);
  }, []);

  const openEditItemModal = useCallback((itemId: string) => {
    setEditingItemKey(itemId);
    setOpenEquivalence(true);
  }, []);

  const resetForm = () => {
    setForm(buildEmptyForm());
    setIgvPercent(DEFAULT_IGV_PERCENT);
  };

  const setPaymentDraftFormValue: Dispatch<SetStateAction<PurchaseOrder>> = useCallback(
    (value) => {
      setPaymentDraftForm((current) => {
        const base = current ?? form;
        return typeof value === "function" ? value(base) : value;
      });
    },
    [form],
  );

  const savePurchase = async (overrideForm?: PurchaseOrder) => {
    const currentForm = overrideForm ?? form;
    const currentRequiresWarehouse = purchaseTypeRequiresWarehouse(
      (currentForm.purchaseType ?? PurchaseTypes.INVENTORY) as PurchaseType,
      currentForm.items ?? [],
    );
    if (!currentForm.items?.length || !currentForm.serie.trim() || !currentForm.supplierId || (currentRequiresWarehouse && !currentForm.warehouseId)) return;
    if (documentNumberError) {
      sileo.error({ title: "Número de orden ya registrado" });
      return;
    }

    const payload: CreatePurchaseOrderDto = {
      supplierId: currentForm.supplierId,
      warehouseId: currentForm.warehouseId || undefined,
      documentType: currentForm.documentType,
      serie: currentForm.serie,
      correlative: Number(currentForm.correlative ?? 0),
      currency: currentForm.currency,
      paymentForm: currentForm.paymentForm,
      creditDays: currentForm.creditDays ?? 0,
      numQuotas: currentForm.numQuotas ?? 0,
      totalTaxed: normalizeMoney(currentForm.totalTaxed),
      totalExempted: normalizeMoney(currentForm.totalExempted),
      totalIgv: normalizeMoney(currentForm.totalIgv),
      purchaseValue: normalizeMoney(currentForm.purchaseValue),
      total: normalizeMoney(currentForm.total),
      note: currentForm.note?.trim() || undefined,
      description: currentForm.description?.trim() || undefined,
      status: currentForm.status,
      purchaseType: currentForm.purchaseType,
      receptionStatus: currentForm.receptionStatus,
      paymentStatus: currentForm.paymentStatus,
      isRecurringSource: currentForm.isRecurringSource ?? false,
      recurringTemplateId: currentForm.recurringTemplateId ?? undefined,
      requiresReceipt: currentForm.requiresReceipt,
      requiresStockEntry: currentForm.requiresStockEntry,
      requiresAssetCreation: currentForm.requiresAssetCreation,
      expectedAt: currentForm.expectedAt?.trim() ? currentForm.expectedAt : undefined,
      dateIssue: currentForm.dateIssue?.trim() ? currentForm.dateIssue : undefined,
      dateExpiration: currentForm.dateExpiration?.trim() ? currentForm.dateExpiration : undefined,
      items: (currentForm.items ?? []).map((item) => {
        const calculatedItem = recalcItem(item);
        const resolvedFactor = Number(calculatedItem.factor ?? 1);

        return {
          skuId: calculatedItem.skuId || undefined,
          itemType: calculatedItem.itemType ?? PurchaseItemTypes.PRODUCT,
          internalMaterialId: calculatedItem.internalMaterialId ?? undefined,
          assetCategoryId: calculatedItem.assetCategoryId ?? undefined,
          serviceName: calculatedItem.serviceName ?? undefined,
          description: calculatedItem.description?.trim() || calculatedItem.name?.trim() || undefined,
          warehouseId: calculatedItem.warehouseId ?? (calculatedItem.affectsStock ? (currentForm.warehouseId || undefined) : undefined),
          affectsStock: calculatedItem.affectsStock ?? Boolean(calculatedItem.skuId),
          generatesAsset: calculatedItem.generatesAsset ?? false,
          isService: calculatedItem.isService ?? false,
          isSubscription: calculatedItem.isSubscription ?? false,
          unitBase: calculatedItem.unitBase,
          equivalence: calculatedItem.equivalence,
          factor: Number.isFinite(resolvedFactor) && resolvedFactor > 0 ? resolvedFactor : 1,
          afectType: calculatedItem.afectType,
          quantity: normalizeQuantity(calculatedItem.quantity),
          porcentageIgv: calculatedItem.porcentageIgv ?? DEFAULT_IGV_PERCENT,
          baseWithoutIgv: normalizeMoney(calculatedItem.baseWithoutIgv),
          amountIgv: normalizeMoney(calculatedItem.amountIgv),
          unitValue: normalizePrice(calculatedItem.unitValue),
          unitPrice: normalizePrice(calculatedItem.unitPrice),
          purchaseValue: normalizeMoney(calculatedItem.purchaseValue),
        };
      }),
      payments: (currentForm.payments ?? []).map((payment) => {
        const p = stripPaymentEvidenceFile(payment);
        return {
        currency: p.currency,
        date: p.date,
        method: p.method,
        amount: normalizeMoney(p.amount ?? 0),
        quotaId: p.quotaId ?? undefined,
        poId: p.poId ?? undefined,
        note: p.note ?? undefined,
        operationNumber: p.operationNumber ?? undefined,
        accountPayableId: p.accountPayableId ?? undefined,
        companyPaymentAccountId: p.companyPaymentAccountId ?? undefined,
        paymentMethodId: p.paymentMethodId ?? undefined,
        bankName: p.bankName ?? undefined,
        cardLastFour: p.cardLastFour ?? undefined,
        operationCode: p.operationCode ?? undefined,
        isPartial: p.isPartial ?? undefined,
        };
      }),
      quotas: (currentForm.quotas ?? []).map((q) => ({
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
        if (overrideForm) setForm(overrideForm);
        const nextPoId = res.order?.poId ?? effectivePoId ?? "";
        if (nextPoId) setLastSavedPoId(nextPoId);
        const paymentsWithEvidence = (currentForm.payments ?? []).filter((payment) => payment.paymentEvidenceFile);
        if (nextPoId && paymentsWithEvidence.length > 0) {
          try {
            const persistedPayments = res.order?.payments?.length
              ? res.order.payments
              : await listPurchasePayments(nextPoId);
            await uploadPaymentEvidenceFiles({
              purchaseId: nextPoId,
              draftPayments: currentForm.payments ?? [],
              persistedPayments,
              upload: uploadPurchaseAttachment,
            });
          } catch {
            sileo.error({
              title: "Compra registrada, pero no se pudo subir el comprobante. Puedes subirlo desde documentos de la compra.",
            });
          }
        }
        setOpenPaymentModal(false);
        setPaymentDraftForm(null);
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
        sileo.error({ title: getPurchaseCreateErrorMessage(res) });
      }
    } catch (error) {
      sileo.error({ title: parseApiError(error, "Error al registrar la compra") });
    }
  };

  const savePurchaseRef = useRef(savePurchase);

  useEffect(() => {
    savePurchaseRef.current = savePurchase;
  });

  const openPaymentDraft = useCallback(() => {
    setPaymentDraftForm(() => {
      const shouldInit = !isEdit;
      return {
        ...form,
        paymentForm: shouldInit ? PaymentFormTypes.CONTADO : form.paymentForm,
        creditDays: shouldInit ? 0 : form.creditDays,
        numQuotas: shouldInit ? 0 : form.numQuotas,
        quotas: shouldInit ? [] : form.quotas,
        payments: form.payments ?? [],
      };
    });
    setOpenPaymentModal(true);
  }, [form, isEdit]);

  const renderPurchaseActions = useCallback(
    () => (
        <div className="flex justify-end gap-2">        
        <SystemButton
          disabled={saveDisabled}
          onClick={() => void savePurchaseRef.current()}
        >
          {isEdit ? "Actualizar compra" : "Crear compra"}
        </SystemButton>
        <SystemButton
          variant="outline"
          disabled={saveDisabled}
          onClick={openPaymentDraft}
        >
          Agregar Pago
        </SystemButton>
      </div>
    ),
    [isEdit, openPaymentDraft, saveDisabled],
  );

  useEffect(() => {
    if (!inModal || !onFooterChange) return;

    onFooterChange(renderPurchaseActions());

    return () => onFooterChange(null);
  }, [inModal, onFooterChange, renderPurchaseActions]);

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
          documentType: form.documentType,
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
  }, [effectivePoId, form.correlative, form.documentType, form.serie]);

  useEffect(() => {
    if (isEdit) return;

    const serie = form.serie?.trim();
    if (!serie || !form.documentType) {
      setIsLoadingCorrelative(false);
      setAutomaticNumberError(null);
      setForm((prev) => (prev.correlative ? { ...prev, correlative: 0 } : prev));
      return;
    }

    let cancelled = false;
    setIsLoadingCorrelative(true);
    setAutomaticNumberError(null);
    setForm((prev) => (prev.correlative ? { ...prev, correlative: 0 } : prev));

    const timeoutId = setTimeout(async () => {
      try {
        const response = await getNextPurchaseOrderCorrelative({
          documentType: form.documentType,
          serie,
        });
        if (cancelled) return;

        setForm((prev) => ({ ...prev, correlative: response.correlative }));
      } catch {
        if (cancelled) return;
        setAutomaticNumberError("No se pudo calcular el siguiente número. Intenta nuevamente.");
      } finally {
        if (!cancelled) setIsLoadingCorrelative(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [form.documentType, form.serie, isEdit]);

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
        description: data.description ?? "",
        items: (data.items ?? []).map((item, index) => {
          const { sku, ...rest } = item;
          const skuEntity = sku?.sku;
          const skuId = sku?.sku.id ?? "";
          const skuInfo = sku ? mapSkuToPurchaseSkuInfo(sku) : undefined;
          const resolvedName =
            skuInfo ? buildPurchaseSkuLabel(skuInfo) : (skuEntity?.name ?? rest.name ?? rest.description ?? "SKU");

          return recalcItem({
            ...rest,
            clientKey: typeof rest.clientKey === "string" ? rest.clientKey : (skuId ? undefined : `manual-${index}`),
            skuId,
            name: resolvedName,
            sku: skuEntity
              ? {
                  id: skuEntity.id,
                  productId: skuEntity.productId,
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
      items: (prev.items ?? []).map((item) =>
        recalcItem({
          ...item,
          porcentageIgv: item.afectType === AfectType.TAXED ? igvPercent : 0,
        }),
      ),
    }));
  }, [igvPercent]);

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
        onCellClick: (row) => openEditItemModal(row.id),
        headerClassName: "text-left",
        sortable: false,
      },
      {
        id: "itemType",
        header: "Tipo",
        accessorKey: "itemType",
        className: "text-black/70",
        onCellClick: (row) => openEditItemModal(row.id),
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
        onCellClick: (row) => openEditItemModal(row.id),
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
              name={`quantity-${row.id}`}
              type="number"
              min={0}
              step="0.001"
              value={String(row.quantity)}
              onChange={(e) =>
                updateItem(row.id, {
                  quantity: parseDecimalInput(e.target.value),
                })
              }
              className="h-8 text-xs"
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
              name={`unit-price-${row.id}`}
              type="number"
              min={0}
              step="0.0001"
              value={String(row.unitPrice)}
              onChange={(e) =>
                updateItem(row.id, {
                  unitPrice: parseDecimalInput(e.target.value),
                })
              }
              className="h-8 text-xs text-right"
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
              name={`total-price-${row.id}`}
              type="number"
              min={0}
              step="0.01"
              value={String(row.totalPrice || 0)}
              onChange={(e) => {
                const nextTotal = normalizeMoney(parseDecimalInput(e.target.value));
                const nextUnitPrice =
                  row.quantity > 0 ? normalizePrice(nextTotal / row.quantity) : 0;

                updateItem(row.id, { unitPrice: nextUnitPrice });
              }}
              className="h-8 text-xs text-right"
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
              onClick={() => removeItem(row.id)}
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
  }, [openEditItemModal, removeItem, updateItem]);

  const content = (
    <>
      <div className={inModal ? "w-full" : "h-screen w-full py-0"}>
        <div
          className={`py-4 grid grid-cols-1 gap-3 lg:grid-cols-[6fr_2.5fr] ${
            inModal ? "h-[80vh]" : "h-[calc(100vh-64px)]"
          }`}
        >
          <div className="flex flex-col gap-3">
            <SaleOrderEditorSection
              title="Items"
              bodyClassName="max-h-[380px] min-h-[140px] py-4"
              actions={
                <SystemButton
                  type="button"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={openCreateItemModal}
                >
                  Agregar
                </SystemButton>
              }
            >
              <PurchaseItemsSection
                itemRows={itemRows}
                itemColumns={itemColumns}
              />
            </SaleOrderEditorSection>
            <div className="min-w-0 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <SaleOrderEditorSection title="Resumen">
                <dl className="grid gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                    <dt className="text-muted-foreground">Items</dt>
                    <dd className="font-semibold tabular-nums">{itemRows.length}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2">
                    <dt className="text-muted-foreground">Sub total</dt>
                    <dd className="font-semibold tabular-nums">{money(totals.totalValue, currency)}</dd>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2 rounded-lg bg-background/80 px-3 py-2">
                    <FloatingInput
                      label="IGV %"
                      name="purchase-igv-percent"
                      type="number"
                      min={0}
                      step="0.01"
                      value={String(igvPercent)}
                      onChange={(event) => setIgvPercent(Math.max(0, parseDecimalInput(event.target.value)))}
                      className="h-9 text-xs"
                    />
                    <dd className="text-right font-semibold tabular-nums">{money(totals.totalIgv, currency)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="text-sm font-semibold tabular-nums">{money(totals.totalPrice, currency)}</dd>
                  </div>
                </dl>
              </SaleOrderEditorSection>

              <SaleOrderEditorSection title="Descripcion">
                <FloatingTextarea
                  label="Descripcion de compra"
                  name="purchase-description"
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </SaleOrderEditorSection>
            </div>
          </div>
          <SaleOrderEditorSection title="Datos de compra">      
            <aside className="overflow-hidden flex flex-col">    
              <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-5">
                <PurchaseTypeSelect
                  value={(form.purchaseType ?? PurchaseTypes.INVENTORY) as PurchaseType}
                  onChange={(purchaseType) => {
                    setForm((prev) => ({
                      ...prev,
                      purchaseType,
                      warehouseId: purchaseTypeRequiresWarehouse(purchaseType, prev.items ?? []) ? prev.warehouseId : "",
                      requiresReceipt: purchaseTypeRequiresWarehouse(purchaseType, prev.items ?? []),
                      requiresStockEntry: purchaseTypeRequiresWarehouse(purchaseType, prev.items ?? []),
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
                    label={isLoadingCorrelative ? "Número (calculando...)" : "Número"}
                    name="correlative"
                    type="number"
                    value={form.correlative ? String(form.correlative) : ""}
                    error={automaticNumberError ?? documentNumberError ?? undefined}
                    readOnly={!isEdit}
                    aria-describedby={!isEdit ? "purchase-correlative-help" : undefined}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        correlative: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
                {!isEdit ? (
                  <p id="purchase-correlative-help" className="-mt-2 text-xs text-muted-foreground">
                    Se asigna automáticamente según el tipo de documento y la serie.
                  </p>
                ) : null}

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

              </div>

              {!inModal || !onFooterChange ? (
                <div className="p-3">{renderPurchaseActions()}</div>
              ) : null}
            </aside>
          </SaleOrderEditorSection>      
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
        documentType={form.documentType}
        primaryColor={PRIMARY}
        igvPercent={igvPercent}
        setForm={setForm}
        purchaseType={(form.purchaseType ?? PurchaseTypes.INVENTORY) as PurchaseType}
        editingItemKey={editingItemKey}
        editingItem={editingItem}
        onClose={handleCloseEquivalence}
      />

      {openPaymentModal && (
        <PurchasePaymentModal
          open={openPaymentModal}
          onClose={handleClosePayment}
          form={paymentDraftForm ?? form}
          setForm={setPaymentDraftFormValue}
          totalPrice={totals.totalPrice}
          ringStyle={ringStyle}
          primaryColor={PRIMARY}
          currency={currency}
          formatMoney={money}
          onSave={() => {
            const nextForm = paymentDraftForm ?? form;
            void savePurchase(nextForm);
          }}
          saveDisabled={saveDisabled}
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

