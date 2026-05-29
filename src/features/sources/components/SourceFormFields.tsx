import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { SourceForm } from "@/features/sources/types/source";
import { FloatingInput } from "@/shared/components/components/FloatingInput";

type Props = {
  form: SourceForm;
  setForm: Dispatch<SetStateAction<SourceForm>>;
  disabled?: boolean;
  fieldStyle?: CSSProperties;
};

const inputClassName = "h-9 text-xs";

export function SourceFormFields({ form, setForm, disabled = false, fieldStyle }: Props) {
  const updateField = <K extends keyof SourceForm,>(field: K, value: SourceForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const sharedInputProps = {
    disabled,
    className: inputClassName,
    style: fieldStyle,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 mt-2">
        <FloatingInput
          label="Nombre"
          name="source-name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          {...sharedInputProps}
        />
        <FloatingInput
          label="Detalle"
          name="source-detail"
          value={form.detail}
          onChange={(e) => updateField("detail", e.target.value)}
          {...sharedInputProps}
        />
      </div>
    </div>
  );
}

