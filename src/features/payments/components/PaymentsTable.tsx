import { useMemo } from "react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { PaymentActionsMenu } from "./PaymentActionsMenu";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import type { PaymentRecord } from "../types/payment.types";
import {
  formatPaymentAmount,
  formatPaymentDate,
  getPaymentAccountLabel,
} from "../utils/paymentFormatters";

type Props = {
  payments: PaymentRecord[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  toolbarSearchContent: React.ReactNode;
  canApprovePayment: boolean;
  canRejectPayment: boolean;
  canDeletePayment: boolean;
  canViewEvidence: boolean;
  canAttachEvidence: boolean;
  busyPaymentId?: string | null;
  onPageChange: (page: number) => void;
  onApprove: (payment: PaymentRecord) => void;
  onReject: (payment: PaymentRecord) => void;
  onDelete: (payment: PaymentRecord) => void;
};

export function PaymentsTable({
  payments,
  loading,
  pagination,
  toolbarSearchContent,
  canApprovePayment,
  canRejectPayment,
  canDeletePayment,
  canViewEvidence,
  canAttachEvidence,
  busyPaymentId,
  onPageChange,
  onApprove,
  onReject,
  onDelete,
}: Props) {
  const columns = useMemo<DataTableColumn<PaymentRecord>[]>(
    () => [
      {
        id: "status",
        header: "Estado",
        cell: (row) => <PaymentStatusBadge status={row.status} />,
        hideable: false,
        cardTitle: true,
      },
      {
        id: "poId",
        header: "Compra",
        cell: (row) => <span className="text-xs text-black/70">{row.poId ?? "-"}</span>,
        copy: true,
      },
      {
        id: "accountPayableId",
        header: "Cta. por pagar",
        cell: (row) => <span className="text-xs text-black/70">{row.accountPayableId ?? "-"}</span>,
        visible: false,
        copy: true,
      },
      {
        id: "method",
        header: "Metodo",
        cell: (row) => <span className="text-black/80">{row.method || "-"}</span>,
      },
      {
        id: "companyPaymentAccount",
        header: "Cuenta",
        cell: (row) => <span className="text-black/70">{getPaymentAccountLabel(row)}</span>,
      },
      {
        id: "amount",
        header: "Monto",
        cell: (row) => <span className="font-medium text-black/80">{formatPaymentAmount(row.amount, row.currency)}</span>,
        sortAccessor: (row) => Number(row.amount ?? 0),
      },
      {
        id: "date",
        header: "Fecha doc.",
        cell: (row) => <span className="text-black/70">{formatPaymentDate(row.date)}</span>,
        sortAccessor: (row) => row.date ?? "",
      },
      {
        id: "scheduledAt",
        header: "Programado",
        cell: (row) => <span className="text-black/70">{formatPaymentDate(row.scheduledAt)}</span>,
        visible: false,
      },
      {
        id: "paidAt",
        header: "Pagado",
        cell: (row) => <span className="text-black/70">{formatPaymentDate(row.paidAt ?? row.approvedAt)}</span>,
      },
      {
        id: "requestedByUserId",
        header: "Solicitante",
        cell: (row) => <span className="text-xs text-black/70">{row.requestedByUserId ?? "-"}</span>,
        visible: false,
      },
      {
        id: "approvedByUserId",
        header: "Aprobador",
        cell: (row) => <span className="text-xs text-black/70">{row.approvedByUserId ?? "-"}</span>,
        visible: false,
      },
      {
        id: "evidence",
        header: "Evidencia",
        cell: (row) => (
          <span className="text-xs text-black/70">
            {row.paymentEvidenceFileId ? "Adjunta" : "Pendiente"}
          </span>
        ),
      },
      {
        id: "rejectionReason",
        header: "Motivo",
        cell: (row) => <span className="text-black/70">{row.rejectionReason ?? "-"}</span>,
        visible: false,
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        hideable: false,
        sortable: false,
        cell: (row) => (
          <PaymentActionsMenu
            payment={row}
            canApprovePayment={canApprovePayment}
            canRejectPayment={canRejectPayment}
            canDeletePayment={canDeletePayment}
            canViewEvidence={canViewEvidence}
            canAttachEvidence={canAttachEvidence}
            busy={busyPaymentId === row.payDocId}
            onApprove={onApprove}
            onReject={onReject}
            onDelete={onDelete}
          />
        ),
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        showInCards: false,
      },
    ],
    [
      busyPaymentId,
      canApprovePayment,
      canAttachEvidence,
      canDeletePayment,
      canRejectPayment,
      canViewEvidence,
      onApprove,
      onDelete,
      onReject,
    ],
  );

  return (
    <DataTable
      tableId="payments-table"
      data={payments}
      columns={columns}
      rowKey="payDocId"
      loading={loading}
      emptyMessage="No hay pagos para los filtros actuales."
      selectableColumns
      hoverable={false}
      animated={false}
      toolbarSearchContent={toolbarSearchContent}
      pagination={pagination}
      onPageChange={onPageChange}
      tableClassName="text-[10px]"
    />
  );
}
