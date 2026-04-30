import { useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";

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
  const toSafeNumber = (value: string) => Math.max(0, Number(value || 0));

  return (
    <Modal open={open} onClose={onClose} title="Tiempo extra" className="w-[360px]">
      <div className="space-y-3 text-xs">
        <p className="text-black/60">Configura el tiempo adicional para mover la fecha de ingreso a almacén.</p>
        <div className="grid grid-cols-3 gap-2">
          <FloatingInput
            type="number"
            min={0}
            step={1}
            label="Días"
            name="extra-days"
            value={days}
            disabled={loading}
            onChange={(e) => setDays(toSafeNumber(e.target.value))}
          />
          <FloatingInput
            type="number"
            min={0}
            step={1}
            label="Horas"
            name="extra-hours"
            value={hours}
            disabled={loading}
            onChange={(e) => setHours(toSafeNumber(e.target.value))}
          />
          <FloatingInput
            type="number"
            min={0}
            step={1}
            label="Minutos"
            name="extra-minutes"
            value={minutes}
            disabled={loading}
            onChange={(e) => setMinutes(toSafeNumber(e.target.value))}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <SystemButton variant="ghost" onClick={onClose} disabled={loading}>Cancelar</SystemButton>
          <SystemButton
            onClick={() => onConfirm({ days, hours, minutes })}
            disabled={!canSubmit || loading}
          >
            Aceptar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
