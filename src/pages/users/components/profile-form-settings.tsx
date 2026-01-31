import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit } from "@tabler/icons-react";

import { updateAvatar, updateUser } from "@/services/userService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { useUserDetails } from "@/hooks/useUserDetails";
import { updateUserSchema } from "@/schemas/userSchemas";
import { errorResponse, successResponse } from "@/common/utils/response";

import Img from "@/assets/react.svg";
import "./profile-form-settings.css";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type UpdateUserForm = {
  name: string;
  email: string;
};

const ProfileForm = () => {
  const { userDetails, refetchUserDetails } = useUserDetails();
  const { showFlash, clearFlash } = useFlashMessage();

  const user = userDetails?.data;
  const userId = user?.id;

  const [editable, setEditable] = useState<{ name: boolean; email: boolean }>({
    name: false,
    email: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    mode: "onSubmit",
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      name: user.name ?? "",
      email: user.email ?? "",
    });
    setEditable({ name: false, email: false });
  }, [userId, reset]);

  const onSubmit = async (data: UpdateUserForm) => {
    clearFlash();
    if (!userId) {
      showFlash(errorResponse("User id is missing."));
      return;
    }

    try {
      const res = await updateUser(userId, data);
      await refetchUserDetails();
      showFlash(successResponse(res?.message ?? "Profile updated successfully."));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile.";
      showFlash(errorResponse(message));
    }
  };

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const avatar = event.target.files?.[0];
    event.target.value = "";
    if (!avatar) return;

    clearFlash();
    if (!userId) {
      showFlash(errorResponse("User id is missing."));
      return;
    }

    try {
      const res = await updateAvatar(userId, avatar);
      await refetchUserDetails();
      showFlash(successResponse(res?.message ?? "Avatar updated successfully."));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update avatar.";
      showFlash(errorResponse(message));
    }
  };

  const avatarSrc = useMemo(() => {
    const raw = user?.avatarUrl;
    if (!raw) return Img;

    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

    const normalized = raw.startsWith("/api/assets/")
      ? raw
      : raw.replace("/assets/", "/api/assets/");

    return `${API_BASE_URL}${normalized}`;
  }, [user?.avatarUrl]);

  return (
    <div className="container__profile">
      <header className="header__profile">
        <div className="avatar-upload flex justify-center">
          <input
            id="avatarUrl"
            type="file"
            accept="image/*"
            className="avatar-input"
            onChange={onAvatarChange}
          />
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
              disabled={!editable.name}
            />
            {errors.name && <span>{String(errors.name.message)}</span>}
            <button
              type="button"
              className="form__icon-button"
              aria-label="Edit name"
              onClick={() => setEditable((p) => ({ ...p, name: !p.name }))}
            >
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
              disabled={!editable.email}
            />
            {errors.email && <span>{String(errors.email.message)}</span>}
            <button
              type="button"
              className="form__icon-button"
              aria-label="Edit email"
              onClick={() => setEditable((p) => ({ ...p, email: !p.email }))}
            >
              <IconEdit />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="btn-save"
              disabled={!isDirty || isSubmitting}
            >
              Guardar cambios
            </button>

            <button
              type="button"
              className="btn-cancel"
              onClick={() =>
                reset({ name: user?.name ?? "", email: user?.email ?? "" })
              }
              disabled={isSubmitting}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;
