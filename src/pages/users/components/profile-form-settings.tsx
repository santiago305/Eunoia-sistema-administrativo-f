import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { findOwnUser, updateUser } from "@/services/userService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { UpdateUserDto } from "@/types/user";
import { updateUserSchema } from "@/schemas/userSchemas";
import { useAuth } from "@/hooks/useAuth";
import { Pencil } from "lucide-react";

type Props = {
    onRequestVerify: (password:  string ) => void;
};
const ProfileForm = ({ onRequestVerify }: Props) => {
    const { showFlash, clearFlash } = useFlashMessage();
    const { userId } = useAuth();
    const [user, setUser] = useState<UpdateUserDto>();
    const [disableName, setDisableName] = useState(true);
    const [disableEmail, setDisableEmail] = useState(true);
    const [disablePassword, setDisablePassword] = useState(true);
    const [password, setPassword] = useState("");

    const { register, reset, trigger, getValues, setFocus, formState: {errors} } = useForm<UpdateUserDto>({
        resolver: zodResolver(updateUserSchema),
        defaultValues: { name: "", email: "", password: "" },
    });

    const getUser = useCallback(async () => {
        try {
            const res = await findOwnUser();
            setUser(res.data);
            reset({
                name: res.data.name ?? "",
                email: res.data.email ?? "",
                password: "",
            });
        } catch {
            showFlash(errorResponse("Error al cargar usuario"));
        }
    }, [showFlash, reset]);

    useEffect(() => {
        getUser();
    }, [getUser]);

    const updateData = async (data: UpdateUserDto) => {
        clearFlash();
        if (!userId) {
            showFlash(errorResponse("User id is missing."));
            return;
        }
        try {
            const res = await updateUser(userId, data);
            if(res?.type === "success"){
                showFlash(successResponse("Campo actualizado correctamente"));
            }else{
                showFlash(errorResponse("Error al actualizar los datos"));
            }
        } catch {
            showFlash(errorResponse("Error al actualizar datos"));
        }
    };
    const saveField = async (field: keyof UpdateUserDto) => {
        const ok = await trigger(field);
        if (!ok) return;

        const value = getValues(field);
        const originalValue = user[field];

        if (field === "password" && !value) return;
        if (field === "password"){
            setPassword(value)
            onRequestVerify( password );
            await getUser();
            return;
        };

        if (value != originalValue) {
            await updateData({ [field]: value } as UpdateUserDto);
            await getUser();
            return;
        }
    };
    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <div className="pl-4 ml-5 grid grid-rows-3 gap-4">
                <div className="grid max-w-7/12 gap-2">
                    <label className="text-gl font-semibold text-gray-900">Nombre</label>
                    <div className="flex gap-2">
                        <div className=" w-full">
                            <input
                                disabled={disableName}
                                type="text"
                                placeholder="Tu nombre"
                                className="h-15 w-full rounded-xl bg-gray-100 text-gray-600 px-4 text-lg outline-none focus:border-[#21b8a6]
                            focus:ring-4 focus:ring-[#21b8a6]/20 focus:text-gray-800"
                                {...register("name", {
                                    onBlur: () => {
                                        saveField("name");
                                        setDisableName(true);
                                    },
                                })}
                            />
                            <p className={`text-sm text-center mt-1 text-red-400 ${errors.name ? "visible" : "invisible"}`}>{errors.name?.message ?? "placeholder"}</p>
                        </div>
                        <button
                            type="button"
                            className="h-14 w-13 rounded-xl bg-green-200 hover:bg-green-300
                            cursor-pointer text-gray-600 hover:text-gray-700"
                            onClick={() => {
                                setDisableName(false);
                                queueMicrotask(() => setFocus("name"));
                            }}
                        >
                            <Pencil className="ml-3" />
                        </button>
                    </div>
                </div>
                <div className="grid max-w-7/12 gap-2">
                    <label className="text-gl font-semibold text-gray-900">Email</label>
                    <div className="flex gap-2">
                        <div className=" w-full">
                            <input
                                disabled={disableEmail}
                                type="email"
                                placeholder="Tu email"
                                className="h-15 w-full rounded-xl bg-gray-100 text-gray-600 px-4 text-lg outline-none focus:border-[#21b8a6]
                            focus:ring-4 focus:ring-[#21b8a6]/20 focus:text-gray-800"
                                {...register("email", {
                                    onBlur: () => {
                                        saveField("email");
                                        setDisableEmail(true);
                                    },
                                })}
                            />
                            <p className={`text-sm text-center mt-1 text-red-400 ${errors.email ? "visible" : "invisible"}`}>{errors.email?.message ?? "placeholder"}</p>
                        </div>
                        <button
                            type="button"
                            className="h-14 w-13 rounded-xl bg-green-200 hover:bg-green-300
                            cursor-pointer text-gray-600 hover:text-gray-700"
                            onClick={() => {
                                setDisableEmail(false);
                                queueMicrotask(() => setFocus("email"));
                            }}
                        >
                            <Pencil className="ml-3" />
                        </button>
                    </div>
                </div>
                <div className="grid max-w-7/12 gap-2">
                    <label className="text-gl font-semibold text-gray-900">Contraseña</label>
                    <div className="flex gap-2">
                        <div className=" w-full">
                            <input
                                disabled={disablePassword}
                                type="password"
                                placeholder="**************"
                                className="h-15 w-full rounded-xl bg-gray-100 text-gray-600 px-4 text-lg outline-none focus:border-[#21b8a6]
                            focus:ring-4 focus:ring-[#21b8a6]/20 focus:text-gray-800"
                                {...register("password", {
                                    onBlur: () => {
                                        saveField("password");
                                        setDisablePassword(true);
                                    },
                                })}
                            />
                            <p className={`text-sm text-center mt-1 text-red-400 ${errors.password ? "visible" : "invisible"}`}>{errors.password?.message ?? "placeholder"}</p>
                        </div>
                        <button
                            type="button"
                            className="h-14 w-13 text-gray-600 rounded-xl bg-green-200 hover:bg-green-300
                            cursor-pointer hover:text-gray-700"
                            onClick={() => {
                                setDisablePassword(false);
                                queueMicrotask(() => setFocus("password"));
                            }}
                        >
                            <Pencil className="ml-3" />
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default ProfileForm;
