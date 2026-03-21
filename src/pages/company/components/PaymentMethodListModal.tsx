import { useEffect, useMemo, useState } from "react";
import { Plus, Power } from "lucide-react";
import { Modal } from "@/components/settings/modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { PaymentMethodFormModal } from "@/pages/payment-methods/components/PaymentMethodFormModal";
import { PaymentMethodSelectComposed } from "@/pages/payment-methods/components/PaymentMethodSelectComposed";
import type {
  PaymentMethod,
  PaymentMethodPivot,
} from "@/pages/payment-methods/types/paymentMethod";
import type { PaymentMethodSelectOption } from "@/pages/payment-methods/types/paymentMethodSelect";
import {
  createCompanyMethod,
  deleteCompanyMethod,
  getAllPaymentMethods,
  getPaymentMethodsByCompany,
} from "@/services/paymentMethodService";

type PaymentMethodListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  companyId: string;
};

const PRIMARY = "hsl(var(--primary))";

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
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);

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
        showFlash(errorResponse("No se pudieron cargar los métodos de pago."));
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
        showFlash(
          errorResponse("No se pudieron cargar los métodos de pago disponibles."),
        );
      }
    }
  };

  useEffect(() => {
    void loadCompanyMethods();
    void loadAllMethods({ silent: true });
  }, [companyId]);

  const availableOptions = useMemo<PaymentMethodSelectOption[]>(() => {
    const selectedSet = new Set(rows.map((row) => row.methodId));

    return allMethods
      .filter((method) => !selectedSet.has(method.methodId))
      .map((method) => ({ value: method.methodId, label: method.name }));
  }, [allMethods, rows]);

  useEffect(() => {
    if (selectedId && !availableOptions.some((option) => option.value === selectedId)) {
      setSelectedId("");
    }
  }, [availableOptions, selectedId]);

  const addMethod = async () => {
    if (!companyId || !selectedId || adding) return;

    clearFlash();
    setAdding(true);

    try {
      await createCompanyMethod({ companyId, methodId: selectedId, number });
      showFlash(successResponse("Método agregado"));
      setSelectedId("");
      setNumber("");
      await loadCompanyMethods({ silent: true });
    } catch {
      showFlash(errorResponse("No se pudo agregar el método"));
    } finally {
      setAdding(false);
    }
  };

  const removeMethod = async (methodId?: string | null) => {
    if (!companyId || !methodId) return;

    clearFlash();
    try {
      await deleteCompanyMethod(companyId, methodId);
      showFlash(successResponse("Método eliminado"));
      await loadCompanyMethods({ silent: true });
    } catch {
      showFlash(errorResponse("No se pudo eliminar el método"));
    }
  };

  return (
    <Modal onClose={close} title={title} className={className}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-black/60">
            {loading ? "Cargando..." : `${rows.length} métodos`}
          </div>
        </div>

        <div className="overflow-auto rounded-2xl border border-black/10">
          <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-4 text-xs text-black/60">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="text-xs">
                  Método
                  <PaymentMethodSelectComposed
                    value={selectedId}
                    onChange={setSelectedId}
                    options={availableOptions}
                    onCreate={() => setOpenCreateMethod(true)}
                    onEdit={(methodId) => setEditingMethodId(methodId)}
                    className="h-10"
                    textSize="text-xs"
                    disabled={adding}
                    emptyLabel="Sin resultados"
                  />
                </label>
              </div>

              <div className="ml-3 flex-1">
                <label className="text-xs">
                  Número
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-xs outline-none focus:ring-2"
                    value={number}
                    onChange={(event) => setNumber(event.target.value)}
                    disabled={adding}
                  />
                </label>
              </div>

              <button
                type="button"
                className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs text-white focus:outline-none focus:ring-2"
                disabled={!selectedId || adding}
                onClick={addMethod}
                style={{
                  backgroundColor: PRIMARY,
                  borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                }}
              >
                <Plus className="h-4 w-4" />
                {adding ? "Añadiendo..." : "Añadir"}
              </button>
            </div>
          </div>

          <div className="max-h-80 min-h-30 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-black/10 text-xs text-black/60">
                  <th className="px-5 py-2 text-left">Método</th>
                  <th className="px-5 py-2 text-left">Número</th>
                  <th className="px-5 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((method) => (
                  <tr key={method.methodId} className="border-b border-black/5">
                    <td className="px-5 py-2 text-left">{method.name}</td>
                    <td className="px-5 py-2 text-left">{method.number ?? "-"}</td>
                    <td className="px-5 py-2 text-right">
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-red-500 font-semibold text-lime-50 hover:bg-red-400"
                        onClick={() => removeMethod(method.methodId)}
                        title="Eliminar método"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && rows.length === 0 && (
              <div className="px-4 py-4 text-sm text-black/60">
                No hay métodos asignados.
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentMethodFormModal
        open={openCreateMethod || Boolean(editingMethodId)}
        mode={editingMethodId ? "edit" : "create"}
        paymentMethodId={editingMethodId}
        onClose={() => {
          setOpenCreateMethod(false);
          setEditingMethodId(null);
        }}
        onSaved={() => {
          void loadAllMethods({ silent: true });
          void loadCompanyMethods({ silent: true });
        }}
        primaryColor={PRIMARY}
        entityLabel="método de pago"
      />
    </Modal>
  );
}
