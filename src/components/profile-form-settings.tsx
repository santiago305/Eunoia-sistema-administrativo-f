import { profileByElementId, inputChangeFocus } from "@/utils/profileByIdElement";
import { updateAvatar, updateUser } from "@/services/userService";
import Img from '../assets/images/perfil.png'
import { errorResponse, successResponse } from "@/common/utils/response";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useUserDetails } from "@/hooks/useUserDetails";
import { updateUserSchema } from '@/schemas/userSchemas';
import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import './profile-form-settings.css'
import { useEffect, type ChangeEvent } from 'react';


const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const ProfileForm = () => {
    const { userDetails, refetchUserDetails } = useUserDetails();
    const { showFlash, clearFlash } = useFlashMessage();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        } = useForm({
        resolver: zodResolver(updateUserSchema),
        mode: "onSubmit",
        defaultValues: {
            name: userDetails?.data?.name ?? "",
            email: userDetails?.data?.email ?? "",
        },
    });
    const onSubmit = async (data:any) => {
        clearFlash();
        const userId = userDetails?.data?.id;
        if (!userId) {
            showFlash(errorResponse("User id is missing."));
            return;
        }
        try {
            const res = await updateUser(userId, data);
            await refetchUserDetails();
            showFlash(successResponse(res?.message ?? "Profile updated successfully."));
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update profile.";
            showFlash(errorResponse(message));
        }
    };
    useEffect(() => {
        if (!userDetails?.data) return;
        reset({
            name: userDetails.data.name ?? "",
            email: userDetails.data.email ?? "",
            avatarUrl: userDetails.data.avatarUrl ?? "",
        });
    }, [userDetails, reset]);

    const editInput = (id: string) => {
        profileByElementId(id);
    };
    const changeFocus = (id: string)  => {
        inputChangeFocus(id);
    };
    const { onChange: avatarRHFOnChange, ...avatarRegister } = register("avatarUrl");
    const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
        avatarRHFOnChange(event);
        const avatar = event.target.files?.[0];
        if (!avatar) return;
        clearFlash();
        const userId = userDetails?.data?.id;
        if (!userId) {
            showFlash(errorResponse("User id is missing."));
            return;
        }
        try {
            const res = await updateAvatar(userId, avatar);
            await refetchUserDetails();
            showFlash(successResponse(res?.message ?? "Profile updated successfully."));
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update profile.";
            showFlash(errorResponse(message));
        } finally {
            event.target.value = "";
        }
    };
    const raw = userDetails?.data?.avatarUrl; 
    const avatarSrc = raw ? `${API_BASE_URL}${raw.replace("/assets/", "/api/assets/")}` : Img;
    return (
        <div className="container__profile">
            <header className="header__profile">
                <div className="avatar-upload flex justify-center ">
                    <input id="avatarUrl" type="file" accept="image/*" className="avatar-input" {...avatarRegister} onChange={onAvatarChange} />
                    <label htmlFor="avatarUrl" className="avatar-label">
                        <img src={avatarSrc} alt="Avatar" className="img__profile" />
                        <span className="avatar-overlay">
                            <span className="avatar-overlay-text">Subir foto</span>
                        </span>
                    </label>
                </div>
                <hr />
            </header>
            <div className="card__profile">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="form__container mt-5">
                        <label className="form__label">Name</label>
                        <input
                            type="text"
                            className="form__input"
                            id="name"
                            {...register("name")}
                            disabled
                            onBlur={() => {
                                changeFocus("name");
                                handleSubmit(onSubmit)();
                            }}
                        />
                        {errors.name && <span>{errors.name.message}</span>}
                        <button type="button" className="form__icon-button" aria-label="Edit email" onClick={() => editInput("name")}>
                            <IconEdit />
                        </button>
                    </div>
                    <div className="form__container">
                        <label className="form__label">Email</label>
                        <input
                            type="email"
                            className="form__email"
                            id="email"
                            {...register("email")}
                            disabled
                            onBlur={() => {
                                changeFocus("email");
                                handleSubmit(onSubmit)();
                            }}
                        />
                        {errors.email && <span>{errors.email.message}</span>}
                        <button type="button" className="form__icon-button" aria-label="Edit email" onClick={() => editInput("email")}>
                            <IconEdit />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProfileForm
