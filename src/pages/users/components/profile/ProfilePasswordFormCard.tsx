import type { UseFormReturn } from "react-hook-form";
import type { PasswordFormValues } from "./profile.schemas";
import { Card, CardHeader, PasswordField, PrimaryButton } from "./ProfilePrimitives";

type Props = {
  form: UseFormReturn<PasswordFormValues>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  saving: boolean;
  loading: boolean;
};

export function ProfilePasswordFormCard({ form, onSubmit, saving, loading }: Props) {
  return (
    <Card>
      <CardHeader title="Seguridad" subtitle="Cambia tu contrasena" />
      <form onSubmit={onSubmit} className="p-5 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PasswordField
            label="Contrasena actual"
            type="password"
            placeholder="********"
            {...form.register("currentPassword")}
            error={form.formState.errors.currentPassword?.message}
          />
          <PasswordField
            label="Nueva contrasena"
            type="password"
            placeholder="Minimo 8 caracteres"
            {...form.register("newPassword")}
            error={form.formState.errors.newPassword?.message}
          />
          <PasswordField
            label="Confirmar"
            type="password"
            placeholder="Repite la nueva"
            {...form.register("confirmNewPassword")}
            error={form.formState.errors.confirmNewPassword?.message}
          />
        </div>

        <div className="mt-5 flex items-center justify-end">
          <PrimaryButton type="submit" disabled={saving || loading}>
            {saving ? "Actualizando..." : "Cambiar contrasena"}
          </PrimaryButton>
        </div>
      </form>
    </Card>
  );
}
