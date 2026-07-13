import { Check, Eye, FileUp, Menu, ReceiptText, Trash2, X } from "lucide-react";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import {
  canShowPaymentApprovalActions,
  canShowPaymentDeleteAction,
} from "../paymentView";
import type { PaymentRecord } from "../types/payment.types";

type Props = {
  payment: PaymentRecord;
  canApprovePayment: boolean;
  canRejectPayment: boolean;
  canDeletePayment: boolean;
  canViewEvidence: boolean;
  canAttachEvidence: boolean;
  busy?: boolean;
  onApprove: (payment: PaymentRecord) => void;
  onReject: (payment: PaymentRecord) => void;
  onDelete: (payment: PaymentRecord) => void;
  onViewDetail: (payment: PaymentRecord) => void;
  onViewEvidence: (payment: PaymentRecord) => void;
  onAttachEvidence: (payment: PaymentRecord) => void;
};

export function PaymentActionsMenu({
  payment,
  canApprovePayment,
  canRejectPayment,
  canDeletePayment,
  canViewEvidence,
  canAttachEvidence,
  busy = false,
  onApprove,
  onReject,
  onDelete,
  onViewDetail,
  onViewEvidence,
  onAttachEvidence,
}: Props) {
  const canReview = canShowPaymentApprovalActions(
    payment.status,
    canApprovePayment || canRejectPayment,
  );
  const hasPaymentId = Boolean(payment.payDocId);

  return (
    <ActionsPopover
      actions={[
        {
          id: "detail",
          label: "Ver detalle",
          icon: <Eye className="h-4 w-4 text-black/60" />,
          disabled: !hasPaymentId,
          onClick: () => onViewDetail(payment),
        },
        {
          id: "approve",
          label: "Aprobar",
          icon: <Check className="h-4 w-4 text-emerald-600" />,
          hidden: !canReview || !canApprovePayment,
          disabled: !hasPaymentId || busy,
          onClick: () => onApprove(payment),
        },
        {
          id: "reject",
          label: "Rechazar",
          icon: <X className="h-4 w-4 text-rose-600" />,
          danger: true,
          hidden: !canReview || !canRejectPayment,
          disabled: !hasPaymentId || busy,
          onClick: () => onReject(payment),
        },
        {
          id: "view-evidence",
          label: "Ver evidencia",
          icon: <ReceiptText className="h-4 w-4 text-black/60" />,
          hidden: !canViewEvidence,
          disabled: !payment.paymentEvidenceFileId,
          onClick: () => onViewEvidence(payment),
        },
        {
          id: "attach-evidence",
          label: "Subir evidencia",
          icon: <FileUp className="h-4 w-4 text-black/60" />,
          hidden: !canAttachEvidence,
          disabled: !hasPaymentId,
          onClick: () => onAttachEvidence(payment),
        },
        {
          id: "delete",
          label: "Eliminar",
          icon: <Trash2 className="h-4 w-4 text-rose-600" />,
          danger: true,
          hidden: !canShowPaymentDeleteAction(canDeletePayment),
          disabled: !hasPaymentId || busy,
          onClick: () => onDelete(payment),
        },
      ]}
      columns={1}
      compact
      showLabels
      triggerIcon={<Menu className="h-4 w-4" />}
      popoverClassName="min-w-36"
      popoverBodyClassName="p-2"
      itemClassName="justify-start px-2 py-2"
    />
  );
}
