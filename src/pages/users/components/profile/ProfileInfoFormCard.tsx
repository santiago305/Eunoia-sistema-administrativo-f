import type { UseFormReturn } from "react-hook-form";
import type { ProfileFormValues } from "./profile.schemas";
import { Card, CardHeader, Field, PrimaryButton } from "./ProfilePrimitives";

type Props = {
  form: UseFormReturn<ProfileFormValues>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  saving: boolean;
  loading: boolean;
  hasSession: boolean;
};

export function ProfileInfoFormCard({ form, onSubmit, saving, loading, hasSession }: Props) {
  return (
    <Card>
      <CardHeader title="Informacion personal" subtitle="Puedes modificar tus datos" />
      <form onSubmit={onSubmit} className="p-5 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Nombre"
            placeholder="Tu nombre"
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Field
            label="Telefono"
            placeholder="Opcional"
            {...form.register("telefono")}
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
