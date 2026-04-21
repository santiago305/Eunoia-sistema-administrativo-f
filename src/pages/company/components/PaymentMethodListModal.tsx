import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/settings/modal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { PaymentMethodFormModal } from "@/pages/payment-methods/components/PaymentMethodFormModal";
import { PaymentMethodSelectComposed } from "@/pages/payment-methods/components/PaymentMethodSelectComposed";
import type { PaymentMethod, PaymentMethodPivot } from "@/pages/payment-methods/types/paymentMethod";
import type { PaymentMethodSelectOption } from "@/pages/payment-methods/types/paymentMethodSelect";
import {
  createCompanyMethod,
  deleteCompanyMethod,
  getAllPaymentMethods,
  getPaymentMethodsByCompany,
} from "@/services/paymentMethodService";
import { FloatingInput } from "@/components/FloatingInput";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";

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

  const loadCompanyMethods = useCallback(
    async (options?: { silent?: boolean }) => {
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
    },
    [clearFlash, companyId, showFlash],
  );

  const loadAllMethods = useCallback(
    async (options?: { silent?: boolean }) => {
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
    },
    [clearFlash, showFlash],
  );

  useEffect(() => {
    void loadCompanyMethods();
    void loadAllMethods({ silent: true });
  }, [loadAllMethods, loadCompanyMethods]);

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

  const addMethod = useCallback(async () => {
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
  }, [adding, clearFlash, companyId, loadCompanyMethods, number, selectedId, showFlash]);

  const removeMethod = useCallback(
    async (methodId?: string | null) => {
      if (!companyId || !methodId) return;

      clearFlash();
      try {
        await deleteCompanyMethod(companyId, methodId);
        showFlash(successResponse("Método eliminado"));
        await loadCompanyMethods({ silent: true });
      } catch {
        showFlash(errorResponse("No se pudo eliminar el método"));
      }
    },
    [clearFlash, companyId, loadCompanyMethods, showFlash],
  );

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
    [removeMethod],
  );

  const modalClassName = ["w-full max-w-3xl", className].filter(Boolean).join(" ");

  return (
    <Modal onClose={close} title={title} className={modalClassName}>
      <div className="space-y-3">
          <div className="flex flex-col gap-3 text-xs text-black/60 mb-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)_auto] lg:items-end">
              <div className="min-w-0">
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

              <div className="min-w-0">
                <FloatingInput
                  label="Número"
                  name="company-payment-number"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  disabled={adding}
                  className="h-10 text-xs"
                />
              </div>

              <SystemButton
                size="sm"
                className="h-10 lg:min-w-[120px]"
                leftIcon={<Plus className="h-4 w-4" />}
                disabled={!selectedId || adding}
                onClick={addMethod}
                style={{
                  backgroundColor: PRIMARY,
                  borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                }}
              >
                {adding ? "Añadiendo..." : "Añadir"}
              </SystemButton>
            </div>
          </div>

          <DataTable
            tableId="company-methods-table"
            data={rows}
            columns={columns}
            rowKey="methodId"
            loading={loading}
            emptyMessage="No hay métodos asignados."
            hoverable={false}
            animated={false}
          />
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
