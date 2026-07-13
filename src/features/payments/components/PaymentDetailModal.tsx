import { CalendarClock, ReceiptText } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { formatPaymentStatusLabel } from "../utils/paymentFormatters";
import type { PaymentRecord } from "../types/payment.types";
import { hasPaymentEvidence } from "../paymentView";
import {
  formatPaymentAmount,
  formatPaymentDate,
  getPaymentAccountLabel,
} from "../utils/paymentFormatters";

type Props = {
  open: boolean;
  payment: PaymentRecord | null;
  onClose: () => void;
};

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-lg border border-border bg-background px-3 py-2">
    <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
    <p className="mt-1 break-words text-sm text-foreground">{value ?? "-"}</p>
  </div>
);

export function PaymentDetailModal({ open, payment, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de pago"
      description={payment?.payDocId ?? undefined}
      className="w-full max-w-2xl"
      footer={
        <div className="flex justify-end">
          <SystemButton variant="ghost" onClick={onClose}>
            Cerrar
          </SystemButton>
        </div>
      }
    >
      {payment ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-primary/5 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Monto</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatPaymentAmount(payment.amount, payment.currency)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Estado</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatPaymentStatusLabel(payment.status)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Metodo</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{payment.method || "-"}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Compra" value={payment.poId} />
            <DetailRow label="Cuenta por pagar" value={payment.accountPayableId} />
            <DetailRow label="Cuenta de empresa" value={getPaymentAccountLabel(payment)} />
            <DetailRow label="Operacion" value={payment.operationCode ?? payment.operationNumber} />
            <DetailRow label="Fecha documento" value={formatPaymentDate(payment.date)} />
            <DetailRow label="Fecha pagada" value={formatPaymentDate(payment.paidAt ?? payment.approvedAt)} />
            <DetailRow label="Programado" value={formatPaymentDate(payment.scheduledAt)} />
            <DetailRow
              label="Evidencia"
              value={hasPaymentEvidence(payment) ? `Adjunta${payment.paymentEvidenceCount ? ` (${payment.paymentEvidenceCount})` : ""}` : "Pendiente"}
            />
            <DetailRow label="Solicitante" value={payment.requestedByUserId} />
            <DetailRow label="Aprobador" value={payment.approvedByUserId} />
          </div>

          {payment.rejectionReason ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <ReceiptText className="h-4 w-4" />
                Motivo de rechazo
              </div>
              {payment.rejectionReason}
            </div>
          ) : null}

          {payment.scheduledAt ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarClock className="h-4 w-4" />
                Pago programado
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
