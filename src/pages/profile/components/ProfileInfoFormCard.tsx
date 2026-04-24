import { useController } from "react-hook-form";
import { Card, CardHeader } from "@/components/AppCard";
import { FloatingInput } from "@/components/FloatingInput";
import { PrimaryButton } from "./ProfilePrimitives";
import type { ProfileInfoFormCardProps } from "../types/components.types";
export function ProfileInfoFormCard({ form, onSubmit, saving, loading, hasSession }: ProfileInfoFormCardProps) {
  const {
    field: nameField,
    fieldState: { error: nameError },
  } = useController({
    control: form.control,
    name: "name",
  });
  const {
    field: telefonoField,
    fieldState: { error: telefonoError },
  } = useController({
    control: form.control,
    name: "telefono",
  });

  return (
    <Card>
      <CardHeader title="Informacion personal" subtitle="Puedes modificar tus datos" />
      <form onSubmit={onSubmit} className="p-5 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingInput
            label="Nombre"
            name={nameField.name}
            onBlur={nameField.onBlur}
            ref={nameField.ref}
            value={nameField.value ?? ""}
            onChange={nameField.onChange}
            error={nameError?.message}
          />
          <FloatingInput
            label="Telefono"
            name={telefonoField.name}
            onBlur={telefonoField.onBlur}
            ref={telefonoField.ref}
            value={telefonoField.value ?? ""}
            onChange={telefonoField.onChange}
            error={telefonoError?.message}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-black/50">
            {hasSession ? "Cuenta verificada por sesion" : "Sin sesion"}
          </p>

          <PrimaryButton type="submit" disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </PrimaryButton>
        </div>
      </form>
    </Card>
  );
}


