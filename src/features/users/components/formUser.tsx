import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { findAllRoles } from "@/shared/services/roleService";
import { createUser } from "@/shared/services/userService";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { createUserSchema } from "@/shared/schemas/userSchemas";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { RolePicker } from "./roleButton";
import type { CreateUserRequest, UserRoleOptionApi } from "@/features/users/types/users.types";
import type { UserFormProps } from "../types/components.types";

export const UserForm = ({ closeModal, onCreated }: UserFormProps) => {
  const { showFlash, clearFlash } = useFlashMessage();
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
    clearFlash();
    setSubmitting(true);

    try {
      const res = await createUser(data);

      showFlash(successResponse(res.message || "Usuario creado satisfactoriamente"));
      onCreated?.();
      closeModal?.();

      reset({
        name: "",
        email: "",
        roleId: "",
        telefono: "",
        password: "",
      });
    } catch {
      showFlash(errorResponse("No se pudo crear el usuario"));
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
