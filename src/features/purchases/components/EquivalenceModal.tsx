import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Boxes, Scale } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { errorResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { listProductEquivalences } from "@/shared/services/equivalenceService";
import { listUnits } from "@/shared/services/unitService";
import { listSkus } from "@/shared/services/skuService";
import { AfectType, VoucherDocTypes } from "@/features/purchases/types/purchaseEnums";
import type { AfectTypeType } from "@/features/purchases/types/purchaseEnums";
import type { ProductEquivalence } from "@/features/catalog/types/equivalence";
import type { ListUnitResponse } from "@/features/catalog/types/unit";
import type { PurchaseOrder, PurchaseOrderItem } from "@/features/purchases/types/purchase";
import { parseDecimalInput, recalcItem } from "@/shared/utils/functionPurchases";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { SectionHeaderForm } from "@/shared/components/components/SectionHederForm";
import { buildPurchaseSkuLabel, mapSkuToPurchaseSkuInfo, type PurchaseSkuInfo } from "../utils/purchaseSkus";
import { PurchaseItemTypeSelect } from "./PurchaseItemTypeSelect";
import {
  PurchaseItemTypes,
  PurchaseTypes,
  type PurchaseItemType,
  type PurchaseType,
} from "../types/purchase-classification.types";

type EquivalenceModalProps = {
  open: boolean;
  documentType: PurchaseOrder["documentType"];
  primaryColor: string;
  igvPercent: number;
  setForm: Dispatch<SetStateAction<PurchaseOrder>>;
  purchaseType: PurchaseType;
  editingItemKey?: string | null;
  editingItem?: PurchaseOrderItem | null;
  onClose: () => void;
};

type EquivalenceRow = {
  id: string;
  fromName: string;
  fromCode: string;
  toName: string;
  toCode: string;
  factor: number;
  unitLabel: string;
  equivalenceLabel: string;
};

const catalogProductTypeByItemType: Partial<Record<PurchaseItemType, "MATERIAL" | "PRODUCT">> = {
  [PurchaseItemTypes.RAW_MATERIAL]: "MATERIAL",
  [PurchaseItemTypes.PRODUCT]: "PRODUCT",
};

const createClientKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getDefaultItemType = (purchaseType: PurchaseType): PurchaseItemType =>
  purchaseType === PurchaseTypes.RAW_MATERIAL
    ? PurchaseItemTypes.RAW_MATERIAL
    : purchaseType === PurchaseTypes.INTERNAL_MATERIAL
      ? PurchaseItemTypes.INTERNAL_MATERIAL
      : purchaseType === PurchaseTypes.FIXED_ASSET
        ? PurchaseItemTypes.FIXED_ASSET
        : purchaseType === PurchaseTypes.SERVICE
          ? PurchaseItemTypes.SERVICE
          : purchaseType === PurchaseTypes.SUBSCRIPTION
            ? PurchaseItemTypes.SUBSCRIPTION
            : PurchaseItemTypes.PRODUCT;

const sameCatalogProducts = (left: PurchaseSkuInfo[], right: PurchaseSkuInfo[]) =>
  left.length === right.length && left.every((item, index) => item.skuId === right[index]?.skuId);

const getItemKey = (item: PurchaseOrderItem, index: number) =>
  item.skuId || item.clientKey || `item-${index}`;

const getPurchaseSkuInfoFromItem = (item: PurchaseOrderItem): PurchaseSkuInfo | null => {
  if (!item.skuId) return null;

  return {
    skuId: item.skuId,
    productId: item.sku?.productId,
    name: item.sku?.name ?? item.name ?? item.description ?? "SKU",
    backendSku: item.sku?.backendSku ?? undefined,
    customSku: item.sku?.customSku ?? null,
    unitCode: item.equivalence || item.unitBase || undefined,
    attributes: [],
  };
};

export function EquivalenceModal({
  open,
  documentType,
  primaryColor,
  igvPercent,
  setForm,
  purchaseType,
  editingItemKey = null,
  editingItem = null,
  onClose,
}: EquivalenceModalProps) {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const showFeedbackRef = useRef(showFeedback);
  const [loading, setLoading] = useState(false);
  const [equivalences, setEquivalences] = useState<ProductEquivalence[]>([]);
  const [units, setUnits] = useState<ListUnitResponse>([]);
  const [pendingItemAfectType, setPendingItemAfectType] = useState<AfectTypeType>(AfectType.TAXED);
  const [pendingItemQuantity, setPendingItemQuantity] = useState<number>(1);
  const [pendingItemUnitPrice, setPendingItemUnitPrice] = useState<number>(0);
  const [pendingItemType, setPendingItemType] = useState<PurchaseItemType>(PurchaseItemTypes.PRODUCT);
  const [pendingFactor, setPendingFactor] = useState<number>(0);
  const [pendingStockUnit, setPendingStockUnit] = useState<string | null>(null);
  const [pendingPurchaseUnit, setPendingPurchaseUnit] = useState<string | null>(null);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<PurchaseSkuInfo[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const isCatalogItemType = Boolean(catalogProductTypeByItemType[pendingItemType]);
  const isEditMode = Boolean(editingItemKey && editingItem);

  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const resetPending = () => {
    setPendingItemAfectType(AfectType.TAXED);
    setPendingItemQuantity(1);
    setPendingItemUnitPrice(0);
    setPendingItemType(PurchaseItemTypes.PRODUCT);
    setPendingFactor(0);
    setPendingStockUnit("");
    setPendingPurchaseUnit("");
    setCatalogQuery("");
    setCatalogProducts([]);
    setSelectedSkuId("");
    setManualDescription("");
  };

  const handleClose = useCallback(() => {
    setEquivalences([]);
    setLoading(false);
    resetPending();
    onClose();
  }, [onClose]);

  const loadUnits = useCallback(async (canUpdate: () => boolean) => {
    if (unitsLoaded) return units;
    try {
      const res = await listUnits();
      const list = res ?? [];
      if (canUpdate()) {
        setUnits(list);
        setUnitsLoaded(true);
      }
      return list;
    } catch {
      if (canUpdate()) showFeedbackRef.current(errorResponse("Error al cargar unidades"));
      return [];
    }
  }, [units, unitsLoaded]);

  const loadEquivalences = useCallback(async (
    productId: string,
    unitList: ListUnitResponse,
    fallbackUnitCode: string | undefined,
    canUpdate: () => boolean,
  ) => {
    if (canUpdate()) setLoading(true);
    try {
      const res = await listProductEquivalences(productId);
      const list = res ?? [];
      if (!canUpdate()) return;
      setEquivalences(list);

      if (list.length > 0) {
        const best = list.reduce((acc, curr) =>
          (curr.factor ?? 0) > (acc.factor ?? 0) ? curr : acc,
        );
        const fromLabel = unitList.find((u) => u.id === best.fromUnitId);
        const toLabel = unitList.find((u) => u.id === best.toUnitId);
        const fromCode = fromLabel?.code ?? best.fromUnit?.code ?? "NIU";
        const toCode = toLabel?.code ?? best.toUnit?.code ?? "NIU";

        // Se guarda la unidad comprada (toCode) y la unidad base de stock (fromCode).
        setPendingPurchaseUnit(toCode);
        setPendingStockUnit(fromCode);
        const nextFactor = Number(best.factor ?? 1);
        setPendingFactor(Number.isFinite(nextFactor) && nextFactor > 0 ? nextFactor : 1);
      } else {
        const baseUnitCode = fallbackUnitCode?.trim() || "NIU";
        setPendingPurchaseUnit(baseUnitCode);
        setPendingStockUnit(baseUnitCode);
        setPendingFactor(1);
      }
    } catch {
      if (canUpdate()) {
        setEquivalences([]);
        showFeedbackRef.current(errorResponse("Error al cargar equivalencias"));
      }
    } finally {
      if (canUpdate()) setLoading(false);
    }
  }, []);

  const loadCatalogProducts = useCallback(async (
    itemType: PurchaseItemType,
    query: string,
    canUpdate: () => boolean,
  ) => {
    const productType = catalogProductTypeByItemType[itemType];
    if (!productType) {
      if (canUpdate()) {
        setCatalogProducts((prev) => (prev.length > 0 ? [] : prev));
        setSelectedSkuId("");
      }
      return;
    }

    try {
      const response = await listSkus({
        productType,
        q: query.trim() || undefined,
        isActive: true,
        page: 1,
        limit: 10,
      });
      if (!canUpdate()) return;

      const mapped = (response.items ?? []).map(mapSkuToPurchaseSkuInfo);
      const editingProduct = editingItem?.skuId === selectedSkuId
        ? getPurchaseSkuInfoFromItem(editingItem)
        : null;
      const nextProducts =
        editingProduct && !mapped.some((sku) => sku.skuId === editingProduct.skuId)
          ? [editingProduct, ...mapped]
          : mapped;

      setCatalogProducts((prev) => (sameCatalogProducts(prev, nextProducts) ? prev : nextProducts));
      if (selectedSkuId && !nextProducts.some((sku) => sku.skuId === selectedSkuId)) {
        setSelectedSkuId("");
      }
    } catch {
      if (!canUpdate()) return;
      setCatalogProducts((prev) => (prev.length > 0 ? [] : prev));
      setSelectedSkuId("");
      showFeedbackRef.current(errorResponse("Error al cargar items"));
    }
  }, [editingItem, selectedSkuId]);

  const addSelectedProduct = (
    selectedItemId?: string,
    opts?: {
      quantity?: number;
      unitPrice?: number;
      afectType?: AfectTypeType;
      equivalence?: string | null;
      factor?: number;
      unitBase?: string | null;
      name?:string;
      itemType?: PurchaseItemType;
    },
  ) => {
    const nextQuantity = Number(opts?.quantity ?? 1);
    const quantity = Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1;
    const unitPrice = Math.max(0, opts?.unitPrice ?? 0);
    const afectType = opts?.afectType ?? AfectType.TAXED;
    const nextFactor = Number(opts?.factor ?? 1);
    const itemType = opts?.itemType ?? PurchaseItemTypes.PRODUCT;
    const affectsStock = Boolean(catalogProductTypeByItemType[itemType]);
    const equivalence = affectsStock ? (opts?.equivalence ?? "") : "NIU";
    const factor = affectsStock && Number.isFinite(nextFactor) && nextFactor > 0 ? nextFactor : 1;
    const unitBase = affectsStock ? (opts?.unitBase ?? "") : "NIU";
    const finalItemId = affectsStock ? (selectedItemId ?? "") : "";
    const description = opts?.name?.trim() ?? "";
    const selectedProduct = affectsStock
      ? catalogProducts.find((product) => product.skuId === finalItemId)
      : undefined;
    if (affectsStock && !finalItemId) return;
    if (!affectsStock && !description) return;

    setForm((prev) => {
      const items = prev.items ?? [];
      const existing = !isEditMode && affectsStock
        ? items.find((item) => item.skuId === finalItemId)
        : undefined;
      const buildNextItem = (previous?: PurchaseOrderItem): PurchaseOrderItem => recalcItem({
        ...previous,
        skuId: finalItemId,
        unitBase,
        equivalence,
        factor,
        afectType,
        quantity,
        porcentageIgv: afectType === AfectType.TAXED ? igvPercent : 0,
        baseWithoutIgv: 0,
        amountIgv: 0,
        unitValue: 0,
        unitPrice,
        purchaseValue: 0,
        name: description || opts?.name,
        description: affectsStock ? undefined : description,
        clientKey: affectsStock ? previous?.clientKey : (previous?.clientKey ?? createClientKey()),
        sku: selectedProduct
          ? {
              id: selectedProduct.skuId,
              productId: selectedProduct.productId,
              backendSku: selectedProduct.backendSku ?? null,
              customSku: selectedProduct.customSku ?? null,
              name: selectedProduct.name ?? null,
            }
          : affectsStock && previous?.skuId === finalItemId
            ? previous.sku
            : undefined,
        itemType,
        affectsStock,
        generatesAsset: itemType === PurchaseItemTypes.FIXED_ASSET,
        isService: itemType === PurchaseItemTypes.SERVICE,
        isSubscription: itemType === PurchaseItemTypes.SUBSCRIPTION,
      });

      if (isEditMode && editingItemKey) {
        return {
          ...prev,
          items: items.map((item, index) =>
            getItemKey(item, index) === editingItemKey ? buildNextItem(item) : item,
          ),
        };
      }

      if (existing) {
        const nextItems = items.map((item) =>
          item.skuId === finalItemId
            ? recalcItem({
                ...item,
                quantity: item.quantity + quantity,
                unitPrice,
                afectType,
                equivalence,
                factor,
                unitBase,
                itemType,
                affectsStock,
                generatesAsset: itemType === PurchaseItemTypes.FIXED_ASSET,
                isService: itemType === PurchaseItemTypes.SERVICE,
                isSubscription: itemType === PurchaseItemTypes.SUBSCRIPTION,
              })
            : item,
        );
        return { ...prev, items: nextItems };
      }

      const newItem: PurchaseOrderItem = {
        ...buildNextItem(),
        clientKey: affectsStock ? undefined : createClientKey(),
      };

      return { ...prev, items: [...items, newItem] };
    });

    setSelectedSkuId("");
    setManualDescription("");
  };

  useEffect(() => {
    if (!open) {
      setEquivalences([]);
      setLoading(false);
      resetPending();
      return;
    }

    if (editingItem) {
      const nextItemType = editingItem.itemType ?? getDefaultItemType(purchaseType);
      const description = (editingItem.name ?? editingItem.description ?? "").trim();
      const catalogProduct = getPurchaseSkuInfoFromItem(editingItem);

      setPendingItemAfectType(editingItem.afectType ?? AfectType.TAXED);
      setPendingItemQuantity(Number(editingItem.quantity ?? 1));
      setPendingItemUnitPrice(Number(editingItem.unitPrice ?? 0));
      setPendingItemType(nextItemType);
      setPendingFactor(Number(editingItem.factor ?? 1));
      setPendingStockUnit(editingItem.equivalence ?? "NIU");
      setPendingPurchaseUnit(editingItem.unitBase ?? "NIU");
      setCatalogQuery(description);
      setCatalogProducts(catalogProduct ? [catalogProduct] : []);
      setSelectedSkuId(editingItem.skuId ?? "");
      setManualDescription(description);
      return;
    }

    resetPending();
    setPendingItemType(getDefaultItemType(purchaseType));
    setPendingStockUnit(null);
    setPendingPurchaseUnit(null);
  }, [editingItem, open, purchaseType]);

  useEffect(() => {
    if (!open || !isCatalogItemType) return;

    let active = true;
    const timeoutId = window.setTimeout(() => {
      void loadCatalogProducts(pendingItemType, catalogQuery, () => active);
    }, catalogQuery.trim() ? 350 : 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [catalogQuery, isCatalogItemType, loadCatalogProducts, open, pendingItemType]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const canUpdate = () => active;

    const run = async () => {
      const selectedProduct = catalogProducts.find((p) => p.skuId === selectedSkuId);
      if (!isCatalogItemType || !selectedProduct) {
        if (equivalences.length > 0) setEquivalences([]);
        if (pendingFactor !== 0) setPendingFactor(0);
        if (pendingStockUnit !== null) setPendingStockUnit(null);
        if (pendingPurchaseUnit !== null) setPendingPurchaseUnit(null);
        return;
      }
      if (!selectedProduct) {
        if (canUpdate()) showFeedbackRef.current(errorResponse("No se encontró el producto seleccionado"));
        return;
      }

      if (!selectedProduct.productId) {
        if (canUpdate()) showFeedbackRef.current(errorResponse("No se encontro el producto base del SKU seleccionado"));
        return;
      }

      const unitList = await loadUnits(canUpdate);
      if (!active) return;

      await loadEquivalences(selectedProduct.productId, unitList, selectedProduct.unitCode, canUpdate);
    };

    void run();

    return () => {
      active = false;
    };
  }, [
    catalogProducts,
    equivalences.length,
    isCatalogItemType,
    loadEquivalences,
    loadUnits,
    open,
    pendingFactor,
    pendingPurchaseUnit,
    pendingStockUnit,
    selectedSkuId,
  ]);

  const afectTypeOptions = [
    { value: AfectType.TAXED, label: "GRAVADA - OPERACION ONEROSA" },
    { value: AfectType.EXEMPT, label: "EXONERADA - OPERACION ONEROSA" },
  ];
  const buildProductLabel = (product?: PurchaseSkuInfo) =>
    product ? buildPurchaseSkuLabel(product) : "SKU";

  const catalogOptions = useMemo(
    () =>
      catalogProducts.map((product) => ({
        value: product.skuId,
        label: buildPurchaseSkuLabel(product),
      })),
    [catalogProducts],
  );


  const equivalenceRows = useMemo<EquivalenceRow[]>(() => {
    return equivalences.map((eq) => {
      const fromLabel = units.find((u) => u.id === eq.fromUnitId);
      const toLabel = units.find((u) => u.id === eq.toUnitId);
      const fromName = fromLabel?.name ?? eq.fromUnit?.name ?? "UNIDADES";
      const toName = toLabel?.name ?? eq.toUnit?.name ?? "UNIDADES";
      const fromCode = fromLabel?.code ?? eq.fromUnit?.code ?? "NIU";
      const toCode = toLabel?.code ?? eq.toUnit?.code ?? "NIU";
      const rawFactor = Number(eq.factor ?? 1);
      const factor = Number.isFinite(rawFactor) && rawFactor > 0 ? rawFactor : 1;

      return {
        id: eq.id,
        fromName,
        fromCode,
        toName,
        toCode,
        factor,
        unitLabel: `Comprar en ${toName} (${toCode})`,
        equivalenceLabel: `1 ${toCode} = ${factor} ${fromCode}`,
      };
    });
  }, [equivalences, units]);

  const isActiveRow = useCallback(
    (row: EquivalenceRow) =>
      pendingPurchaseUnit === row.toCode &&
      pendingStockUnit === row.fromCode &&
      pendingFactor === row.factor,
    [pendingFactor, pendingPurchaseUnit, pendingStockUnit],
  );

  const equivalenceColumns = useMemo<DataTableColumn<EquivalenceRow>[]>(() => {
    return [
      {
        id: "unit",
        header: "Unidad de medida",
        accessorKey: "unitLabel",
        className: "text-black/70",
        headerClassName: "text-left",
        sortable: false,
      },
      {
        id: "equivalence",
        header: "Equivalencia",
        accessorKey: "equivalenceLabel",
        className: "text-black/70",
        headerClassName: "text-left",
        sortable: false,
      },
      {
        id: "active",
        header: "",
        cell: (row) =>
          isActiveRow(row) ? (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
          ) : null,
        className: "text-right",
        headerClassName: "text-right",
        sortable: false,
      },
    ];
  }, [isActiveRow, primaryColor]);

  if (!open) return null;

  return (
    <Modal onClose={handleClose} title={isEditMode ? "Editar Producto" : "Agregar Producto"} className="w-lg">
      <div className="space-y-4">
        <div className="">
          <SectionHeaderForm icon={Boxes} title="tributación" />

          <div className="mt-4 mb-3 grid grid-cols-1 gap-3 md:grid-cols-1"> 
            <FloatingSelect
              label="Tipo de afectación"
              name="afectType"
              value={
                documentType === VoucherDocTypes.NOTA_VENTA
                  ? AfectType.EXEMPT
                  : pendingItemAfectType
              }
              onChange={(value) => setPendingItemAfectType(value as AfectTypeType)}
              options={afectTypeOptions}
              placeholder="Seleccionar tipo de afectación"
              searchable={false}
              disabled={true  }
            />
          </div>
        </div>
        <div className="">
          <SectionHeaderForm icon={Boxes} title="Datos del producto" />

          <div className="mt-4 mb-3 grid grid-cols-1 gap-3 md:grid-cols-1">
            <PurchaseItemTypeSelect
              value={pendingItemType}
              onChange={(value) => {
                setPendingItemType(value);
                setCatalogQuery("");
                setCatalogProducts([]);
                setSelectedSkuId("");
                setManualDescription("");
                setEquivalences([]);
                setPendingFactor(0);
                setPendingStockUnit(null);
                setPendingPurchaseUnit(null);
              }}
            />

            {isCatalogItemType ? (
              <FloatingSelect
                label="Producto o descripcion"
                name="purchase-catalog-item"
                value={selectedSkuId}
                onChange={setSelectedSkuId}
                options={catalogOptions}
                searchable
                searchPlaceholder="Selecciona un producto"
                emptyMessage="Sin productos"
                onSearchChange={(text) => setCatalogQuery(text)}
                panelWidthMode="min-trigger"
              />
            ) : (
              <FloatingInput
                label="Producto o descripcion"
                name="purchase-manual-description"
                value={manualDescription}
                onChange={(event) => setManualDescription(event.target.value)}
              />
            )}
            <div className="mb-0 mt-1 grid grid-cols-1 gap-3 md:grid-cols-2">
              <FloatingInput
                label="Cantidad"
                name="quantity"
                type="number"
                min={0.001}
                step={0.001}
                value={String(pendingItemQuantity)}
                onChange={(e) => setPendingItemQuantity(parseDecimalInput(e.target.value))}
              />

              <FloatingInput
                label="Precio unit."
                name="unitPrice"
                type="number"
                min={0}
                value={String(pendingItemUnitPrice)}
                onChange={(e) => setPendingItemUnitPrice(parseDecimalInput(e.target.value || 0))}
              />
            </div>
          </div>
        </div>

        {isCatalogItemType ? (
        <div className="">
          <SectionHeaderForm icon={Scale} title="Equivalencias" />
            <div className="max-h-56 overflow-auto">
              <DataTable
                tableId="purchase-equivalences-table"
                data={equivalenceRows}
                columns={equivalenceColumns}
                rowKey="id"
                loading={loading}
                emptyMessage="No hay equivalencias registradas."
                hoverable={false}
                animated={false}
                onRowClick={(row) => {
                  // Compra en la unidad destino (toCode), inventario queda en la base (fromCode).
                  setPendingPurchaseUnit(row.toCode || "NIU");
                  setPendingStockUnit(row.fromCode || "NIU");
                  const nextFactor = Number(row.factor ?? 1);
                  setPendingFactor(Number.isFinite(nextFactor) && nextFactor > 0 ? nextFactor : 1);
                }}
                rowClassName={(row) =>
                  isActiveRow(row) ? "bg-black/5 hover:bg-black/5" : "hover:bg-black/[0.03]"
                }
              />
            </div>
        </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <SystemButton variant="ghost" 
          className=" bg-gray-200" onClick={handleClose}>
            Cancelar
          </SystemButton>

          <SystemButton
            style={{
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
            onClick={() => {
              clearFeedback();
              if (isCatalogItemType && !selectedSkuId) {
                showFeedback(errorResponse("Debe seleccionar un item"));
                return;
              }
              if (!isCatalogItemType && !manualDescription.trim()) {
                showFeedback(errorResponse("Debe ingresar una descripcion"));
                return;
              }

              const selectedProduct = catalogProducts.find((p) => p.skuId === selectedSkuId);
              const hasSelection = Boolean(pendingPurchaseUnit || pendingStockUnit);
              const hasEquivalences = equivalences.length > 0;

              if (isCatalogItemType && hasEquivalences && !hasSelection) {
                showFeedback(errorResponse("Debe elegir una equivalencia"));
                return;
              }

              addSelectedProduct(selectedSkuId, {
                quantity: pendingItemQuantity,
                unitPrice: pendingItemUnitPrice,
                afectType:
                  documentType === VoucherDocTypes.NOTA_VENTA
                    ? AfectType.EXEMPT
                    : pendingItemAfectType,
                equivalence: pendingStockUnit,
                factor: pendingFactor,
                unitBase: pendingPurchaseUnit,
                name: isCatalogItemType ? buildProductLabel(selectedProduct) : manualDescription.trim(),
                itemType: pendingItemType,
              });

              handleClose();
            }}
          >
            {isEditMode ? "Actualizar" : "Agregar"}
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}

