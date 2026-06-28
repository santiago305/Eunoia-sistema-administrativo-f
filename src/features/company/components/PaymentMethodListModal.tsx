import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { PaymentMethodFormModal } from "@/features/payment-methods/components/PaymentMethodFormModal";
import { PaymentMethodSelectComposed } from "@/features/payment-methods/components/PaymentMethodSelectComposed";
import type { PaymentMethod, PaymentMethodPivot } from "@/features/payment-methods/types/paymentMethod";
import type { PaymentMethodSelectOption } from "@/features/payment-methods/types/paymentMethodSelect";
import {
  createCompanyMethod,
  deleteCompanyMethod,
  getAllPaymentMethods,
  getPaymentMethodsByCompany,
} from "@/shared/services/paymentMethodService";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";

type PaymentMethodListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  companyId: string;
};

const PRIMARY = "hsl(var(--primary))";
const defaultRequiresVoucher = (methodName?: string | null) =>
  (methodName ?? "").trim().toUpperCase() !== "EFECTIVO";

export function PaymentMethodListModal({
  title,
  close,
  className,
  companyId,
}: PaymentMethodListModalProps) {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const [rows, setRows] = useState<PaymentMethodPivot[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [number, setNumber] = useState("");
  const [requiresVoucher, setRequiresVoucher] = useState(true);
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);

  const loadCompanyMethods = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!companyId) return;
      if (!options?.silent) clearFeedback();
      setLoading(true);

      try {
        const data: PaymentMethodPivot[] = await getPaymentMethodsByCompany(companyId);
        setRows(data ?? []);
      } catch {
        setRows([]);
        if (!options?.silent) {
          showFeedback(errorResponse("No se pudieron cargar los métodos de pago."));
        }
      } finally {
        setLoading(false);
      }
    },
    [clearFeedback, companyId, showFeedback],
  );

  const loadAllMethods = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) clearFeedback();

      try {
        const records = await getAllPaymentMethods();
        setAllMethods(records ?? []);
      } catch {
        setAllMethods([]);
        if (!options?.silent) {
          showFeedback(errorResponse("No se pudieron cargar los métodos de pago disponibles."));
        }
      }
    },
    [clearFeedback, showFeedback],
  );

  useEffect(() => {
    void loadCompanyMethods();
    void loadAllMethods({ silent: true });
  }, [loadAllMethods, loadCompanyMethods]);

  const availableOptions = useMemo<PaymentMethodSelectOption[]>(() => {
    const selectedSet = new Set(rows.map((row) => row.methodId));

    return allMethods
      .filter((method) => !selectedSet.has(method.methodId))
      .map((method) => ({
        value: method.methodId,
        label: method.name,
      }));
  }, [allMethods, rows]);

  useEffect(() => {
    if (selectedId && !availableOptions.some((option) => option.value === selectedId)) {
      setSelectedId("");
    }
  }, [availableOptions, selectedId]);

  useEffect(() => {
    const methodName = allMethods.find((method) => method.methodId === selectedId)?.name;
    setRequiresVoucher(defaultRequiresVoucher(methodName));
  }, [allMethods, selectedId]);

  const addMethod = useCallback(async () => {
    if (!companyId || !selectedId || adding) return;

    clearFeedback();
    setAdding(true);

    try {
      await createCompanyMethod({
        companyId,
        methodId: selectedId,
        number,
        requiresVoucher,
      });

      showFeedback(successResponse("Método agregado"));
      setSelectedId("");
      setNumber("");
      setRequiresVoucher(true);
      await loadCompanyMethods({ silent: true });
    } catch {
      showFeedback(errorResponse("No se pudo agregar el método"));
    } finally {
      setAdding(false);
    }
  }, [adding, clearFeedback, companyId, loadCompanyMethods, number, requiresVoucher, selectedId, showFeedback]);

  const removeMethod = useCallback(
    async (companyMethodId?: string | null) => {
      if (!companyMethodId) return;

      clearFeedback();
      try {
        await deleteCompanyMethod(companyMethodId);
        showFeedback(successResponse("Método eliminado"));
        await loadCompanyMethods({ silent: true });
      } catch {
        showFeedback(errorResponse("No se pudo eliminar el método"));
      }
    },
    [clearFeedback, loadCompanyMethods, showFeedback],
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
        id: "requiresVoucher",
        header: "Voucher",
        cell: (row) => row.requiresVoucher ? (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Obligatorio</span>
        ) : <span className="text-black/45">No</span>,
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
              onClick={() => removeMethod(row.companyMethodId)}
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
        <div className="mb-3 flex flex-col gap-3 text-xs text-black/60">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)_auto_auto] lg:items-end">
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

            <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-black/70">
              <input
                type="checkbox"
                checked={requiresVoucher}
                onChange={(event) => setRequiresVoucher(event.target.checked)}
                className="h-4 w-4 accent-primary"
                disabled={adding}
              />
              Voucher obligatorio
            </label>

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
          rowKey="companyMethodId"
          loading={loading}
          emptyMessage="No hay métodos asignados."
          hoverable={false}
          animated={false}
          responsiveMode="table"
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
