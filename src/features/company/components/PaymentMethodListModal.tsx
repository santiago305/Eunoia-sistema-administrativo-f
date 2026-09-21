import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { CreditCard, Plus, ReceiptText, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { PaymentMethodFormModal } from "@/features/payment-methods/components/PaymentMethodFormModal";
import { PaymentMethodSelectComposed } from "@/features/payment-methods/components/PaymentMethodSelectComposed";
import type {
  PaymentMethod,
  PaymentMethodPivot,
} from "@/features/payment-methods/types/paymentMethod";
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
import { AlertModal } from "@/shared/components/components/AlertModal";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { usePermissions } from "@/shared/hooks/usePermissions";

type PaymentMethodListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  companyId: string;
};

const PRIMARY = "hsl(var(--primary))";

const defaultRequiresVoucher = (method: PaymentMethod | undefined) => {
  const value = (method?.code ?? method?.name ?? "").trim().toUpperCase();
  return value !== "CASH" && value !== "EFECTIVO";
};

export function PaymentMethodListModal({
  title,
  close,
  className,
  companyId,
}: PaymentMethodListModalProps) {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canReadPaymentMethods = can("payment-methods.read");
  const canManagePaymentMethods = can("payment-methods.manage");
  const [rows, setRows] = useState<PaymentMethodPivot[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [requiresVoucher, setRequiresVoucher] = useState(true);
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [pendingRemoveMethod, setPendingRemoveMethod] =
    useState<PaymentMethodPivot | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadCompanyMethods = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!companyId || !canReadPaymentMethods) return;
      if (!options?.silent) clearFeedback();
      setLoading(true);
      try {
        setRows((await getPaymentMethodsByCompany(companyId)) ?? []);
      } catch {
        setRows([]);
        if (!options?.silent) {
          showFeedback(
            errorResponse("No se pudieron cargar los métodos de pago."),
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [canReadPaymentMethods, clearFeedback, companyId, showFeedback],
  );

  const loadAllMethods = useCallback(async () => {
    if (!canReadPaymentMethods) return;
    try {
      setAllMethods((await getAllPaymentMethods()) ?? []);
    } catch {
      setAllMethods([]);
      showFeedback(
        errorResponse("No se pudieron cargar los métodos disponibles."),
      );
    }
  }, [canReadPaymentMethods, showFeedback]);

  useEffect(() => {
    void loadCompanyMethods();
    void loadAllMethods();
  }, [loadAllMethods, loadCompanyMethods]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      ),
    [rows],
  );

  const availableOptions = useMemo<PaymentMethodSelectOption[]>(() => {
    const selectedSet = new Set(rows.map((row) => row.methodId));

    return allMethods
      .filter(
        (method) => method.isActive && !selectedSet.has(method.methodId),
      )
      .map((method) => ({ value: method.methodId, label: method.name }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, "es", { sensitivity: "base" }),
      );
  }, [allMethods, rows]);

  useEffect(() => {
    if (
      selectedId &&
      !availableOptions.some((option) => option.value === selectedId)
    ) {
      setSelectedId("");
    }

    setRequiresVoucher(
      defaultRequiresVoucher(
        allMethods.find((method) => method.methodId === selectedId),
      ),
    );
  }, [allMethods, availableOptions, selectedId]);

  const addMethod = useCallback(async () => {
    if (!companyId || !selectedId || adding || !canManagePaymentMethods) return;

    clearFeedback();
    setAdding(true);
    try {
      await createCompanyMethod({
        companyId,
        methodId: selectedId,
        requiresVoucher,
        enabled: true,
      });
      showFeedback(successResponse("Método agregado."));
      setSelectedId("");
      setRequiresVoucher(true);
      await loadCompanyMethods({ silent: true });
    } catch {
      showFeedback(errorResponse("No se pudo agregar el método."));
    } finally {
      setAdding(false);
    }
  }, [
    adding,
    canManagePaymentMethods,
    clearFeedback,
    companyId,
    loadCompanyMethods,
    requiresVoucher,
    selectedId,
    showFeedback,
  ]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void addMethod();
  };

  const removeMethod = useCallback(
    async (companyMethodId?: string | null) => {
      if (!companyMethodId || !canManagePaymentMethods || removing) return;

      setRemoving(true);
      try {
        await deleteCompanyMethod(companyMethodId);
        showFeedback(successResponse("Método desvinculado."));
        await loadCompanyMethods({ silent: true });
        setPendingRemoveMethod(null);
      } catch {
        showFeedback(errorResponse("No se pudo desvincular el método."));
      } finally {
        setRemoving(false);
      }
    },
    [canManagePaymentMethods, loadCompanyMethods, removing, showFeedback],
  );

  const columns = useMemo<DataTableColumn<PaymentMethodPivot>[]>(
    () => [
      {
        id: "method",
        header: "Método de pago",
        accessorKey: "name",
        hideable: false,
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3 py-0.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {row.name}
            </span>
          </div>
        ),
      },
      {
        id: "requiresVoucher",
        header: "Comprobante",
        sortAccessor: "requiresVoucher",
        cell: (row) =>
          row.requiresVoucher ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
              Obligatorio
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Opcional
            </span>
          ),
      },
      ...(canManagePaymentMethods
        ? [
            {
              id: "actions",
              header: "",
              cell: (row: PaymentMethodPivot) => (
                <div className="flex justify-end">
                  <SystemButton
                    variant="ghost"
                    size="custom"
                    className="h-9 w-9 rounded-lg p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setPendingRemoveMethod(row)}
                    aria-label={`Desvincular ${row.name}`}
                    title="Desvincular método"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </SystemButton>
                </div>
              ),
              className: "w-14 text-right",
              headerClassName: "w-14 text-right",
              hideable: false,
              sortable: false,
            } satisfies DataTableColumn<PaymentMethodPivot>,
          ]
        : []),
    ],
    [canManagePaymentMethods],
  );

  return (
    <Modal
      onClose={close}
      title={title}
      className={["w-full max-w-3xl", className].filter(Boolean).join(" ")}
    >
      <div className="space-y-5">
        <section
          aria-labelledby="add-payment-method-title"
          className="rounded-xl border border-border bg-muted/20 p-4"
        >
          <div className="mb-4">
            <h3
              id="add-payment-method-title"
              className="text-sm font-semibold text-foreground"
            >
              Agregar método
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Selecciona un método disponible y define si requiere comprobante.
            </p>
          </div>

          <form
            data-testid="company-payment-method-form"
            className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_auto] lg:items-start"
            onSubmit={handleSubmit}
          >
            <PaymentMethodSelectComposed
              label="Método de pago"
              value={selectedId}
              onChange={setSelectedId}
              options={availableOptions}
              onCreate={
                canManagePaymentMethods
                  ? () => setOpenCreateMethod(true)
                  : undefined
              }
              onEdit={
                canManagePaymentMethods
                  ? (methodId) => setEditingMethodId(methodId)
                  : undefined
              }
              disabled={adding || !canManagePaymentMethods}
              emptyLabel="No hay métodos disponibles"
            />

            <label
              htmlFor="company-method-requires-voucher"
              className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/30 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              <Checkbox
                id="company-method-requires-voucher"
                checked={requiresVoucher}
                onCheckedChange={(checked) =>
                  setRequiresVoucher(checked === true)
                }
                disabled={adding || !canManagePaymentMethods}
                aria-label="Comprobante obligatorio"
              />
              <span className="leading-5">Comprobante obligatorio</span>
            </label>

            <SystemButton
              type="submit"
              className="h-10 w-full lg:w-auto"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              disabled={!selectedId || adding || !canManagePaymentMethods}
              loading={adding}
            >
              Agregar
            </SystemButton>
          </form>
        </section>

        <section aria-labelledby="configured-payment-methods-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3
                id="configured-payment-methods-title"
                className="text-sm font-semibold text-foreground"
              >
                Métodos configurados
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Métodos disponibles para registrar cobros y pagos de la empresa.
              </p>
            </div>
            <span
              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground"
              aria-live="polite"
            >
              {sortedRows.length} {sortedRows.length === 1 ? "método" : "métodos"}
            </span>
          </div>

          <DataTable
            tableId="company-methods-table"
            data={sortedRows}
            columns={columns}
            rowKey="companyMethodId"
            loading={loading}
            emptyMessage="Aún no hay métodos de pago configurados para esta empresa."
            hoverable={false}
            animated={false}
            responsiveMode="auto"
            stickyHeader={false}
            maxHeight="360px"
            tableClassName="text-sm"
          />
        </section>
      </div>

      <PaymentMethodFormModal
        open={
          canManagePaymentMethods &&
          (openCreateMethod || Boolean(editingMethodId))
        }
        mode={editingMethodId ? "edit" : "create"}
        paymentMethodId={editingMethodId}
        onClose={() => {
          setOpenCreateMethod(false);
          setEditingMethodId(null);
        }}
        onSaved={() => {
          void loadAllMethods();
          void loadCompanyMethods({ silent: true });
        }}
        primaryColor={PRIMARY}
        entityLabel="método de pago"
      />

      <AlertModal
        open={Boolean(pendingRemoveMethod)}
        type="warning"
        title="Desvincular método de pago"
        message={
          pendingRemoveMethod
            ? `Estás por desvincular ${pendingRemoveMethod.name} de esta empresa.`
            : ""
        }
        confirmText="Desvincular"
        loading={removing}
        onClose={() => {
          if (!removing) setPendingRemoveMethod(null);
        }}
        onConfirm={() => {
          void removeMethod(pendingRemoveMethod?.companyMethodId);
        }}
      />
    </Modal>
  );
}
