import { FilterableSelect } from "@/components/SelectFilterable";
import { createProductEquivalence, deleteProductEquivalence } from "@/services/equivalenceService";
import { ProductEquivalence } from "@/types/equivalence";
import { ListUnitResponse } from "@/types/unit";
import { Power } from "lucide-react";
import { useState } from "react";

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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_45px]">
        <label className="text-sm">
          <div className="mb-2">Unidad origen</div>
          <input
            className="h-10 w-full rounded-lg border border-black/10 bg-gray-100 px-3 text-sm text-black/60"
            value={baseUnitLabel}
            disabled
          />
        </label>
        <label className="text-sm">
          <div className="mb-2">Factor</div>
          <input
            type="number"
            min="0"
            step="1"
            className="h-10 w-full rounded-lg border border-black/10 px-3 text-sm"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <div className="mb-2">Unidad destino</div>
          <FilterableSelect
            value={fromUnitId}
            onChange={setFromUnitId}
            options={unitOptions}
            placement="bottom"
            placeholder="Seleccionar unidad"
            searchPlaceholder="Buscar unidad..."
          />
        </label>
        <button
          type="button"
          className="rounded-xl border h-10 text-xl text-white mt-7"
          style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
          onClick={() => void handleCreate()}
          disabled={!productId || !baseUnitId || !fromUnitId || !factor}
        >
          +
        </button>
      </div>

      <div className="flex justify-end"></div>

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
                    <td className="py-2 px-5 text-left">{fromLabel ? `${fromLabel.name} x ${eq.factor}` : eq.fromUnitId}</td>
                    <td className="py-2 px-5 text-left">Equivale a {eq.factor} - {toLabel?.name}</td>
                    <td>
                      <button
                        className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-red-500 text-lime-50 font-semibold hover:bg-red-400"
                        onClick={() => {
                          void deleteEquivalence(eq.id);
                        }}
                      >
                        <Power className="h-4 w-4" />
                      </button>
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