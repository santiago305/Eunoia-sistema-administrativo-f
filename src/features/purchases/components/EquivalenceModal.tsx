import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Boxes, Scale } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { errorResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { listProductEquivalences } from "@/shared/services/equivalenceService";
import { listUnits } from "@/shared/services/unitService";
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
import { buildPurchaseSkuLabel, type PurchaseSkuInfo } from "../utils/purchaseSkus";
import { PurchaseItemTypeSelect } from "./PurchaseItemTypeSelect";
import {
  PurchaseItemTypes,
  PurchaseTypes,
  purchaseItemTypesWithoutStock,
  type PurchaseItemType,
  type PurchaseType,
} from "../types/purchase-classification.types";

type EquivalenceModalProps = {
  open: boolean;
  itemId: string;
  products: PurchaseSkuInfo[];
  documentType: PurchaseOrder["documentType"];
  primaryColor: string;
  igv: number;
  setForm: Dispatch<SetStateAction<PurchaseOrder>>;
  setItemId: Dispatch<SetStateAction<string>>;
  purchaseType: PurchaseType;
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

export function EquivalenceModal({
  open,
  itemId,
  products,
  documentType,
  primaryColor,
  igv,
  setForm,
  setItemId,
  purchaseType,
  onClose,
}: EquivalenceModalProps) {
  const { showFeedback, clearFeedback } = useFeedbackToast();
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

  const resetPending = () => {
    setPendingItemAfectType(AfectType.TAXED);
    setPendingItemQuantity(1);
    setPendingItemUnitPrice(0);
    setPendingItemType(PurchaseItemTypes.PRODUCT);
    setPendingFactor(0);
    setPendingStockUnit("");
    setPendingPurchaseUnit("");
  };

  const handleClose = useCallback(() => {
    setEquivalences([]);
    setLoading(false);
    resetPending();
    onClose();
  }, [onClose]);

  const loadUnits = useCallback(async (canUpdate: () => boolean) => {
    if (units.length > 0) return units;
    try {
      const res = await listUnits();
      const list = res ?? [];
      if (canUpdate()) setUnits(list);
      return list;
    } catch {
      if (canUpdate()) showFeedback(errorResponse("Error al cargar unidades"));
      return [];
    }
  }, [showFeedback, units]);

  const loadEquivalences = useCallback(async (
    productId: string,
    unitList: ListUnitResponse,
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
        setPendingPurchaseUnit("NIU");
        setPendingStockUnit("NIU");
        setPendingFactor(1);
      }
    } catch {
      if (canUpdate()) {
        setEquivalences([]);
        showFeedback(errorResponse("Error al cargar equivalencias"));
      }
    } finally {
      if (canUpdate()) setLoading(false);
    }
  }, [showFeedback]);

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
    const finalItemId = selectedItemId ?? itemId;
    if (!finalItemId) return;

    const nextQuantity = Number(opts?.quantity ?? 1);
    const quantity = Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1;
    const unitPrice = Math.max(0, opts?.unitPrice ?? 0);
    const afectType = opts?.afectType ?? AfectType.TAXED;
    const equivalence = opts?.equivalence ?? "";
    const nextFactor = Number(opts?.factor ?? 1);
    const factor = Number.isFinite(nextFactor) && nextFactor > 0 ? nextFactor : 1;
    const unitBase = opts?.unitBase ?? "";
    const itemType = opts?.itemType ?? PurchaseItemTypes.PRODUCT;
    const affectsStock = !purchaseItemTypesWithoutStock.includes(itemType);

    setForm((prev) => {
      const items = prev.items ?? [];
      const existing = items.find((item) => item.skuId === finalItemId);

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

      const newItem: PurchaseOrderItem = recalcItem({
        skuId: finalItemId,
        unitBase,
        equivalence,
        factor,
        afectType,
        quantity,
        porcentageIgv: igv * 100,
        baseWithoutIgv: 0,
        amountIgv: 0,
        unitValue: 0,
        unitPrice,
        purchaseValue: 0,
        name: opts?.name,
        itemType,
        affectsStock,
        generatesAsset: itemType === PurchaseItemTypes.FIXED_ASSET,
        isService: itemType === PurchaseItemTypes.SERVICE,
        isSubscription: itemType === PurchaseItemTypes.SUBSCRIPTION,
      });

      return { ...prev, items: [...items, newItem] };
    });

    setItemId("");
  };

  useEffect(() => {
    if (!open) {
      setEquivalences([]);
      setLoading(false);
      resetPending();
      return;
    }

    let active = true;
    const canUpdate = () => active;

    const run = async () => {
      if (!itemId) {
        if (active) handleClose();
        return;
      }

      const selectedProduct = products.find((p) => p.skuId === itemId);
      if (!selectedProduct) {
        if (canUpdate()) showFeedback(errorResponse("No se encontró el producto seleccionado"));
        if (active) handleClose();
        return;
      }

      if (!selectedProduct.productId) {
        if (canUpdate()) showFeedback(errorResponse("No se encontro el producto base del SKU seleccionado"));
        if (active) handleClose();
        return;
      }

      setPendingItemAfectType(AfectType.TAXED);
      setPendingItemQuantity(1);
      setPendingItemUnitPrice(0);
      setPendingItemType(
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
                  : PurchaseItemTypes.PRODUCT,
      );
      setPendingFactor(0);
      setPendingStockUnit(null);
      setPendingPurchaseUnit(null);

      const unitList = await loadUnits(canUpdate);
      if (!active) return;

      await loadEquivalences(selectedProduct.productId, unitList, canUpdate);
    };

    void run();

    return () => {
      active = false;
    };
  }, [open, itemId, products, handleClose, loadEquivalences, loadUnits, showFeedback]);

  const afectTypeOptions = [
    { value: AfectType.TAXED, label: "GRAVADA - OPERACION ONEROSA" },
    { value: AfectType.EXEMPT, label: "EXONERADA - OPERACION ONEROSA" },
  ];
  const buildProductLabel = (product?: PurchaseSkuInfo) =>
    product ? buildPurchaseSkuLabel(product) : "SKU";


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
    <Modal onClose={handleClose} title="Agregar Producto" className="w-lg">
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
              disabled={documentType === VoucherDocTypes.NOTA_VENTA}
            />
          </div>
        </div>
        <div className="">
          <SectionHeaderForm icon={Boxes} title="Datos del producto" />

          <div className="mt-4 mb-3 grid grid-cols-1 gap-3 md:grid-cols-1">
            <div className="mb-0 mt-1 grid grid-cols-1 gap-3 md:grid-cols-2">
              <PurchaseItemTypeSelect
                value={pendingItemType}
                onChange={setPendingItemType}
              />

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
              if (!itemId) return;

              const hasSelection = Boolean(pendingPurchaseUnit || pendingStockUnit);
              const hasEquivalences = equivalences.length > 0;

              if (hasEquivalences && !hasSelection) {
                showFeedback(errorResponse("Debe elegir una equivalencia"));
                return;
              }

              addSelectedProduct(itemId, {
                quantity: pendingItemQuantity,
                unitPrice: pendingItemUnitPrice,
                afectType:
                  documentType === VoucherDocTypes.NOTA_VENTA
                    ? AfectType.EXEMPT
                    : pendingItemAfectType,
                equivalence: pendingStockUnit,
                factor: pendingFactor,
                unitBase: pendingPurchaseUnit,
                name: buildProductLabel(products.find((p) => p.skuId === itemId)),
                itemType: pendingItemType,
              });

              handleClose();
            }}
          >
            Agregar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}

