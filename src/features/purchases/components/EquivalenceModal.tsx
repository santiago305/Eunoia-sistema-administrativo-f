import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Boxes, Scale } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { errorResponse } from "@/shared/common/utils/response";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
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

type EquivalenceModalProps = {
  open: boolean;
  itemId: string;
  products: PurchaseSkuInfo[];
  documentType: PurchaseOrder["documentType"];
  primaryColor: string;
  igv: number;
  setForm: Dispatch<SetStateAction<PurchaseOrder>>;
  setItemId: Dispatch<SetStateAction<string>>;
  onClose: () => void;
};

type EquivalenceRow = {
  id: string;
  fromName: string;
  toName: string;
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
  onClose,
}: EquivalenceModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [loading, setLoading] = useState(false);
  const [equivalences, setEquivalences] = useState<ProductEquivalence[]>([]);
  const [units, setUnits] = useState<ListUnitResponse>([]);
  const [pendingItemAfectType, setPendingItemAfectType] = useState<AfectTypeType>(AfectType.TAXED);
  const [pendingItemQuantity, setPendingItemQuantity] = useState<number>(1);
  const [pendingItemUnitPrice, setPendingItemUnitPrice] = useState<number>(0);
  const [pendingFactor, setPendingFactor] = useState<number>(0);
  const [pendingEquivalence, setPendingEquivalence] = useState<string | null>(null);
  const [pendingUnitBase, setPendingUnitBase] = useState<string | null>(null);

  const resetPending = () => {
    setPendingItemAfectType(AfectType.TAXED);
    setPendingItemQuantity(1);
    setPendingItemUnitPrice(0);
    setPendingFactor(0);
    setPendingEquivalence("");
    setPendingUnitBase("");
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
      if (canUpdate()) showFlash(errorResponse("Error al cargar unidades"));
      return [];
    }
  }, [showFlash, units]);

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
      if (canUpdate()) {
        setEquivalences([]);
        showFlash(errorResponse("Error al cargar equivalencias"));
      }
    } finally {
      if (canUpdate()) setLoading(false);
    }
  }, [showFlash]);

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
    },
  ) => {
    const finalItemId = selectedItemId ?? itemId;
    if (!finalItemId) return;

    const quantity = Math.max(1, opts?.quantity ?? 1);
    const unitPrice = Math.max(0, opts?.unitPrice ?? 0);
    const afectType = opts?.afectType ?? AfectType.TAXED;
    const equivalence = opts?.equivalence ?? "";
    const factor = Math.max(0, opts?.factor ?? 0);
    const unitBase = opts?.unitBase ?? "";

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
        if (canUpdate()) showFlash(errorResponse("No se encontró el producto seleccionado"));
        if (active) handleClose();
        return;
      }

      if (!selectedProduct.productId) {
        if (canUpdate()) showFlash(errorResponse("No se encontro el producto base del SKU seleccionado"));
        if (active) handleClose();
        return;
      }

      setPendingItemAfectType(AfectType.TAXED);
      setPendingItemQuantity(1);
      setPendingItemUnitPrice(0);
      setPendingFactor(0);
      setPendingEquivalence(null);
      setPendingUnitBase(null);

      const unitList = await loadUnits(canUpdate);
      if (!active) return;

      await loadEquivalences(selectedProduct.productId, unitList, canUpdate);
    };

    void run();

    return () => {
      active = false;
    };
  }, [open, itemId, products, handleClose, loadEquivalences, loadUnits, showFlash]);

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
      const fromName = fromLabel?.name ?? "UNIDADES";
      const toName = toLabel?.name ?? "UNIDADES";
      const factor = Number(eq.factor ?? 1);

      return {
        id: eq.id,
        fromName,
        toName,
        factor,
        unitLabel: fromLabel ? `${toName} (${factor})` : eq.toUnitId,
        equivalenceLabel: `Equivale a ${factor} - ${fromName}`,
      };
    });
  }, [equivalences, units]);

  const isActiveRow = useCallback(
    (row: EquivalenceRow) =>
      pendingEquivalence === row.fromName &&
      pendingUnitBase === row.toName &&
      pendingFactor === row.factor,
    [pendingEquivalence, pendingFactor, pendingUnitBase],
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
              <FloatingInput
                label="Cantidad"
                name="quantity"
                type="number"
                min={0}
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
                  setPendingEquivalence(row.fromName || "UNIDADES");
                  setPendingFactor(row.factor ?? 1);
                  setPendingUnitBase(row.toName || "UNIDADES");
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
              clearFlash();
              if (!itemId) return;

              const hasSelection = Boolean(pendingEquivalence || pendingUnitBase);
              const hasEquivalences = equivalences.length > 0;

              if (hasEquivalences && !hasSelection) {
                showFlash(errorResponse("Debe elegir una equivalencia"));
                return;
              }

              addSelectedProduct(itemId, {
                quantity: pendingItemQuantity,
                unitPrice: pendingItemUnitPrice,
                afectType:
                  documentType === VoucherDocTypes.NOTA_VENTA
                    ? AfectType.EXEMPT
                    : pendingItemAfectType,
                equivalence: pendingUnitBase,
                factor: pendingFactor,
                unitBase:pendingEquivalence,
                name: buildProductLabel(products.find((p) => p.skuId === itemId)),
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
