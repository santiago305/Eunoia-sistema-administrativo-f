import { useRef } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { Modal } from "@/components/modales/Modal";
import { SystemButton } from "@/components/SystemButton";

type Props = {
  open: boolean;
  metricName: string;
  saveLoading?: boolean;
  inputName: string;
  onMetricNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function DataTableSaveMetricModal({
  open,
  metricName,
  saveLoading = false,
  inputName,
  onMetricNameChange,
  onClose,
  onSave,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (saveLoading) return;
        onClose();
      }}
      title="Guardar metrica"
      className="w-full max-w-md"
      initialFocusRef={inputRef}
      closeButtonClassName="rounded-sm"
      bodyClassName="px-4 py-4"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Dale un nombre a estos filtros.
        </p>

        <FloatingInput
          ref={inputRef}
          label="Nombre de la metrica"
          name={inputName}
          value={metricName}
          onChange={(event) => onMetricNameChange(event.target.value)}
          className="h-11"
        />

        <div className="flex justify-end gap-2">
          <SystemButton
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saveLoading}
          >
            Cancelar
          </SystemButton>
          <SystemButton
            size="sm"
            onClick={onSave}
            disabled={!metricName.trim()}
            loading={saveLoading}
          >
            Guardar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
