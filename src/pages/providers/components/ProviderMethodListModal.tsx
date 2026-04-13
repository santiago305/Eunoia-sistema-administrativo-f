import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modales/Modal";
import { PaymentMethodSelectComposed } from "@/pages/payment-methods/components/PaymentMethodSelectComposed";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { Plus, Trash2 } from "lucide-react";
import { PaymentMethodFormModal } from "@/pages/payment-methods/components/PaymentMethodFormModal";
import {
  createSupplierMethod,
  deleteSupplierMethod,
  getAllPaymentMethods,
  getPaymentMethodsBySupplier,
} from "@/services/paymentMethodService";
import type { PaymentMethod, PaymentMethodPivot } from "@/pages/payment-methods/types/paymentMethod";
import { FloatingInput } from "@/components/FloatingInput";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";

type ProviderMethodListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  supplierId: string;
};

type SelectOption = { value: string; label: string };
const PRIMARY = "hsl(var(--primary))";

export function ProviderMethodListModal({
  title,
  close,
  className,
  supplierId,
}: ProviderMethodListModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();
  const [rows, setRows] = useState<PaymentMethodPivot[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [number, setNumber] = useState("");
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);

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
        showFlash(errorResponse("No se pudieron cargar los métodos de pago disponibles."));
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
      .map((m) => ({ value: m.methodId, label: `${m.name}` }));
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
      await createSupplierMethod({ supplierId, methodId: selectedId, number });
      showFlash(successResponse("Método agregado"));
      setSelectedId("");
      setNumber("");
      await loadSupplierMethods({ silent: true });
    } catch {
      showFlash(errorResponse("No se pudo agregar el método"));
    } finally {
      setAdding(false);
    }
  };

  const removeMethod = async (methodId?: string | null) => {
    if (!supplierId || !methodId) return;
    clearFlash();
    try {
      await deleteSupplierMethod(supplierId, methodId);
      showFlash(successResponse("Método eliminado"));
      await loadSupplierMethods({ silent: true });
    } catch {
      showFlash(errorResponse("No se pudo eliminar el método"));
    }
  };

  const columns = useMemo<DataTableColumn<PaymentMethodPivot>[]>(
    () => [
      {
        id: "method",
        header: "Método",
        accessorKey: "name",
        className: "text-black/70",
      },
      {
        id: "number",
        header: "Número",
        cell: (row) => <span className="text-black/70">{row.number ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="danger"
              size="custom"
              className="h-7 w-7 rounded-lg p-0"
              onClick={() => removeMethod(row.methodId)}
              title="Eliminar método"
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [removeMethod]
  );

  return (
    <Modal open={true} onClose={close} title={title} className={className}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-black/60">
            {loading ? "Cargando..." : `${rows.length} métodos`}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 overflow-hidden">
          <div className="flex flex-col gap-3 px-5 py-4 border-b border-black/10 text-xs text-black/60">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-2">
                <PaymentMethodSelectComposed
                  label="Método de pago"
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
              </div>
              <div className="flex-1 ml-3">
                <FloatingInput
                  label="Número"
                  name="supplier-payment-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
              <SystemButton
                size="sm"
                className="mb-1"
                leftIcon={<Plus className="h-4 w-4" />}
                disabled={!selectedId || adding}
                onClick={addMethod}
                style={{ backgroundColor: PRIMARY, borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}
              >
                {adding ? "Añadiendo..." : ""}
              </SystemButton>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <DataTable
              tableId="supplier-methods-table"
              data={rows}
              columns={columns}
              rowKey="methodId"
              loading={loading}
              emptyMessage="No hay métodos asignados."
              hoverable={false}
              animated={false}
            />
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
          void loadSupplierMethods({ silent: true });
        }}
        primaryColor={PRIMARY}
        entityLabel="método de pago"
      />
    </Modal>
  );
}
