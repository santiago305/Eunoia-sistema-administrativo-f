import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  listAccountPayables,
  markOverdueAccountPayables,
} from "@/shared/services/accountsPayableService";
import { AccountsPayableTable } from "../components/AccountsPayableTable";
import { RegisterPayablePaymentModal } from "../components/RegisterPayablePaymentModal";
import type {
  AccountPayable,
  AccountPayableStatus,
  ListAccountPayablesResponse,
} from "../types/payable.types";

const DEFAULT_LIMIT = 20;

export default function AccountsPayablePage() {
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();
  const [searchParams] = useSearchParams();
  const canManage = can("accounts-payable.manage");
  const canMarkOverdue = can("accounts-payable.mark_overdue");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AccountPayable[]>([]);
  const [status, setStatus] = useState<AccountPayableStatus | "">("");
  const [purchaseId, setPurchaseId] = useState(() => searchParams.get("purchaseId") ?? "");
  const [selected, setSelected] = useState<AccountPayable | null>(null);
  const [pagination, setPagination] = useState<Pick<ListAccountPayablesResponse, "total" | "page" | "limit">>({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const loadPayables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAccountPayables({
        page: pagination.page,
        limit: pagination.limit,
        status: status || undefined,
        purchaseId: purchaseId.trim() || undefined,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination({
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? DEFAULT_LIMIT,
      });
    } catch {
      setItems([]);
      showFeedback(errorResponse("No se pudo cargar cuentas por pagar."));
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, purchaseId, showFeedback, status]);

  useEffect(() => {
    void loadPayables();
  }, [loadPayables]);

  const handleMarkOverdue = async () => {
    if (!canMarkOverdue) return;
    try {
      const result = await markOverdueAccountPayables();
      showFeedback(successResponse(`Cuentas vencidas actualizadas: ${result.updated}`));
      await loadPayables();
    } catch {
      showFeedback(errorResponse("No se pudo marcar cuentas vencidas."));
    }
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={purchaseId}
            onChange={(event) => setPurchaseId(event.target.value)}
            placeholder="Filtrar por compra"
            className="h-9 rounded-lg border border-black/15 bg-white px-3 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AccountPayableStatus | "")}
            aria-label="Filtrar por estado"
            className="h-9 rounded-lg border border-black/15 bg-white px-3 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="PARTIAL">Parciales</option>
            <option value="OVERDUE">Vencidas</option>
            <option value="PAID">Pagadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          <SystemButton size="sm" onClick={() => void loadPayables()}>Buscar</SystemButton>
        </div>
        {canMarkOverdue ? (
          <SystemButton size="sm" variant="outline" onClick={() => void handleMarkOverdue()}>
            Marcar vencidas
          </SystemButton>
        ) : null}
      </div>

      <AccountsPayableTable
        items={items}
        loading={loading}
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        canManage={canManage}
        onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
        onRegisterPayment={setSelected}
      />

      <RegisterPayablePaymentModal
        open={Boolean(selected)}
        payable={selected}
        onClose={() => setSelected(null)}
        onSaved={() => void loadPayables()}
      />
    </PageShell>
  );
}

