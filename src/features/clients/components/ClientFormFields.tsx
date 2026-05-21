import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { ClientForm } from "@/features/clients/types/client";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { CLIENT_TYPE_OPTIONS } from "@/features/clients/constants/clientType";

const docTypeOptions: Array<{ value: ClientForm["docType"]; label: string }> = [
  { value: "DNI", label: "DNI" },
  { value: "CE", label: "CE" },
  { value: "RUC", label: "RUC" },
  { value: "NONE", label: "SIN DOCUMENTO" },
];

type Props = {
  form: ClientForm;
  setForm: Dispatch<SetStateAction<ClientForm>>;
  departmentOptions: Array<{ value: string; label: string }>;
  provinceOptions: Array<{ value: string; label: string }>;
  districtOptions: Array<{ value: string; label: string }>;
  onDepartmentChange: (departmentId: string) => void;
  onProvinceChange: (provinceId: string) => void;
  onDistrictChange: (districtId: string) => void;
  disabled?: boolean;
  fieldStyle?: CSSProperties;
};

const inputClassName = "h-9 text-xs";

export function ClientFormFields({
  form,
  setForm,
  departmentOptions,
  provinceOptions,
  districtOptions,
  onDepartmentChange,
  onProvinceChange,
  onDistrictChange,
  disabled = false,
  fieldStyle,
}: Props) {
  const updateField = <K extends keyof ClientForm,>(field: K, value: ClientForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const sharedInputProps = {
    disabled,
    className: inputClassName,
    style: fieldStyle,
  };

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 mt-2`}>
        <FloatingSelect
          label="Tipo de cliente"
          name="client-type"
          value={form.type}
          options={CLIENT_TYPE_OPTIONS}
          onChange={(value) => updateField("type", value as ClientForm["type"])}
          disabled={disabled}
          className={inputClassName}
        />  
        <FloatingInput
          label="Nombre completo"
          name="client-full-name"
          value={form.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          {...sharedInputProps}
        />
      </div>
      <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 mt-2`}>
        <FloatingSelect
          label="Tipo de documento"
          name="client-doc-type"
          value={form.docType}
          options={docTypeOptions}
          onChange={(value) => {
            const nextDocType = value as ClientForm["docType"];
            setForm((prev) => ({
              ...prev,
              docType: nextDocType,
              ...(nextDocType === "NONE" ? { docNumber: "" } : { reference: "" }),
            }));
          }}
          disabled={disabled}
          className={inputClassName}
        />
        {
          form.docType === "NONE" && (
            <FloatingInput
              label="Referencia"
              name="client-reference"
              value={form.reference}
              onChange={(e) => updateField("reference", e.target.value)}
              {...sharedInputProps}
            />
          )
        }
        {
          form.docType !== "NONE" && (
            <FloatingInput
              label="Número de documento"
              name="client-doc-number"
              value={form.docNumber}
              onChange={(e) => updateField("docNumber", e.target.value)}
              {...sharedInputProps}
            />
          )
        }
      </div>
      <div className={`grid grid-cols-1 gap-3 md:grid-cols-3 mt-2`}>
        <FloatingSelect
          label="Departamento"
          name="client-department"
          value={form.departmentId}
          options={departmentOptions}
          onChange={onDepartmentChange}
          disabled={disabled}
          className={inputClassName}
          searchable
          searchPlaceholder="Buscar departamento..."
          emptyMessage="Sin departamentos"
        />
        <FloatingSelect
          label="Provincia"
          name="client-province"
          value={form.provinceId}
          options={provinceOptions}
          onChange={onProvinceChange}
          disabled={disabled || !form.departmentId}
          className={inputClassName}
          searchable
          searchPlaceholder="Buscar provincia..."
          emptyMessage="Sin provincias"
        />
        <FloatingSelect
          label="Distrito"
          name="client-district"
          value={form.districtId}
          options={districtOptions}
          onChange={onDistrictChange}
          disabled={disabled || !form.provinceId}
          className={inputClassName}
          searchable
          searchPlaceholder="Buscar distrito..."
          emptyMessage="Sin distritos"
        />
      </div>
      <FloatingInput
        label="Dirección"
        name="client-address"
        value={form.address}
        onChange={(e) => updateField("address", e.target.value)}
        {...sharedInputProps}
      />
    </div>
  );
}
