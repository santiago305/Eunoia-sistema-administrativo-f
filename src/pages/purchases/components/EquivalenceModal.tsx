import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Modal } from "@/components/settings/modal";
import { errorResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { listProductEquivalences } from "@/services/equivalenceService";
import { listUnits } from "@/services/unitService";
import { AfectType, VoucherDocTypes } from "@/pages/purchases/types/purchaseEnums";
import type { AfectTypeType } from "@/pages/purchases/types/purchaseEnums";
import type { FinishedProducts } from "@/pages/catalog/types/variant";
import type { ProductEquivalence } from "@/pages/catalog/types/equivalence";
import type { ListUnitResponse } from "@/pages/catalog/types/unit";
import type { PurchaseOrder, PurchaseOrderItem } from "@/pages/purchases/types/purchase";
import { recalcItem } from "@/utils/functionPurchases";

type EquivalenceModalProps = {
  open: boolean;
  itemId: string;
  products: FinishedProducts[];
  documentType: PurchaseOrder["documentType"];
  primaryColor: string;
  igv: number;
  setForm: Dispatch<SetStateAction<PurchaseOrder>>;
  setItemId: Dispatch<SetStateAction<string>>;
  onClose: () => void;
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

  const handleClose = () => {
    setEquivalences([]);
    setLoading(false);
    resetPending();
    onClose();
  };

  const loadUnits = async (canUpdate: () => boolean) => {
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
  };

  const loadEquivalences = async (
    productId: string,
    unitList: ListUnitResponse,
    canUpdate: () => boolean,
  ) => {
    if (canUpdate()) setLoading(true);
    try {
      const res = await listProductEquivalences({ productId });
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

        setPendingEquivalence(toName);
        setPendingUnitBase(fromName);
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
  };

  const addSelectedProduct = (
    selectedItemId?: string,
    opts?: {
      quantity?: number;
      unitPrice?: number;
      afectType?: AfectTypeType;
      equivalence?: string | null;
      factor?: number;
      unitBase?: string | null;
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
      const existing = items.find((item) => item.stockItemId === finalItemId);

      if (existing) {
        const nextItems = items.map((item) =>
          item.stockItemId === finalItemId
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
        stockItemId: finalItemId,
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

      const selectedProduct = products.find((p) => p.itemId === itemId);
      if (!selectedProduct) {
        if (canUpdate()) showFlash(errorResponse("No se encontró el producto seleccionado"));
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

      await loadEquivalences(itemId, unitList, canUpdate);
    };

    void run();

    return () => {
      active = false;
    };
  }, [open, itemId, products]);

  if (!open) return null;

  return (
    <Modal onClose={handleClose} title="Agregar Producto" className="w-md">
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-1">
        <label className="text-sm">
          Tipo de afectación
          <select
            className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm"
            value={documentType === VoucherDocTypes.NOTA_VENTA ? AfectType.EXEMPT : pendingItemAfectType}
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

      <div className="rounded-lg border border-black/10 overflow-hidden">
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
                const fromLabel = units.find((u) => u.id === eq.fromUnitId);
                const toLabel = units.find((u) => u.id === eq.toUnitId);
                const fromName = fromLabel?.name ?? "UNIDADES";
                const toName = toLabel?.name ?? "UNIDADES";
                const isActive =
                  pendingEquivalence === toName &&
                  pendingUnitBase === fromName &&
                  pendingFactor === (eq.factor ?? 1);

                return (
                  <tr
                    key={eq.id}
                    className={`border-b border-black/5 hover:bg-gray-300 hover:text-white cursor-pointer ${isActive ? "bg-gray-300 text-white" : ""}`}
                    onClick={() => {
                      setPendingEquivalence(toName || "UNIDADES");
                      setPendingFactor(eq.factor ?? 1);
                      setPendingUnitBase(fromName || "UNIDADES");
                    }}
                  >
                    <td className="py-2 px-5 text-left">
                      {toLabel ? `${toLabel.name} (${eq.factor})` : eq.toUnitId}
                    </td>
                    <td className="py-2 px-5 text-left">
                      Equivale a {eq.factor} - {fromLabel?.name ?? eq.fromUnitId}
                    </td>
                    <td>
                      <span className="text-xs text-black/40"></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && equivalences.length === 0 && (
            <div className="px-4 py-4 text-sm text-black/60">No hay equivalencias registradas.</div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-lg border border-black/10 px-4 py-2 text-sm" onClick={handleClose}>
          Cancelar
        </button>

        <button
          className="rounded-lg border px-4 py-2 text-sm text-white"
          style={{ backgroundColor: primaryColor, borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)` }}
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
                documentType === VoucherDocTypes.NOTA_VENTA ? AfectType.EXEMPT : pendingItemAfectType,
              equivalence: pendingEquivalence,
              factor: pendingFactor,
              unitBase: pendingUnitBase,
            });

            handleClose();
          }}
        >
          Agregar
        </button>
      </div>
    </Modal>
  );
}
