import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AxiosError } from "axios";

import { PageTitle } from "@/components/PageTitle";
import { env } from "@/env";
import { useAuth } from "@/hooks/useAuth";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, infoResponse, successResponse } from "@/common/utils/response";

import {
  findOwnUser,
  updateOwnUser,
  updateMyAvatar,
  removeMyAvatar,
  changeMyPassword,
} from "@/services/userService";

import type { CurrentUser, CurrentUserResponse } from "@/types/userProfile";

/** UI helpers */
const PRIMARY = "#21b8a6";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitial(name?: string) {
  const safe = (name ?? "").trim();
  return safe ? safe[0]!.toUpperCase() : "?";
}

function normalizeUser(res: CurrentUserResponse | CurrentUser): CurrentUser {
  return "data" in res ? res.data : res;
}

/** Zod schemas */
const profileSchema = z.object({
  name: z.string().min(2, "Nombre muy corto").max(80, "Nombre muy largo"),
  telefono: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contrasena actual es obligatoria"),
    newPassword: z.string().min(8, "Mí­nimo 8 caracteres"),
    confirmNewPassword: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmNewPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

type BackendErrorPayload = {
  message?: string;
  errors?: string[];
};

function parseChangePasswordError(error: unknown) {
  const err = error as AxiosError<BackendErrorPayload>;
  const status = err?.response?.status;
  const message = err?.response?.data?.message ?? "";
  const errors = err?.response?.data?.errors ?? [];
  const combined = [message, ...errors].filter(Boolean).join(" | ");
  const normalized = combined
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const fieldErrors: { currentPassword?: string; newPassword?: string } = {};

  if (normalized.includes("contrasena actual incorrecta")) {
    fieldErrors.currentPassword = "Contrasena actual incorrecta.";
  }
  if (normalized.includes("nueva contrasena es obligatoria")) {
    fieldErrors.newPassword = "La nueva contrasena es obligatoria.";
  }
  if (normalized.includes("debe tener al menos 8 caracteres")) {
    fieldErrors.newPassword = "La nueva contrasena debe tener al menos 8 caracteres.";
  }

  return {
    message:
      message ||
      (errors.length ? errors.join(" | ") : "") ||
      (status === 401
        ? "No autorizado para cambiar la contrasena."
        : status === 400
          ? "Datos invalidos para cambio de contrasena."
          : "No se pudo cambiar la contrasena"),
    fieldErrors,
  };
}

export default function ProfilePage() {
  const { userId } = useAuth();
  const { showFlash, clearFlash } = useFlashMessage();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [user, setUser] = useState<CurrentUser | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      telefono: "",
    },
    mode: "onTouched",
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onTouched",
  });

  const avatarUrl = useMemo(() => {
    const raw = user?.avatarUrl?.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;

    try {
      return new URL(raw, env.apiBaseUrl).toString();
    } catch {
      return raw;
    }
  }, [user?.avatarUrl]);

  const displayName = useMemo(() => user?.name ?? "Usuario", [user]);

  const getUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await findOwnUser();
      console.log("[Profile] GET /users/me response:", res);
      const u = normalizeUser(res);
      setUser(u);

      // Precargar al form (sin romper si faltan campos)
      profileForm.reset({
        name: u.name ?? "",
        telefono: u.telefono ?? "",
      });
    } catch (error) {
      console.log("[Profile] GET /users/me error:", error);
      showFlash(errorResponse("Error al cargar el perfil"));
    } finally {
      setLoading(false);
    }
  }, [profileForm, showFlash]);

  useEffect(() => {
    getUser();
  }, [getUser]);

  const onSubmitProfile = profileForm.handleSubmit(async (values) => {
    clearFlash();
    setSavingProfile(true);
    try {
      const payload: { name?: string; telefono?: string } = {};
      const nextName = values.name.trim();
      const nextTelefono = (values.telefono ?? "").trim();

      if (nextName !== (user?.name ?? "")) {
        payload.name = nextName;
      }

      if (nextTelefono !== (user?.telefono ?? "")) {
        payload.telefono = nextTelefono;
      }

      if (Object.keys(payload).length === 0) {
        showFlash(infoResponse("No hay cambios para guardar"));
        return;
      }

      const res = await updateOwnUser(payload);
      console.log("[Profile] PATCH /users/me/update payload:", payload);
      console.log("[Profile] PATCH /users/me/update response:", res);
      showFlash(successResponse(res.message || "Perfil actualizado"));
      await getUser();
    } catch (error) {
      console.log("[Profile] PATCH /users/me/update error:", error);
      showFlash(errorResponse("No se pudo actualizar el perfil"));
    } finally {
      setSavingProfile(false);
    }
  });

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    clearFlash();
    passwordForm.clearErrors(["currentPassword", "newPassword"]);
    setSavingPassword(true);
    try {
      const res = await changeMyPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      console.log("[Profile] PATCH /users/me/change-password response:", res);
      showFlash(successResponse(res.message || "Contrasena actualizada correctamente"));
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      console.log("[Profile] PATCH /users/me/change-password error:", error);
      const parsed = parseChangePasswordError(error);
      if (parsed.fieldErrors.currentPassword) {
        passwordForm.setError("currentPassword", {
          type: "server",
          message: parsed.fieldErrors.currentPassword,
        });
      }
      if (parsed.fieldErrors.newPassword) {
        passwordForm.setError("newPassword", {
          type: "server",
          message: parsed.fieldErrors.newPassword,
        });
      }
      showFlash(errorResponse(parsed.message));
    } finally {
      setSavingPassword(false);
    }
  });

  const onPickAvatar = async (file: File) => {
    clearFlash();
    setSavingAvatar(true);
    try {
      const res = await updateMyAvatar(file);
      console.log("[Profile] POST /users/me/avatar file:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      console.log("[Profile] POST /users/me/avatar response:", res);
      showFlash(successResponse("Foto actualizada"));
      await getUser();
    } catch (error) {
      console.log("[Profile] POST /users/me/avatar error:", error);
      showFlash(errorResponse("No se pudo actualizar la foto"));
    } finally {
      setSavingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    clearFlash();
    setSavingAvatar(true);
    try {
      const res = await removeMyAvatar();
      console.log("[Profile] DELETE /users/me/avatar response:", res);
      showFlash(successResponse("Foto eliminada"));
      await getUser();
    } catch (error) {
      console.log("[Profile] DELETE /users/me/avatar error:", error);
      showFlash(errorResponse("No se pudo eliminar la foto"));
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <PageTitle title="Perfil" />

      {/* Contenedor escalable: se ve â€œnormalâ€ en PC y no queda perdido en 4K */}
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:max-w-[1280px] lg:px-8 2xl:max-w-[1600px] 2xl:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Personalizar tu perfil
          </h1>
          <p className="text-sm text-black/60">
            Edita tu información, actualiza tu foto y mantén tu cuenta segura.
          </p>
        </motion.div>

        {/* Layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Col izquierda: Avatar + resumen */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4"
          >
            <Card>
              <CardHeader
                title="Foto de perfil"
                subtitle="Se mostrará en tu cuenta"
              />
              <div className="p-5 pt-0">
                <AvatarBlock
                  loading={loading}
                  name={displayName}
                  avatarUrl={avatarUrl}
                  onPickAvatar={onPickAvatar}
                  onRemoveAvatar={onRemoveAvatar}
                  disabled={savingAvatar}
                />

                <div className="mt-5 rounded-xl border border-black/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-black/40">
                    Resumen
                  </p>
                  <div className="mt-3 space-y-2">
                    <InfoRow label="Nombre" value={displayName} />
                    <InfoRow label="Email" value={user?.email ?? "â€”"} />
                    <InfoRow
                      label="Rol"
                      value={user?.role ?? "â€”"}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.section>

          {/* Col derecha: forms */}
          <div className="lg:col-span-8 space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <Card>
                <CardHeader
                  title="Información personal"
                  subtitle="Puedes modificar tus datos"
                />
                <form onSubmit={onSubmitProfile} className="p-5 pt-0">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Nombre"
                      placeholder="Tu nombre"
                      {...profileForm.register("name")}
                      error={profileForm.formState.errors.name?.message}
                    />
                    <Field
                      label="Teléfono"
                      placeholder="Opcional"
                      {...profileForm.register("telefono")}
                      error={profileForm.formState.errors.telefono?.message}
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-black/50">
                      {userId ? "Cuenta verificada por sesión" : "Sin sesión"}
                    </p>

                    <button
                      type="submit"
                      disabled={savingProfile || loading}
                      className={cn(
                        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white",
                        "transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                      )}
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {savingProfile ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              </Card>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader
                  title="Seguridad"
                  subtitle="Cambia tu contraseña"
                />
                <form onSubmit={onSubmitPassword} className="p-5 pt-0">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <PasswordField
                      label="Contraseña actual"
                      type="password"
                      placeholder="••••••••"
                      {...passwordForm.register("currentPassword")}
                      error={passwordForm.formState.errors.currentPassword?.message}
                    />
                    <PasswordField
                      label="Nueva contraseña"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      {...passwordForm.register("newPassword")}
                      error={passwordForm.formState.errors.newPassword?.message}
                    />
                    <PasswordField
                      label="Confirmar"
                      type="password"
                      placeholder="Repite la nueva"
                      {...passwordForm.register("confirmNewPassword")}
                      error={passwordForm.formState.errors.confirmNewPassword?.message}
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword || loading}
                      className={cn(
                        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white",
                        "transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                      )}
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {savingPassword ? "Actualizando..." : "Cambiar contraseña"}
                    </button>
                  </div>
                </form>
              </Card>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- UI components ------------------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-5 pb-4">
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && <p className="text-xs text-black/60">{subtitle}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-black/50">{label}</span>
      <span className="text-xs font-semibold text-black/80 text-right">
        {value || "â€”"}
      </span>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Field = ({ label, error, className, ...props }: FieldProps) => {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-black/70">{label}</label>
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
          "focus:border-black/20 focus:ring-2 focus:ring-black/5",
          error && "border-red-500/50 focus:ring-red-500/10",
          className
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

const PasswordField = Field;

function AvatarBlock({
  loading,
  name,
  avatarUrl,
  onPickAvatar,
  onRemoveAvatar,
  disabled,
}: {
  loading: boolean;
  name: string;
  avatarUrl?: string;
  onPickAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
  disabled?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasAvatar = Boolean(avatarUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
        {hasAvatar ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-full w-full object-cover object-center"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-xl font-bold text-white"
            style={{ backgroundColor: PRIMARY }}
            aria-label="Avatar inicial"
          >
            {getInitial(name)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-1">
        <p className="text-sm font-semibold">{loading ? "Cargando..." : name}</p>
        <p className="text-xs text-black/60">
          PNG/JPG. Recomendado: cuadrado, buena luz.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
              "border border-black/10 bg-white text-black/80",
              "transition active:scale-[0.99]",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            {disabled ? "Subiendo..." : "Subir foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickAvatar(file);
                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            type="button"
            disabled={disabled || !hasAvatar}
            onClick={onRemoveAvatar}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
              "border border-black/10 bg-white text-black/60",
              "transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}




