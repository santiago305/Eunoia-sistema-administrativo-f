import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/settings/modal";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { Plus, Power } from "lucide-react";
import {
  createSupplierMethod,
  deleteSupplierMethod,
  getAllPaymentMethods,
  getPaymentMethodsBySupplier,
} from "@/services/paymentMethodService";
import type { PaymentMethod } from "@/pages/payment-methods/types/paymentMethod";
import { PrimaryButton } from "@/pages/profile/components/ProfilePrimitives";

type ProviderMethodListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  supplierId: string;
};

type SelectOption = { value: string; label: string };

export function ProviderMethodListModal({
  title,
  close,
  className,
  supplierId,
}: ProviderMethodListModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [rows, setRows] = useState<PaymentMethod[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const loadSupplierMethods = async (options?: { silent?: boolean }) => {
    if (!supplierId) return;
    if (!options?.silent) clearFlash();
    setLoading(true);
    try {
      const data = await getPaymentMethodsBySupplier(supplierId);
      setRows(data ?? []);
    } catch {
      setRows([]);
      if (!options?.silent) {
        showFlash(errorResponse("No se pudieron cargar los metodos de pago."));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAllMethods = async (options?: { silent?: boolean }) => {
    if (!options?.silent) clearFlash();
    try {
      const records = await getAllPaymentMethods();
      setAllMethods(records);
    } catch {
      setAllMethods([]);
      if (!options?.silent) {
        showFlash(errorResponse("No se pudieron cargar los metodos de pago disponibles."));
      }
    }
  };

  useEffect(() => {
    void loadSupplierMethods();
    void loadAllMethods({ silent: true });
  }, [supplierId]);

  const availableOptions = useMemo<SelectOption[]>(() => {
    const selectedSet = new Set(rows.map((r) => r.methodId));
    return allMethods
      .filter((m) => !selectedSet.has(m.methodId))
      .map((m) => ({ value: m.methodId, label: `${m.name} ${m.number ? `- ${m.number}` : ""}` }));
  }, [allMethods, rows]);

  useEffect(() => {
    if (selectedId && !availableOptions.some((o) => o.value === selectedId)) {
      setSelectedId("");
    }
  }, [availableOptions, selectedId]);

  const addMethod = async () => {
    if (!supplierId || !selectedId || adding) return;
    clearFlash();
    setAdding(true);
    try {
      await createSupplierMethod({ supplierId, methodId: selectedId });
      showFlash(successResponse("Metodo agregado"));
      setSelectedId("");
      await loadSupplierMethods({ silent: true });
    } catch {
      showFlash(errorResponse("No se pudo agregar el metodo"));
    } finally {
      setAdding(false);
    }
  };

  const removeMethod = async (methodId?: string | null) => {
    if (!supplierId || !methodId) return;
    clearFlash();
    try {
      await deleteSupplierMethod(supplierId, methodId);
      showFlash(successResponse("Metodo eliminado"));
      await loadSupplierMethods({ silent: true });
    } catch {
      showFlash(errorResponse("No se pudo eliminar el metodo"));
    }
  };

  return (
    <Modal onClose={close} title={title} className={className}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-black/60">{loading ? "Cargando..." : `${rows.length} metodos`}</div>
        </div>

        <div className="rounded-2xl border border-black/10 overflow-auto">
          <div className="flex flex-col gap-3 px-5 py-4 border-b border-black/10 text-xs text-black/60">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <FilterableSelect
                  value={selectedId}
                  onChange={setSelectedId}
                  options={availableOptions}
                  placeholder="Seleccionar metodo"
                  searchPlaceholder="Buscar metodo..."
                  className="h-10"
                  textSize="text-xs"
                />
              </div>
              <PrimaryButton type="submit" disabled={!selectedId || adding} onClick={addMethod}>
                <Plus className="h-4 w-4" />
                {adding ? "Anadiendo..." : "Anadir"}
              </PrimaryButton>
            </div>
          </div>

          <div className="max-h-100 overflow-auto min-h-70">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="py-2 px-5 text-left">Metodo</th>
                  <th className="py-2 px-5 text-left">Numero</th>
                  <th className="py-2 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.methodId} className="border-b border-black/5">
                    <td className="py-2 px-5 text-left">{m.name}</td>
                    <td className="py-2 px-5 text-left">{m.number ?? "-"}</td>
                    <td className="py-2 px-5 text-right">
                      <button
                        className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-red-500 text-lime-50 font-semibold hover:bg-red-400"
                        onClick={() => removeMethod(m.methodId)}
                        title="Eliminar metodo"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && rows.length === 0 && (
              <div className="px-4 py-4 text-sm text-black/60">No hay metodos asignados.</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
