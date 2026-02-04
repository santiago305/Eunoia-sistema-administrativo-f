import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UpdateUserDto } from "@/types/user";
import { getInitials } from "@/utils/getInitials";
import { useMemo, useState, type ChangeEvent } from "react";
import { env } from "@/env";
import { removeAvatar, updateAvatar } from "@/services/userService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";

type Props = {
    getUser?: () => Promise<void> | void;
    user?: UpdateUserDto;
};

const AvatarPhoto = ({ getUser, user }: Props) => {
    const [uploading, setUploading] = useState(false);
    const { showFlash, clearFlash } = useFlashMessage();


   const avatarSrc = useMemo(() => {
       const raw = user?.avatarUrl?.trim();
       if (!raw) return "";
       if (/^https?:\/\//i.test(raw)) return raw;
       return `${env.apiBaseUrl}${raw.startsWith("/") ? raw : `/${raw}`}`;
   }, [user?.avatarUrl]);

    console.log(avatarSrc,'avatar');

    const onAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        clearFlash();
        const file = event.target.files?.[0];
        const userId = (user as { id?: string })?.id;
        if (!file || !userId) return;

        try {
            setUploading(true);
            await updateAvatar(userId, file);
            await getUser?.();
            showFlash(successResponse("Foto de perfil actualizada"));
        } catch {
            showFlash(errorResponse("Error al subir foto de perfil"));
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const onRemoveAvatar = async()=> {
        try {
            const res = await removeAvatar(user.id);
            if(res?.type === 'success'){
                showFlash(successResponse("Foto removida con exito"));
                getUser?.();
            }else{
                showFlash(errorResponse("Error al remover foto"));
            }
        } catch{
            showFlash(errorResponse('Error al remover imagen'));
        }
    }

    if (!user) {
        return (
            <div className="px-10 py-6">
                <div className="h-28 w-28 rounded-full bg-gray-200 animate-pulse" />
            </div>
        );
    }

    return (
        <div>
            <div className="pt-2 pl-4 ml-5">
                <p className="text-lg font-semibold text-gray-900">Avatar</p>
                <p className="text-md text-gray-500">Elige una foto profesional para tu perfil</p>
            </div>

            <div className="flex">
                <div className="px-4 py-4 ml-5">
                    <label className="group relative">
                        <div className="relative h-55 w-80 bg-gray-100 overflow-hidden shadow-[0_2px_6px_hsla(0,0%,0%,.12)]">
                            {avatarSrc ? (
                                <img className="h-full w-full " src={avatarSrc} />
                            ) : (
                                <Avatar className="h-45 w-45 mt-5 ml-18">
                                    <AvatarImage src={user.name} />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-7xl font-medium">{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    </label>
                </div>

                <div className="pt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1/12">
                            <p className="mt-1 text-lg text-gray-500">
                                Te recomendamos que utilices una imagen de 98x98 píxeles <br />
                                y 4 MB como máximo. Usa un archivo PNG o GIF (no animado). Asegúrate <br />
                                de que la imagen cumple con estas caracteristicas.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 px-4 flex gap-2">
                        <button
                            type="button"
                            disabled={!user?.avatarUrl || uploading}
                            className="inline-flex items-center justify-center rounded-full bg-gray-100 px-6 py-3
                         text-base font-semibold text-black hover:bg-gray-300 transition cursor-pointer
                         disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                            onClick={onRemoveAvatar}
                        >
                            Quitar
                        </button>

                        <input id="avatar-upload" type="file" accept="image/png,image/gif,image/jpeg" onChange={onAvatarUpload} disabled={uploading} className="hidden" />
                        <label
                            htmlFor="avatar-upload"
                            className="inline-flex items-center justify-center rounded-full bg-gray-100 px-6 py-3
                            text-base font-semibold text-black hover:bg-gray-300 transition cursor-pointer
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {avatarSrc ? "Cambiar" : "Subir"}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarPhoto;
