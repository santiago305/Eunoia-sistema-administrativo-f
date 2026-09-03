
import { Building2, Key, MapPin, Palette, Phone } from "lucide-react";
import { CompanyFormSectionProps } from "../types/companyComponentTypes";
import { SectionHeaderForm } from "@/shared/components/components/SectionHederForm";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { UbigeoSelectSection } from "@/shared/components/components/UbigeoSelectSection";
import { FloatingRadioGroup } from "@/shared/components/components/FloatingRadioGroup";
import { SystemButton } from "@/shared/components/components/SystemButton";


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
            onChange={(event) => onFieldChange("name", event.target.value)}
            error={formErrors.name}
            disabled={disabled}
          />

          <FloatingInput
            label="RUC"
            name="ruc"
            value={formValues.ruc ?? ""}
            onChange={(event) => onFieldChange("ruc", event.target.value)}
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
            onChange={(event) =>
              onFieldChange("urbanization", event.target.value)
            }
            error={formErrors.urbanization}
            disabled={disabled}
          />

          <FloatingInput
            label="Dirección"
            name="address"
            value={formValues.address ?? ""}
            onChange={(event) => onFieldChange("address", event.target.value)}
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
            onChange={(event) => onFieldChange("phone", event.target.value)}
            error={formErrors.phone}
            disabled={disabled}
          />

          <FloatingInput
            label="Correo"
            name="email"
            type="email"
            value={formValues.email ?? ""}
            onChange={(event) => onFieldChange("email", event.target.value)}
            error={formErrors.email}
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <SectionHeaderForm icon={Palette} title="Apariencia" />
        <div className="rounded-lg border border-border bg-muted/25 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label
                htmlFor="company-primary-color"
                className="text-sm font-medium text-foreground"
              >
                Color principal del sistema
              </label>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-medium text-foreground">
                {formValues.primaryColor}
              </span>
              <input
                id="company-primary-color"
                name="primaryColor"
                type="color"
                value={formValues.primaryColor}
                onChange={(event) =>
                  onFieldChange("primaryColor", event.target.value.toUpperCase())
                }
                disabled={disabled}
                aria-label="Color principal del sistema"
                className="h-10 w-14 rounded-lg border border-border bg-background p-1 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>
          {formErrors.primaryColor ? (
            <p className="mt-2 text-xs text-red-600">{formErrors.primaryColor}</p>
          ) : null}
        </div>
      </div>

      <div>
        <SectionHeaderForm icon={Key} title="SUNAT / SOL" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingInput
            label="Código local"
            name="codLocal"
            value={formValues.codLocal ?? ""}
            onChange={(event) => onFieldChange("codLocal", event.target.value)}
            error={formErrors.codLocal}
            disabled={disabled}
          />

          <FloatingInput
            label="SOL Usuario"
            name="solUser"
            value={formValues.solUser ?? ""}
            onChange={(event) => onFieldChange("solUser", event.target.value)}
            error={formErrors.solUser}
            disabled={disabled}
          />

          <FloatingInput
            label="SOL Clave"
            name="solPass"
            type="password"
            value={formValues.solPass ?? ""}
            onChange={(event) => onFieldChange("solPass", event.target.value)}
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
