import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/settings/modal";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { Plus, Power } from "lucide-react";
import {
  createCompanyMethod,
  deleteCompanyMethod,
  getAllPaymentMethods,
  getPaymentMethodsByCompany,
} from "@/services/paymentMethodService";
import type { PaymentMethod, PaymentMethodPivot } from "@/pages/payment-methods/types/paymentMethod";
import { PrimaryButton } from "@/pages/profile/components/ProfilePrimitives";

type PaymentMethodListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  companyId: string;
};

type SelectOption = { value: string; label: string };

export function PaymentMethodListModal({
  title,
  close,
  className,
  companyId,
}: PaymentMethodListModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [rows, setRows] = useState<PaymentMethodPivot[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [number, setNumber] = useState("");

  const loadCompanyMethods = async (options?: { silent?: boolean }) => {
    if (!companyId) return;
    if (!options?.silent) clearFlash();
    setLoading(true);
    try {
      const data = await getPaymentMethodsByCompany(companyId);
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
    void loadCompanyMethods();
    void loadAllMethods({ silent: true });
  }, [companyId]);

  const availableOptions = useMemo<SelectOption[]>(() => {
    const selectedSet = new Set(rows.map((r) => r.methodId));
    return allMethods
      .filter((m) => !selectedSet.has(m.methodId))
      .map((m) => ({ value: m.methodId, label: `${m.name}` }));
  }, [allMethods, rows]);

  useEffect(() => {
    if (selectedId && !availableOptions.some((o) => o.value === selectedId)) {
      setSelectedId("");
    }
  }, [availableOptions, selectedId]);

  const addMethod = async () => {
    if (!companyId || !selectedId || adding) return;
    clearFlash();
    setAdding(true);
    try {
      await createCompanyMethod({ companyId, methodId: selectedId, number:number });
      showFlash(successResponse("Metodo agregado"));
      setSelectedId("");
      setNumber("");
      await loadCompanyMethods({ silent: true });
    } catch {
      showFlash(errorResponse("No se pudo agregar el metodo"));
    } finally {
      setAdding(false);
    }
  };

  const removeMethod = async (methodId?: string | null) => {
    if (!companyId || !methodId) return;
    clearFlash();
    try {
      await deleteCompanyMethod(companyId, methodId);
      showFlash(successResponse("Metodo eliminado"));
      await loadCompanyMethods({ silent: true });
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
                <label className="text-xs">
                  Metodo
                  <FilterableSelect
                    value={selectedId}
                    onChange={setSelectedId}
                    options={availableOptions}
                    placeholder="Seleccionar metodo"
                    searchPlaceholder="Buscar metodo..."
                    className="h-10"
                    textSize="text-xs mt-2"
                  />
                </label>
              </div>
              <div className="flex-1">
                <label className="text-xs">
                  Número
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 
                    text-xs outline-none focus:ring-2"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </label>
              </div>
              <PrimaryButton type="submit" disabled={!selectedId || adding}
              onClick={addMethod}
              className="mt-5"
              >
                <Plus className="h-4 w-4" />
                {adding ? "Añadiendo..." : "Añadir"}
              </PrimaryButton>
            </div>
          </div>

          <div className="max-h-100 overflow-auto min-h-70">
            <table className="w-full text-sm ">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="py-2 px-5 text-left">Metodo</th>
                  <th className="py-2 px-5 text-left">Número</th>
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
                        className="inline-flex h-6 w-6 items-center justify-center
                         rounded-xl bg-red-500 text-lime-50 font-semibold hover:bg-red-400"
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
