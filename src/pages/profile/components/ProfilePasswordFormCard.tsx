import { Card, CardHeader } from "@/components/AppCard";
import { FloatingInput } from "@/components/FloatingInput";
import { PrimaryButton } from "./ProfilePrimitives";
import type { ProfilePasswordFormCardProps } from "../types/components.types";
export function ProfilePasswordFormCard({ form, onSubmit, saving, loading }: ProfilePasswordFormCardProps) {
  return (
    <Card>
      <CardHeader title="Seguridad" subtitle="Cambia tu contrasena" />
      <form onSubmit={onSubmit} className="p-5 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FloatingInput
            label="Contrasena actual"
            type="password"
            {...form.register("currentPassword")}
            error={form.formState.errors.currentPassword?.message}
          />
          <FloatingInput
            label="Nueva contrasena"
            type="password"
            {...form.register("newPassword")}
            error={form.formState.errors.newPassword?.message}
          />
          <FloatingInput
            label="Confirmar"
            type="password"
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


