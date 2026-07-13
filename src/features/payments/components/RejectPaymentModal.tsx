import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { Modal } from "@/shared/components/modales/Modal";

type Props = {
  open: boolean;
  paymentId?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
};

export function RejectPaymentModal({
  open,
  paymentId,
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError("");
  }, [open, paymentId]);

  const handleConfirm = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Ingresa el motivo del rechazo.");
      return;
    }

    onConfirm(trimmedReason);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rechazar pago"
      description={paymentId ? `Pago ${paymentId}` : undefined}
      className="w-full max-w-md"
      preventClose={loading}
      footer={
        <div className="flex justify-end gap-2">
          <SystemButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </SystemButton>
          <SystemButton
            variant="danger"
            leftIcon={<X className="h-4 w-4" />}
            onClick={handleConfirm}
            loading={loading}
          >
            Rechazar pago
          </SystemButton>
        </div>
      }
    >
      <FloatingTextarea
        label="Motivo"
        name="payment-rejection-reason"
        value={reason}
        error={error}
        rows={4}
        onChange={(event) => {
          setReason(event.target.value);
          if (error) setError("");
        }}
      />
    </Modal>
  );
}
