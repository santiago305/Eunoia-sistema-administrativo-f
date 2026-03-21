import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { findAllRoles } from "@/services/roleService";
import type { CreateUserRequest, UserRoleOptionApi } from "@/pages/users/types/users.types";
import { createUser } from "@/services/userService";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { X, UserPlus } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { RolePicker } from "./roleButton";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema } from "@/schemas/userSchemas";
import type { UserFormProps } from "../types/components.types";

export const UserForm = ({ closeModal }: UserFormProps) => {
    const { showFlash, clearFlash } = useFlashMessage();
    const [roles, setRoles] = useState<UserRoleOptionApi[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CreateUserRequest>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            roleId: "",
            password: "",
            telefono: "",
        },
    });

    const roleId = watch("roleId") ?? "";

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

    useEffect(() => {
        getRoles();
    }, []);

    useEffect(() => {
        reset({
            name: "",
            email: "",
            roleId: "",
            telefono: "",
            password: "",
        });
    }, [reset]);

    const submit = async (data: CreateUserRequest) => {
        clearFlash();

        try {
            const res = await createUser(data);

            showFlash(successResponse(res.message || "Usuario creado satisfactoriamente"));
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
        }
    };

    return (
        <div className="w-full max-w-[700px] overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.10)]">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <UserPlus size={16} />
                        </div>

                        <div>
                            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
                                Crear usuario
                            </h2>
                            <p className="mt-0.5 text-[12px] text-zinc-500">
                                Completa los datos para registrar una nueva cuenta.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={closeModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
                    aria-label="Cerrar modal"
                >
                    <X size={16} />
                </button>
            </div>

            <form onSubmit={handleSubmit(submit)} className="px-5 py-4">
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
                            label="Correo electrónico"
                            type="email"
                            error={errors.email?.message}
                            {...register("email")}
                        />
                    </div>

                    <div>
                        <FloatingInput
                            label="Teléfono"
                            type="text"
                            error={errors.telefono?.message}
                            {...register("telefono")}
                        />
                    </div>

                    <div>
                        <FloatingInput
                            label="Contraseña"
                            type="password"
                            error={errors.password?.message}
                            {...register("password", {
                                required: "La contraseña es obligatoria",
                                minLength: { value: 8, message: "Mínimo 8 caracteres" },
                            })}
                        />
                    </div>

                    <div>

                        <input
                            type="hidden"
                            {...register("roleId", { required: "Selecciona un rol" })}
                        />

                        <RolePicker
                            roles={roles}
                            value={roleId}
                            onChange={(id) =>
                                setValue("roleId", id, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                })
                            }
                            error={errors.roleId?.message}
                        />
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                    <button
                        type="button"
                        className="inline-flex h-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-primary/20"
                        onClick={closeModal}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="inline-flex h-[40px] items-center justify-center rounded-xl bg-primary px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(33,184,166,0.18)] transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-primary/20"
                    >
                        Crear usuario
                    </button>
                </div>
            </form>
        </div>
    );
};
