import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUser } from "@/services/userService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { UpdateUserDto } from "@/types/user";
import { updateUserSchema } from "@/schemas/userSchemas";
import { useAuth } from "@/hooks/useAuth";
import { Check, Eye, EyeOff, Pencil } from "lucide-react";

type Props = {
    onRequestVerify: (password: string) => void;
    getUser?: () => Promise<void> | void;
    user?: UpdateUserDto;
};
const ProfileForm = ({ onRequestVerify, getUser, user }: Props) => {
    const { showFlash, clearFlash } = useFlashMessage();
    const { userId } = useAuth();
    const [disableName, setDisableName] = useState(true);
    const [disableEmail, setDisableEmail] = useState(true);
    const [disablePassword, setDisablePassword] = useState(true);
    const [eyeBool, setEyeBool] = useState(true);
    const [check, setCheck] = useState(false);

    const { register, reset, trigger, getValues, setFocus, formState: {errors} } = useForm<UpdateUserDto>({
        resolver: zodResolver(updateUserSchema),
        defaultValues: { name: "", email: "", password: "" },
    });

    useEffect(() => {
        reset({
            name: user?.name ?? "",
            email: user?.email ?? "",
        },{
            keepDirtyValues: true, 
        }
    );
    }, [user, reset]);

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
        
        if (field === "password"){
            onRequestVerify( value );
            return;
        };
        
        const originalValue = user?.[field];
        if (value != originalValue) {
            await updateData({ [field]: value } as UpdateUserDto);
            getUser?.();
            return;
        }
    };
    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <div className="pl-4 ml-5 grid grid-rows-3 gap-3">
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
                            className="h-14 w-13 rounded-xl bg-green-300 hover:bg-green-200
                            cursor-pointer text-gray-700 hover:text-gray-500"
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
                                className="h-15 w-full rounded-xl bg-gray-100 text-gray-500 px-4 text-lg outline-none focus:border-[#21b8a6]
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
                            className="h-14 w-13 rounded-xl bg-green-300 hover:bg-green-200
                            cursor-pointer text-gray-700 hover:text-gray-500"
                            onClick={() => {
                                setDisableEmail(false);
                                queueMicrotask(() => setFocus("email"));
                            }}
                        >
                            <Pencil className="ml-3" />
                        </button>
                    </div>
                </div>
                <div className="grid max-w-7/12 gap-1">
                    <label className="text-gl font-semibold text-gray-900">Ingrese nueva contraseña</label>
                    <div className="flex gap-2">
                        <div className=" w-full">
                            <input
                                disabled={disablePassword}
                                type={eyeBool ? "password" : "text"}
                                placeholder="**************"
                                className="h-15 w-full rounded-xl bg-gray-100 text-gray-600 px-4 text-lg outline-none focus:border-[#21b8a6]
                                focus:ring-4 focus:ring-[#21b8a6]/20 focus:text-gray-800"
                                {...register("password")}
                            />
                            <p className={`text-sm text-center mt-1 text-red-400 ${errors.password ? "visible" : "invisible"}`}>{errors.password?.message ?? "placeholder"}</p>
                        </div>
                        <button
                            type="button"
                            className={`h-14 w-13 text-gray-700 rounded-xl ${check ? "bg-blue-300 hover:bg-blue-200" : "bg-green-300 hover:bg-green-200"} 
                            cursor-pointer hover:text-gray-500`}
                            onClick={() => {
                                if(check){
                                    saveField("password");
                                    setCheck(false);
                                    setDisablePassword(true)
                                }else{
                                    setDisablePassword(false);
                                    queueMicrotask(() => setFocus("password"));
                                    setCheck(true);
                                }
                            }}
                        >
                            {!check ? <Pencil className="ml-2" /> : <Check className="ml-2" />}
                        </button>

                        <button
                            type="button"
                            className="h-14 w-13 text-gray-700 rounded-xl bg-gray-300 hover:bg-gray-200
                            cursor-pointer hover:text-gray-500"
                            onClick={() => {
                                setEyeBool((prev) => !prev);
                            }}
                        >
                            {eyeBool ? <Eye className="ml-3" /> : <EyeOff className="ml-3" />}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default ProfileForm;
