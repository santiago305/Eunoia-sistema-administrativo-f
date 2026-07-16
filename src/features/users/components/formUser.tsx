import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { findAllRoles } from "@/shared/services/roleService";
import { createUser, updateUserMailStorageQuota } from "@/shared/services/userService";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { createUserSchema } from "@/shared/schemas/userSchemas";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { CreateUserRequest, UserRoleOptionApi } from "@/features/users/types/users.types";
import type { UserFormProps } from "../types/components.types";
import { useAuth } from "@/shared/hooks/useAuth";
import { Minus, Plus } from "lucide-react";

const MASTER_ROLE_DESCRIPTION = "super_administrator";

export const UserForm = ({ closeModal, onCreated }: UserFormProps) => {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<UserRoleOptionApi[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserRequest>({
    resolver: zodResolver(createUserSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      roleId: "",
      password: "",
      telefono: "",
      mailStorageQuotaGb: 1,
    },
  });

  const roleId = watch("roleId") ?? "";
  const mailStorageQuotaGb = Number(watch("mailStorageQuotaGb") ?? 1);

  const setQuota = (nextValue: number) => {
    setValue("mailStorageQuotaGb", Math.max(1, Math.min(5, nextValue)), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  useEffect(() => {
    const getRoles = async () => {
      try {
        const response = await findAllRoles({ status: "all" });
        const normalized: UserRoleOptionApi[] = (Array.isArray(response) ? response : [])
          .filter((r) => !(r as { deleted?: boolean }).deleted)
          .map((r) => ({
            id: String(r.id ?? ""),
            description: String(r.description ?? "").toLowerCase(),
          }))
          .filter((r) => !!r.id && r.description !== MASTER_ROLE_DESCRIPTION);

        setRoles(normalized);
      } catch {
        setRoles([]);
      }
    };

    void getRoles();
  }, []);

  const submit = async (data: CreateUserRequest) => {
    clearFeedback();
    if (!isSuperAdmin && (!data.roleId || data.roleId.trim().length === 0)) {
      showFeedback(errorResponse("Debes seleccionar un rol."));
      return;
    }
    setSubmitting(true);

    try {
      const payload: CreateUserRequest = {
        ...data,
        roleId: data.roleId?.trim() ? data.roleId : undefined,
      };
      const res = await createUser(payload);
      const createdId = res?.data && typeof res.data === "object" ? String((res.data as { id?: string }).id ?? "") : "";
      let quotaSaved = true;
      if (createdId && isSuperAdmin) {
        try {
          await updateUserMailStorageQuota(createdId, Number(data.mailStorageQuotaGb ?? 1));
        } catch {
          quotaSaved = false;
        }
      }

      showFeedback(
        successResponse(
          quotaSaved
            ? (res.message || "Usuario creado satisfactoriamente")
            : "Usuario creado. No se pudo guardar la cuota de almacenamiento, actualizala en el panel del usuario.",
        ),
      );
      onCreated?.();
      closeModal?.();

      reset({
        name: "",
        email: "",
        roleId: "",
        telefono: "",
        password: "",
        mailStorageQuotaGb: 1,
      });
    } catch {
      showFeedback(errorResponse("No se pudo crear el usuario"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="p-1">
      <div className="mb-5 border-b border-zinc-100 pb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Nueva cuenta</p>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Define sus datos iniciales, rol y cuota de almacenamiento. Luego puedes ajustar permisos directos desde el panel del usuario.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FloatingInput
            label="Nombre"
            error={errors.name?.message}
            {...register("name")}
          />
        </div>

        <div>
          <FloatingInput
            label="Correo electronico"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        <div>
          <FloatingInput
            label="Telefono"
            type="text"
            error={errors.telefono?.message}
            {...register("telefono")}
          />
        </div>

        <div>
          <FloatingInput
            label="Contrasena"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <div className="sm:col-span-2">
          <input type="hidden" {...register("roleId")} />
          <FloatingSelect
            label="Rol"
            name="roleId"
            value={roleId}
            options={roles.map((role) => ({
              value: role.id,
              label: role.description,
            }))}
            onChange={(id) =>
              setValue("roleId", id, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              })
            }
            error={errors.roleId?.message}
            placeholder={isSuperAdmin ? "Selecciona un rol (opcional)" : "Selecciona un rol"}
            searchable
            searchPlaceholder="Buscar rol..."
            emptyMessage="No hay roles disponibles"
          />
        </div>

        {isSuperAdmin ? (
          <div className="rounded-sm bg-primary/5 p-4 sm:col-span-2">
            <input type="hidden" {...register("mailStorageQuotaGb", { valueAsNumber: true })} />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Almacenamiento</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">{mailStorageQuotaGb} GB para correo</p>
                {errors.mailStorageQuotaGb?.message ? (
                  <p className="mt-1 text-xs text-red-600">{errors.mailStorageQuotaGb.message}</p>
                ) : null}
              </div>

              <div className="flex min-w-[240px] items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuota(mailStorageQuotaGb - 1)}
                  className="grid h-10 w-10 place-items-center rounded-sm bg-white text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={mailStorageQuotaGb}
                  onChange={(event) => setQuota(Number(event.target.value))}
                  className="h-2 flex-1 accent-primary"
                  aria-label="Cuota de almacenamiento"
                />
                <button
                  type="button"
                  onClick={() => setQuota(mailStorageQuotaGb + 1)}
                  className="grid h-10 w-10 place-items-center rounded-sm bg-white text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
        <SystemButton
          type="button"
          variant="outline"
          size="md"
          onClick={closeModal}
        >
          Cancelar
        </SystemButton>

        <SystemButton
          type="submit"
          variant="primary"
          size="md"
          loading={submitting}
          disabled={!isSuperAdmin && !roleId}
        >
          Crear usuario
        </SystemButton>
      </div>
    </form>
  );
};

