import type { FormEvent } from "react";

import {
  UbigeoSelectSection,
  type UbigeoSelection,
} from "@/components/UbigeoSelectSection";
import type {
  CompanyFormErrors,
  CompanyFormValues,
} from "../types/companyFormTypes";
import { FloatingInput } from "@/components/FloatingInput";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { Building2, Key, MapPin, Phone } from "lucide-react";
import { FloatingRadioGroup } from "@/components/FloatingRadioGroup";
import { SystemButton } from "@/components/SystemButton";

type CompanyFormSectionProps = {
  formValues: CompanyFormValues;  
  formErrors: CompanyFormErrors;
  ubigeoSelection: UbigeoSelection;
  loading: boolean;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: <K extends keyof CompanyFormValues>(
    field: K,
    value: CompanyFormValues[K]
  ) => void;
  onUbigeoChange: (next: UbigeoSelection) => void;
};

export function CompanyFormSection({
  formValues,
  formErrors,
  ubigeoSelection,
  loading,
  saving,
  onSubmit,
  onFieldChange,
  onUbigeoChange,
}: CompanyFormSectionProps) {
  const disabled = saving || loading;

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-5">

      <div>
        <SectionHeaderForm icon={Building2} title="Identificación" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FloatingInput
            label="Razón social"
            name="name"
            value={formValues.name ?? ""}
            onChange={(e) => onFieldChange("name", e.target.value)}
            error={formErrors.name}
            disabled={disabled}
          />

          <FloatingInput
            label="RUC"
            name="ruc"
            value={formValues.ruc ?? ""}
            onChange={(e) => onFieldChange("ruc", e.target.value)}
            error={formErrors.ruc}
            disabled={disabled}
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <SectionHeaderForm icon={MapPin} title="Ubicación" />
        <div className="mb-4">
          <UbigeoSelectSection
            value={ubigeoSelection}
            onChange={onUbigeoChange}
            disabled={disabled}
            showUbigeoInput
            className=""
            errors={{
              department: formErrors.department,
              province: formErrors.province,
              district: formErrors.district,
              ubigeo: formErrors.ubigeo,
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FloatingInput
            label="Urbanización"
            name="urbanization"
            value={formValues.urbanization ?? ""}
            onChange={(e) => onFieldChange("urbanization", e.target.value)}
            error={formErrors.urbanization}
            disabled={disabled}
          />

          <FloatingInput
            label="Dirección"
            name="address"
            value={formValues.address ?? ""}
            onChange={(e) => onFieldChange("address", e.target.value)}
            error={formErrors.address}
            disabled={disabled}
          />
        </div>
      </div>
      
      <div>
        <SectionHeaderForm icon={Phone} title="Contacto" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FloatingInput
            label="Teléfono"
            name="phone"
            value={formValues.phone ?? ""}
            onChange={(e) => onFieldChange("phone", e.target.value)}
            error={formErrors.phone}
            disabled={disabled}
          />

          <FloatingInput
            label="Correo"
            name="email"
            type="email"
            value={formValues.email ?? ""}
            onChange={(e) => onFieldChange("email", e.target.value)}
            error={formErrors.email}
            disabled={disabled}
          />
        </div>
      </div>
      
      <div>
        <SectionHeaderForm icon={Key} title="SUNAT / SOL" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingInput
            label="Código local"
            name="codLocal"
            value={formValues.codLocal ?? ""}
            onChange={(e) => onFieldChange("codLocal", e.target.value)}
            error={formErrors.codLocal}
            disabled={disabled}
          />

          <FloatingInput
            label="SOL Usuario"
            name="solUser"
            value={formValues.solUser ?? ""}
            onChange={(e) => onFieldChange("solUser", e.target.value)}
            error={formErrors.solUser}
            disabled={disabled}
          />

          <FloatingInput
            label="SOL Clave"
            name="solPass"
            type="password"
            value={formValues.solPass ?? ""}
            onChange={(e) => onFieldChange("solPass", e.target.value)}
            error={formErrors.solPass}
            disabled={disabled}
          />
        </div>
      </div>

      <FloatingRadioGroup
        label="Modo de ambiente"
        name="production-mode"
        value={Boolean(formValues.production)}
        onChange={(value) => onFieldChange("production", value)}
        disabled={disabled}
        options={[
          {
            label: "Prueba",
            value: false,
            description: "Ambiente de test para validación de comprobantes",
          },
          {
            label: "Producción",
            value: true,
            description: "Ambiente real para emisión de comprobantes",
          },
        ]}
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-black/50">
          {loading
            ? "Cargando datos..."
            : "Actualiza lo necesario y guarda los cambios."}
        </p>

        <SystemButton type="submit" disabled={disabled}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </SystemButton>
      </div>
    </form>
  );
}