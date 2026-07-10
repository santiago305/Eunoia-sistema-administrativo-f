import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  cancelRecurringPurchase,
  createRecurringPurchase,
  generateCurrentRecurringPayable,
  listRecurringPurchases,
  pauseRecurringPurchase,
  resumeRecurringPurchase,
} from "@/shared/services/recurringPurchaseService";
import { RecurringPurchaseFormModal } from "../components/recurrent/RecurringPurchaseFormModal";
import { RecurringPurchaseTable } from "../components/recurrent/RecurringPurchaseTable";
import type {
  CreateRecurringPurchasePayload,
  ListRecurringPurchasesResponse,
  RecurringPurchase,
  RecurringStatus,
} from "../types/recurring-purchase.types";

const DEFAULT_LIMIT = 20;

const statusOptions = [
  { value: "ALL", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activas" },
  { value: "PAUSED", label: "Pausadas" },
  { value: "CANCELLED", label: "Canceladas" },
];

export default function RecurringPurchasesPage() {
  const { showFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState<RecurringStatus | "">("");
  const [items, setItems] = useState<RecurringPurchase[]>([]);
  const [pagination, setPagination] = useState<Pick<ListRecurringPurchasesResponse, "total" | "page" | "limit">>({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const loadRecurring = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRecurringPurchases({
        status: status || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination({
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? DEFAULT_LIMIT,
      });
    } catch {
      setItems([]);
      showFeedback(errorResponse("No se pudo cargar compras recurrentes."));
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, showFeedback, status]);

  useEffect(() => {
    void loadRecurring();
  }, [loadRecurring]);

  const createTemplate = async (payload: CreateRecurringPurchasePayload) => {
    try {
      await createRecurringPurchase(payload);
      showFeedback(successResponse("Compra recurrente creada."));
      await loadRecurring();
    } catch {
      showFeedback(errorResponse("No se pudo crear la compra recurrente."));
    }
  };

  const runAction = async (
    item: RecurringPurchase,
    action: (id: string) => Promise<unknown>,
    successMessage: string,
    errorMessage: string,
  ) => {
    try {
      await action(item.recurringPurchaseTemplateId);
      showFeedback(successResponse(successMessage));
      await loadRecurring();
    } catch {
      showFeedback(errorResponse(errorMessage));
    }
  };

  const generatePayable = async (item: RecurringPurchase) => {
    try {
      const result = await generateCurrentRecurringPayable(item.recurringPurchaseTemplateId);
      showFeedback(
        successResponse(
          result.generated
            ? "Cuenta por pagar generada."
            : "La cuenta del periodo ya fue generada o aun no vence.",
        ),
      );
      await loadRecurring();
    } catch {
      showFeedback(errorResponse("No se pudo generar la cuenta por pagar."));
    }
  };

  return (
    <PageShell>
      <PageTitle title="Compras recurrentes" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-black">Compras recurrentes</h1>
            <p className="mt-1 text-sm text-black/60">
              Membresias, servicios y suscripciones que generan cuentas por pagar por periodo.
            </p>
          </div>
          {can("recurring_purchases.create") ? (
            <SystemButton onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva recurrente
            </SystemButton>
          ) : null}
        </div>

        <PageActionsRow>
          <div className="w-full sm:w-52">
            <FloatingSelect
              label="Estado"
              name="recurring-purchase-status"
              value={status || "ALL"}
              options={statusOptions}
              onChange={(value) => {
                setStatus(value === "ALL" ? "" : (value as RecurringStatus));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </div>
          <SystemButton variant="outline" onClick={() => void loadRecurring()}>
            Actualizar
          </SystemButton>
        </PageActionsRow>

        <RecurringPurchaseTable
          items={items}
          loading={loading}
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPause={(item) =>
            void runAction(item, pauseRecurringPurchase, "Recurrencia pausada.", "No se pudo pausar.")
          }
          onResume={(item) =>
            void runAction(item, resumeRecurringPurchase, "Recurrencia reanudada.", "No se pudo reanudar.")
          }
          onCancel={(item) =>
            void runAction(item, cancelRecurringPurchase, "Recurrencia cancelada.", "No se pudo cancelar.")
          }
          onGenerate={(item) => void generatePayable(item)}
          permissions={{
            canPause: can("recurring_purchases.pause"),
            canCancel: can("recurring_purchases.cancel"),
            canGenerate: can("recurring_purchases.pay"),
          }}
        />
      </div>

      <RecurringPurchaseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createTemplate}
      />
    </PageShell>
  );
}
