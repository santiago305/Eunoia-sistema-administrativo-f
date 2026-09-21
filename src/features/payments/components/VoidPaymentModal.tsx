import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { Modal } from "@/shared/components/modales/Modal";

type Props = { open: boolean; paymentId?: string | null; onClose: () => void; onConfirm: (reason: string) => void; loading?: boolean };

export function VoidPaymentModal({ open, paymentId, onClose, onConfirm, loading = false }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setReason(""); setError(""); } }, [open, paymentId]);
  const confirm = () => { if (!reason.trim()) { setError("Ingresa el motivo de la anulación."); return; } onConfirm(reason.trim()); };
  return <Modal open={open} onClose={onClose} title="Anular pago" description={paymentId ? `Pago ${paymentId}` : undefined} className="w-full max-w-md" preventClose={loading} footer={<div className="flex justify-end gap-2"><SystemButton variant="ghost" onClick={onClose} disabled={loading}>Cancelar</SystemButton><SystemButton variant="danger" leftIcon={<Ban className="h-4 w-4" />} onClick={confirm} loading={loading}>Anular pago</SystemButton></div>}>
    <FloatingTextarea label="Motivo de anulación" name="payment-void-reason" value={reason} error={error} rows={4} onChange={(event) => { setReason(event.target.value); if (error) setError(""); }} />
  </Modal>;
}
