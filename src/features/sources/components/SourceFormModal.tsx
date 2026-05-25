import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { Source, SourceForm } from "@/features/sources/types/source";
import { SourceFormFields } from "./SourceFormFields";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  source?: Source | null;
  onClose: () => void;
  onSubmit: (form: SourceForm) => void;
  primaryColor?: string;
  loading?: boolean;
};

const DEFAULT_FORM: SourceForm = {
  name: "",
  detail: "",
  isActive: true,
};

export function SourceFormModal({
  open,
  mode,
  source,
  onClose,
  onSubmit,
  primaryColor = "hsl(var(--primary))",
  loading = false,
}: Props) {
  const [form, setForm] = useState<SourceForm>(DEFAULT_FORM);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && source) {
      setForm({
        name: source.name ?? "",
        detail: source.detail ?? "",
        isActive: source.isActive,
      });
      return;
    }

    setForm(DEFAULT_FORM);
  }, [mode, open, source]);

  const canSave = useMemo(() => Boolean(form.name.trim()), [form.name]);

  const fieldStyle: CSSProperties = {
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  const saveButtonStyle: CSSProperties = {
    backgroundColor: primaryColor,
    borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  if (!open) return null;

  const title = mode === "edit" ? "Editar campaña" : "Nueva campaña";

  return (
    <Modal open={open} title={title} onClose={onClose} className="w-[300px] max-h-[400px]">
      <SourceFormFields form={form} setForm={setForm} disabled={loading} fieldStyle={fieldStyle} />

      <div className="mt-2 flex justify-end gap-2">
        <SystemButton variant="outline" size="md" onClick={onClose} disabled={loading}>
          Cancelar
        </SystemButton>

        <SystemButton
          size="md"
          style={saveButtonStyle}
          disabled={!canSave || loading}
          loading={loading}
          onClick={() => {
            if (!canSave || loading) return;
            onSubmit(form);
          }}
        >
          Guardar
        </SystemButton>
      </div>
    </Modal>
  );
}

