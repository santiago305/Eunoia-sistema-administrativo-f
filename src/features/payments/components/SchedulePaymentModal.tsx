import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";

type Props = {
  open: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: string) => void;
};

export function SchedulePaymentModal({ open, onClose, onSchedule }: Props) {
  const [scheduledAt, setScheduledAt] = useState("");

  return (
    <Modal open={open} onClose={onClose} title="Programar pago" className="max-w-md">
      <div className="space-y-4">
        <FloatingDatePicker
          label="Fecha programada"
          name="scheduled-payment-date"
          value={parseDateInputValue(scheduledAt)}
          onChange={(date) => setScheduledAt(date ? toLocalDateKey(date) : "")}
        />
        <SystemButton
          className="w-full"
          disabled={!scheduledAt}
          leftIcon={<CalendarClock className="h-4 w-4" />}
          onClick={() => onSchedule(scheduledAt)}
        >
          Usar fecha programada
        </SystemButton>
      </div>
    </Modal>
  );
}
