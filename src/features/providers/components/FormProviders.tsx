import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { Search } from "lucide-react";
import type { SupplierForm } from "@/features/providers/types/supplier";
import { DocumentType } from "@/features/providers/types/DocumentType";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";
import { SystemButton } from "@/shared/components/components/SystemButton";

const documentTypeOptions = [
  { value: DocumentType.DNI, label: "DNI" },
  { value: DocumentType.RUC, label: "RUC" },
  { value: DocumentType.CE, label: "CE" },
];

const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

type SupplierFormFieldsProps = {
  primaryColor: string;
  form: SupplierForm;
  setForm: Dispatch<SetStateAction<SupplierForm>>;
  onLookupIdentity: () => void;
  lookupDisabled?: boolean;
  disabled?: boolean;
  fieldStyle?: CSSProperties;
};

const grid2Cols = "grid grid-cols-1 gap-3 md:grid-cols-2";
const inputClassName = "h-9 text-xs";
const textareaClassName = "min-h-[90px] text-sm";

export function SupplierFormFields({
  form,
  setForm,
  primaryColor,
  onLookupIdentity,
  lookupDisabled = false,
  disabled = false,
  fieldStyle,
}: SupplierFormFieldsProps) {
  const updateField = <K extends keyof SupplierForm,>(field: K, value: SupplierForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const sharedInputProps = {
    disabled,
    className: inputClassName,
    style: fieldStyle,
  };

  const isNaturalPerson =
    form.documentType === DocumentType.DNI || form.documentType === DocumentType.CE;

  return (
    <div className="space-y-4">
      <div className={`${grid2Cols} mt-2`}>
        <FloatingSelect
          label="Tipo de documento"
          name="supplier-document-type"
          value={form.documentType}
          options={documentTypeOptions}
          onChange={(value) => updateField("documentType", value as DocumentType)}
          disabled={disabled}
          className={inputClassName}
        />

        <div className="flex items-end gap-2">
          <FloatingInput
            label="Número de documento"
            name="supplier-document-number"
            value={form.documentNumber}
            onChange={(e) => updateField("documentNumber", e.target.value)}
            {...sharedInputProps}
          />

          {form.documentType !== DocumentType.CE && (
            <SystemButton
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={onLookupIdentity}
              disabled={lookupDisabled || disabled}
              title="Buscar identidad"
              style={{
                borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
              }}
            >
              <Search className="h-4 w-4" />
            </SystemButton>
          )}
        </div>
      </div>

      {isNaturalPerson && (
        <div className={grid2Cols}>
          <FloatingInput
            label="Nombre"
            name="supplier-name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            {...sharedInputProps}
          />
          <FloatingInput
            label="Apellido"
            name="supplier-last-name"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            {...sharedInputProps}
          />
        </div>
      )}

      {form.documentType === DocumentType.RUC && (
        <FloatingInput
          label="Razón social / Nombre comercial"
          name="supplier-trade-name"
          value={form.tradeName}
          onChange={(e) => updateField("tradeName", e.target.value)}
          {...sharedInputProps}
        />
      )}

      <FloatingInput
        label="Dirección"
        name="supplier-address"
        value={form.address}
        onChange={(e) => updateField("address", e.target.value)}
        {...sharedInputProps}
      />

      <div className={grid2Cols}>
        <FloatingInput
          label="Teléfono"
          name="supplier-phone"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          {...sharedInputProps}
        />
        <FloatingInput
          label="Correo"
          name="supplier-email"
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          {...sharedInputProps}
        />
      </div>

      <div className={grid2Cols}>
        <FloatingInput
          label="Tiempo de espera (días)"
          name="supplier-lead-time"
          type="number"
          min="0"
          step="1"
          value={form.leadTimeDays}
          onChange={(e) => updateField("leadTimeDays", e.target.value)}
          {...sharedInputProps}
        />
        <FloatingSelect
          label="Estado"
          name="supplier-status"
          value={form.isActive ? "active" : "inactive"}
          options={statusOptions}
          onChange={(value) => updateField("isActive", value === "active")}
          disabled={disabled}
          className={inputClassName}
        />
      </div>

      <FloatingTextarea
        label="Nota"
        name="supplier-note"
        value={form.note}
        onChange={(e) => updateField("note", e.target.value)}
        disabled={disabled}
        rows={3}
        className={textareaClassName}
        style={fieldStyle}
      />
    </div>
  );
}
