import { Card, CardHeader } from "@/components/AppCard";
import { FloatingInput } from "@/components/FloatingInput";
import { PrimaryButton } from "./ProfilePrimitives";
import type { ProfileInfoFormCardProps } from "../types/components.types";
export function ProfileInfoFormCard({ form, onSubmit, saving, loading, hasSession }: ProfileInfoFormCardProps) {
  const nameField = form.register("name");
  const telefonoField = form.register("telefono");
  const nameValue = form.watch("name") ?? "";
  const telefonoValue = form.watch("telefono") ?? "";

  return (
    <Card>
      <CardHeader title="Informacion personal" subtitle="Puedes modificar tus datos" />
      <form onSubmit={onSubmit} className="p-5 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingInput
            label="Nombre"
            ref={nameField.ref}
            name={nameField.name}
            onBlur={nameField.onBlur}
            value={nameValue}
            onChange={(event) => {
              form.setValue("name", event.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            error={form.formState.errors.name?.message}
          />
          <FloatingInput
            label="Telefono"
            ref={telefonoField.ref}
            name={telefonoField.name}
            onBlur={telefonoField.onBlur}
            value={telefonoValue}
            onChange={(event) => {
              form.setValue("telefono", event.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            error={form.formState.errors.telefono?.message}
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


