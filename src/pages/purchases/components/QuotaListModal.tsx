import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote } from "lucide-react";
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
import { Modal } from "@/components/modales/Modal";

const PRIMARY = "hsl(var(--primary))";

export type QuotaListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  poId: string;
  quotas?: CreditQuota[];
  currency?: CurrencyType;
  loadPurchases: () => void;
  open: boolean;
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
  open,
}: QuotaListModalProps) {
  const [rows, setRows] = useState<CreditQuota[]>(quotas ?? []);
  const [loading, setLoading] = useState(false);
  const [modalPayment, setModalPayment] = useState(false);
  const [qtaId, setQtaId] = useState("");
  const [selectedTotals, setSelectedTotals] = useState<SelectedTotals>({
    totalPaid: 0,
    totalToPay: 0,
  });
  const { showFlash, clearFlash } = useFlashMessage();

  const loadQuotas = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    clearFlash();
    try {
      const data = await listQuotas(poId);
      setRows(data ?? []);
    } catch {
      setRows([]);
      showFlash(errorResponse("No se pudieron cargar las cuotas."));
    } finally {
      setLoading(false);
    }
  }, [clearFlash, poId, showFlash]);

  useEffect(() => {
    void loadQuotas();
  }, [loadQuotas, open]);

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
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
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
          <div className="flex justify-center">
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
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        hideable: false,
      },
    ],
    [currency, openPaymentModal],
  );

  return (
    <Modal open={open} onClose={close} title={title} className={className}>
      <div className="space-y-4">  
        <SectionHeaderForm icon={Banknote} title="Listado de cuotas" />

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

      </div>
      <PaymentModal
        title="Formulario de Pago"
        close={() => {
          setModalPayment(false);
        }}
        open={modalPayment}
        className="w-[800px]"
        totalPaid={selectedTotals.totalPaid}
        totalToPay={selectedTotals.totalToPay}
        poId={poId}
        quotaId={qtaId}
        loadQuotas={loadQuotas}
        loadPurchases={loadPurchases}
      />
    </Modal>
  );
}


