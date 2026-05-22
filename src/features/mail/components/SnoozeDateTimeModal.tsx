import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { CalendarPanel } from "@/shared/components/components/date-picker/CalendarPanel";
import { setTimeParts } from "@/shared/components/components/date-picker/dateUtils";
import {
  formatSnoozeDateInput,
  formatSnoozeTimeInput,
  parseSnoozeDateInput,
  parseSnoozeTimeInput,
} from "../utils/mail-snooze.utils";

type Props = {
  open: boolean;
  value: Date;
  onClose: () => void;
  onSave: (date: Date) => void;
};

export default function SnoozeDateTimeModal({ open, value, onClose, onSave }: Props) {
  const [monthDate, setMonthDate] = useState<Date>(value);
  const [draftDate, setDraftDate] = useState<Date>(value);
  const [dateInput, setDateInput] = useState<string>(formatSnoozeDateInput(value));
  const [timeInput, setTimeInput] = useState<string>(formatSnoozeTimeInput(value));

  useEffect(() => {
    if (!open) return;
    setMonthDate(value);
    setDraftDate(value);
    setDateInput(formatSnoozeDateInput(value));
    setTimeInput(formatSnoozeTimeInput(value));
  }, [open, value]);

  const isPast = useMemo(() => draftDate.getTime() <= Date.now(), [draftDate]);

  const syncDraftDate = (next: Date) => {
    setDraftDate(next);
    setDateInput(formatSnoozeDateInput(next));
    setTimeInput(formatSnoozeTimeInput(next));
  };

  const applyDateInput = () => {
    const parsed = parseSnoozeDateInput(dateInput, draftDate);
    if (!parsed) {
      setDateInput(formatSnoozeDateInput(draftDate));
      return;
    }
    const next = setTimeParts(parsed, draftDate.getHours(), draftDate.getMinutes());
    syncDraftDate(next);
    setMonthDate(next);
  };

  const applyTimeInput = () => {
    const parsed = parseSnoozeTimeInput(timeInput);
    if (!parsed) {
      setTimeInput(formatSnoozeTimeInput(draftDate));
      return;
    }
    const next = setTimeParts(draftDate, parsed.hours, parsed.minutes);
    syncDraftDate(next);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Elegir fecha y hora"
      className="w-full max-w-[650px]"
      bodyClassName="px-6 py-4"
      footerClassName="px-6 py-4"
      footer={(
        <div className="flex items-center justify-end gap-3">
          <SystemButton type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </SystemButton>
          <SystemButton
            type="button"
            variant="primary"
            size="sm"
            className="w-[120px]"
            disabled={isPast}
            onClick={() => onSave(draftDate)}
          >
            Guardar
          </SystemButton>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <CalendarPanel
          mode="datetime"
          monthDate={monthDate}
          onMonthDateChange={setMonthDate}
          selectedDate={draftDate}
          onSelectDate={(date) => {
            const next = setTimeParts(date, draftDate.getHours(), draftDate.getMinutes());
            syncDraftDate(next);
          }}
          showTimeControls={false}
          className="rounded-2xl border-border shadow-none"
        />

        <div className="flex flex-col gap-6 pt-1">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fecha</span>
            <input
              type="text"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              onBlur={applyDateInput}
              className="h-14 w-full rounded-lg border border-border bg-background px-4 text-xl font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="24 may 2026"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hora</span>
            <input
              type="text"
              value={timeInput}
              onChange={(event) => setTimeInput(event.target.value)}
              onBlur={applyTimeInput}
              className="h-14 w-full rounded-lg border border-border bg-background px-4 text-xl font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="8:00"
            />
          </label>

          {isPast ? (
            <p className="text-xs text-destructive">Elige una fecha y hora futura.</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

