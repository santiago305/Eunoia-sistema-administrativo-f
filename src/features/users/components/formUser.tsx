import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { findAllRoles } from "@/shared/services/roleService";
import { createUser, updateUserMailStorageQuota } from "@/shared/services/userService";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { createUserSchema } from "@/shared/schemas/userSchemas";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { RolePicker } from "./roleButton";
import type { CreateUserRequest, UserRoleOptionApi } from "@/features/users/types/users.types";
import type { UserFormProps } from "../types/components.types";
import { useAuth } from "@/shared/hooks/useAuth";

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

  useEffect(() => {
    const getRoles = async () => {
      try {
        const response = await findAllRoles({ status: "all" });
        const normalized: UserRoleOptionApi[] = (Array.isArray(response) ? response : [])
          .map((r) => ({
            id: String(r.id ?? ""),
            description: String(r.description ?? "").toLowerCase(),
          }))
          .filter((r) => !!r.id);

        setRoles(normalized);
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };

    void getRoles();
  }, []);

  const submit = async (data: CreateUserRequest) => {
    clearFeedback();
    setSubmitting(true);

    try {
      const res = await createUser(data);
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

        <div>
          <input type="hidden" {...register("roleId")} />

          <RolePicker
            roles={roles}
            value={roleId}
            onChange={(id) =>
              setValue("roleId", id, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              })
            }
            error={errors.roleId?.message}
          />
        </div>

        {isSuperAdmin ? (
          <div>
            <FloatingInput
              label="Almacenamiento mail (GB)"
              type="number"
              min={1}
              max={5}
              step={1}
              error={errors.mailStorageQuotaGb?.message}
              {...register("mailStorageQuotaGb", { valueAsNumber: true })}
            />
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
        >
          Crear usuario
        </SystemButton>
      </div>
    </form>
  );
};

