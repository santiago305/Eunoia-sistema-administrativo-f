import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import { Modal } from "@/components/settings/modal";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { listQuotas } from "@/services/purchaseService";
import type { CreditQuota } from "@/pages/purchases/types/purchase";
import type { CurrencyType } from "@/pages/purchases/types/purchaseEnums";
import { CurrencyTypes } from "@/pages/purchases/types/purchaseEnums";
import { money } from "@/utils/functionPurchases";
import { PaymentModal } from "./PaymentModal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";

const PRIMARY = "hsl(var(--primary))";

export type QuotaListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  poId: string;
  quotas?: CreditQuota[];
  currency?: CurrencyType;
  loadPurchases: () => void;
};

type SelectedTotals = {
  totalPaid: number;
  totalToPay: number;
};

type QuotaRow = CreditQuota & {
  id: string;
  paid: number;
  pending: number;
  isFullyPaid: boolean;
};

export function QuotaListModal({
  title,
  close,
  className,
  poId,
  quotas,
  currency = CurrencyTypes.PEN,
  loadPurchases,
}: QuotaListModalProps) {
  const [rows, setRows] = useState<CreditQuota[]>(quotas ?? []);
  const [loading, setLoading] = useState(false);
  const [modalPayment, setModalPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qtaId, setQtaId] = useState("");
  const [selectedTotals, setSelectedTotals] = useState<SelectedTotals>({
    totalPaid: 0,
    totalToPay: 0,
  });
  const { showFlash, clearFlash } = useFlashMessage();

  const loadQuotas = async () => {
    if (!poId) return;
    setLoading(true);
    clearFlash();
    setError(null);
    try {
      const data = await listQuotas(poId);
      setRows(data ?? []);
    } catch {
      setRows([]);
      showFlash(errorResponse("No se pudieron cargar las cuotas."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadQuotas();
  }, [poId, quotas, clearFlash, showFlash]);

  useEffect(() => {
    if (quotas) setRows(quotas);
  }, [quotas]);

  const openPaymentModal = useCallback((quota: CreditQuota) => {
    const paid = quota.totalPaid ?? 0;
    const pending = (quota.totalToPay ?? 0) - paid;
    setSelectedTotals({
      totalPaid: paid,
      totalToPay: pending,
    });
    setModalPayment(true);
  }, []);

  const quotaRows = useMemo<QuotaRow[]>(
    () =>
      rows.map((q, index) => {
        const paid = q.totalPaid ?? 0;
        const pending = (q.totalToPay ?? 0) - paid;

        return {
          ...q,
          id: q.quotaId ?? `${q.number}-${q.expirationDate ?? index}`,
          paid,
          pending,
          isFullyPaid: pending <= 0,
        };
      }),
    [rows],
  );

  const columns = useMemo<DataTableColumn<QuotaRow>[]>(
    () => [
      {
        id: "number",
        header: "Cuota",
        accessorKey: "number",
        hideable: false,
      },
      {
        id: "expirationDate",
        header: "Vence",
        cell: (row) =>
          row.expirationDate ? new Date(row.expirationDate).toLocaleDateString() : "-",
        hideable: false,
      },
      {
        id: "paymentDate",
        header: "Pago",
        cell: (row) =>
          row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : "-",
      },
      {
        id: "total",
        header: "Total",
        cell: (row) => money(row.totalToPay ?? 0, currency),
        hideable: false,
      },
      {
        id: "paid",
        header: "Pagado",
        cell: (row) => money(row.paid, currency),
        hideable: false,
      },
      {
        id: "pending",
        header: "Pendiente",
        cell: (row) => money(row.pending, currency),
        hideable: false,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: (row) => (
          <div className="flex justify-end">
            {!row.isFullyPaid && (
              <SystemButton
                size="sm"
                leftIcon={<Banknote className="h-4 w-4" />}
                style={{
                  backgroundColor: PRIMARY,
                  borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                }}
                onClick={() => {
                  openPaymentModal(row);
                  setQtaId(row.quotaId ?? "");
                }}
                title="Agregar pago"
              >
                Agregar
              </SystemButton>
            )}
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [currency, openPaymentModal],
  );

  return (
    <Modal onClose={close} title={title} className={className}>
      <div className="space-y-4">
        <div className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeaderForm icon={Banknote} title="Listado de cuotas" />
            <div className="text-xs text-black/60">
              {loading ? "Cargando..." : `${rows.length} registros`}
            </div>
          </div>

          <DataTable
            tableId={`purchase-quotas-table-${poId}`}
            data={quotaRows}
            columns={columns}
            rowKey="id"
            loading={loading}
            emptyMessage="No hay cuotas registradas."
            hoverable={false}
            animated={false}
          />

          {error && <div className="px-4 py-2 text-sm text-rose-600">{error}</div>}
        </div>
      </div>
      {modalPayment && (
        <PaymentModal
          title="Formulario de Pago"
          close={() => {
            setModalPayment(false);
          }}
          className="max-w-[800px]"
          totalPaid={selectedTotals.totalPaid}
          totalToPay={selectedTotals.totalToPay}
          poId={poId}
          quotaId={qtaId}
          loadQuotas={loadQuotas}
          loadPurchases={loadPurchases}
        />
      )}
    </Modal>
  );
}


