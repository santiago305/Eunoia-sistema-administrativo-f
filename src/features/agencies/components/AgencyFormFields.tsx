import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { AgencyForm } from "@/features/agencies/types/agency";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";

type Props = {
  form: AgencyForm;
  setForm: Dispatch<SetStateAction<AgencyForm>>;
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

export function AgencyFormFields({
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
  const updateField = <K extends keyof AgencyForm,>(field: K, value: AgencyForm[K]) => {
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
          name="agency-name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          {...sharedInputProps}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mt-2">
        <FloatingSelect
          label="Departamento"
          name="agency-department"
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
          name="agency-province"
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
          name="agency-district"
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mt-2">
        <FloatingInput
          label="Dirección"
          name="agency-address"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          {...sharedInputProps}
        />
        <FloatingInput
          label="Referencia"
          name="agency-reference"
          value={form.reference}
          onChange={(e) => updateField("reference", e.target.value)}
          {...sharedInputProps}
        />
      </div>
    </div>
  );
}

