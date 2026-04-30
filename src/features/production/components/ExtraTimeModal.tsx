import { useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (values: { days: number; hours: number; minutes: number }) => Promise<void> | void;
};

export function ExtraTimeModal({ open, loading = false, onClose, onConfirm }: Props) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const canSubmit = useMemo(() => (days + hours + minutes) > 0, [days, hours, minutes]);

  return (
    <Modal open={open} onClose={onClose} title="Tiempo extra" className="w-[360px]">
      <div className="space-y-3 text-xs">
        <p className="text-black/60">Configura el tiempo adicional para culminar la producción.</p>
        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-black/45">Días</span>
            <input type="number" min={0} value={days} onChange={(e) => setDays(Math.max(0, Number(e.target.value || 0)))} className="w-full rounded-md border border-black/10 px-2 py-1.5" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-black/45">Horas</span>
            <input type="number" min={0} value={hours} onChange={(e) => setHours(Math.max(0, Number(e.target.value || 0)))} className="w-full rounded-md border border-black/10 px-2 py-1.5" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-black/45">Minutos</span>
            <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value || 0)))} className="w-full rounded-md border border-black/10 px-2 py-1.5" />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <SystemButton variant="ghost" onClick={onClose} disabled={loading}>Cancelar</SystemButton>
          <SystemButton onClick={() => onConfirm({ days, hours, minutes })} disabled={!canSubmit || loading}>
            Aceptar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
