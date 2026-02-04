import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { findAllRoles } from "@/services/roleService";
import type { CreateUserDto } from "@/types/user";
import { createUser } from "@/services/userService";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { Eye, EyeOff } from "lucide-react";
import { FormInput } from "@/components/formInput"; // ajusta el path
import { RolePicker } from "@/components/users/roleButton";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema } from "@/schemas/userSchemas";

interface UserFormProps{
    closeModal?: () => void;
}
export const UserForm = ({closeModal}: UserFormProps) => {
    const { showFlash, clearFlash } = useFlashMessage();
    const [roles, setRoles] = useState<any[]>([]);
    const [eyeBool, setEyeBool] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CreateUserDto>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            roleId: "",
            avatarUrl: "",
            password: "",
        } as any,
    });

    const roleId = watch("roleId");

    const getRoles = async () => {
        try {
            const response = await findAllRoles();
            setRoles(response);
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
            password: "",
        } as any);
    }, [reset]);

    const submit = async (data: CreateUserDto) => {
        clearFlash();
        try {
            const res = await createUser(data);

            if (res.data?.type?.error){
                showFlash(errorResponse(res.data?.type?.error)); 
            }else{
                showFlash(successResponse("¡Usuario creado con satisfactoriamente!"));
                closeModal?.();
            }
            reset({
                name: "",
                email: "",
                roleId: "",
                password: ""
            }) 
        } catch {
            showFlash(errorResponse("No se pudo crear el usuario"));
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit(submit)}>
                <div className="px-1 grid grid-rows-3 gap-2 mt-8">
                    <div className="grid max-w-12/12 md:max-w-md lg:max-w-lg xl:max-w-xl">
                        <FormInput placeholder="Ingrese nombre" error={errors.name?.message} {...register("name")} />
                    </div>

                    <div className="grid max-w-12/12 md:max-w-md lg:max-w-lg xl:max-w-xl">
                        <FormInput type="email" placeholder="Ingrese email" error={errors.email?.message} {...register("email")} />
                    </div>

                    <div className="grid max-w-12/12 md:max-w-md lg:max-w-lg xl:max-w-xl">
                        <div className="flex gap-2">
                            <div className="w-full">
                                <FormInput
                                    type={eyeBool ? "password" : "text"}
                                    placeholder="Ingrese contraseña"
                                    error={errors.password?.message}
                                    {...register("password", {
                                        required: "La contraseña es obligatoria",
                                        minLength: { value: 8, message: "Mínimo 8 caracteres" },
                                    })}
                                />
                            </div>

                            <button
                                type="button"
                                className="outline-none focus:ring-4 focus:ring-[#21b8a6]/20 h-14 w-13 text-gray-500 rounded-xl
                                 bg-gray-200 hover:bg-gray-300 cursor-pointer hover:text-gray-700"
                                onClick={() => setEyeBool((prev) => !prev)}
                            >
                                {eyeBool ? <Eye className="ml-3" /> : <EyeOff className="ml-3" />}
                            </button>
                        </div>
                    </div>
                    <div className="grid max-w-12/12 mb-0 mr-7">
                        <input type="hidden" {...register("roleId", { required: "Selecciona un rol" })} />
                        <RolePicker roles={roles} value={roleId} onChange={(id) => setValue("roleId", id, { shouldValidate: true, shouldDirty: true })} error={errors.roleId?.message} />
                    </div>

                    <div className="grid max-w-12/12 md:max-w-md lg:max-w-lg xl:max-w-xl mb-5">
                        <button
                            type="submit"
                            className="w-full h-15 rounded-xl bg-green-200 hover:bg-green-100 cursor-pointer
                            text-gray-600 px-4 text-lg outline-none focus:ring-4 focus:ring-[#21b8a6]/20"
                        >
                            <p className="text-center text-gray-700 text-[1.5rem] font-medium">Guardar</p>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
