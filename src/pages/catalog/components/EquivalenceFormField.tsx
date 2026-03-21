import { createProductEquivalence, deleteProductEquivalence } from "@/services/equivalenceService";
import { ProductEquivalence } from "@/pages/catalog/types/equivalence";
import { ListUnitResponse } from "@/pages/catalog/types/unit";
import { Power } from "lucide-react";
import { useState } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { Plus } from "lucide-react";
import { SystemButton } from "@/components/SystemButton";

export function EquivalenceFormFields({
  productId,
  baseUnitId,
  units,
  equivalences,
  loading,
  onCreated,
  PRIMARY,
}: {
  productId: string;
  baseUnitId: string;
  units?: ListUnitResponse;
  equivalences: ProductEquivalence[];
  loading: boolean;
  onCreated: () => Promise<void>;
  PRIMARY: string;
}) {
  const [fromUnitId, setFromUnitId] = useState("");
  const [factor, setFactor] = useState("1");

  const unitOptions = (units ?? []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  }));

  const baseUnitLabel =
    (units ?? []).find((u) => u.id === baseUnitId)?.name ?? (baseUnitId ? baseUnitId : "Sin unidad base");

  const handleCreate = async () => {
    if (!productId || !baseUnitId || !fromUnitId || !factor) return;
    await createProductEquivalence({
      productId,
      fromUnitId,
      toUnitId: baseUnitId,
      factor: Number(factor),
    });
    setFromUnitId("");
    setFactor("1");
    await onCreated();
  };

  const deleteEquivalence = async (id: string) => {
    try {
      await deleteProductEquivalence(id);
      await onCreated();
    } catch {
      console.log("algo salio mal");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_45px] mt-2">
          <FloatingInput
            label="Unidad origen"
            value={baseUnitLabel}
            name="origin"
            disabled
          />
          <FloatingInput
            label="Factor"
            type="number"
            name="factor"
            value={factor}
            min={1}
            onChange={(e) => setFactor(e.target.value)}
          />
          <FloatingSelect
            label="Unidad de destino"
            name="destino"
            value={fromUnitId}
            onChange={(value) => setFromUnitId(value)}
            options={unitOptions}
            placeholder="Seleccionar unidad"
            searchable
            searchPlaceholder="Buscar unidad..."
            emptyMessage="Sin unidades de medida"
          />
          <SystemButton 
            leftIcon={<Plus className="h-4 w-4" />}
            className="h-10"
            style={{ backgroundColor: PRIMARY, borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}
            onClick={() => void handleCreate()}
            disabled={!productId || !baseUnitId || !fromUnitId || !factor}
            >
          </SystemButton>
      </div>

      <div className="rounded-2xl border border-black/10 overflow-hidden">
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
                return (
                  <tr key={eq.id} className="border-b border-black/5">
                    <td className="py-2 px-5 text-left">{fromLabel ? `${fromLabel.name} (${eq.factor})` : eq.toUnitId}</td>
                    <td className="py-2 px-5 text-left">Equivale a {eq.factor} - {toLabel?.name}</td>
                    <td>
                      <SystemButton
                        variant="danger"
                        size="custom"
                        className="h-8 w-9 rounded-lg"
                        onClick={() => {
                          void deleteEquivalence(eq.id);
                        }}
                      >
                        <Power className="h-4 w-4" />
                      </SystemButton>
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
    </div>
  );
}

