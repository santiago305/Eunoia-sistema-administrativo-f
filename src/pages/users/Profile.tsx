import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { PageTitle } from "@/components/PageTitle";
import { useAuth } from "@/hooks/useAuth";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, infoResponse, successResponse } from "@/common/utils/response";
import {
  changeMyPassword,
  findOwnUser,
  removeMyAvatar,
  updateMyAvatar,
  updateOwnUser,
} from "@/services/userService";
import type { CurrentUser } from "@/types/userProfile";
import {
  PasswordFormValues,
  ProfileFormValues,
  ProfileInfoFormCard,
  ProfilePasswordFormCard,
  ProfileSidebarCard,
  normalizeUser,
  parseChangePasswordError,
  passwordSchema,
  profileSchema,
  resolveProfileAvatarUrl,
} from "@/pages/users/components/profile";

export default function ProfilePage() {
  const { userId } = useAuth();
  const { showFlash, clearFlash } = useFlashMessage();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      telefono: "",
    },
    mode: "onTouched",
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    mode: "onTouched",
  });

  const avatarUrl = useMemo(() => resolveProfileAvatarUrl(user?.avatarUrl), [user?.avatarUrl]);
  const displayName = useMemo(() => user?.name ?? "Usuario", [user]);

  const getUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await findOwnUser();
      const currentUser = normalizeUser(res);
      setUser(currentUser);
      profileForm.reset({
        name: currentUser.name ?? "",
        telefono: currentUser.telefono ?? "",
      });
    } catch {
      showFlash(errorResponse("Error al cargar el perfil"));
    } finally {
      setLoading(false);
    }
  }, [profileForm, showFlash]);

  useEffect(() => {
    void getUser();
  }, [getUser]);

  const onSubmitProfile = profileForm.handleSubmit(async (values) => {
    clearFlash();
    setSavingProfile(true);
    try {
      const payload: { name?: string; telefono?: string } = {};
      const nextName = values.name.trim();
      const nextTelefono = (values.telefono ?? "").trim();

      if (nextName !== (user?.name ?? "")) payload.name = nextName;
      if (nextTelefono !== (user?.telefono ?? "")) payload.telefono = nextTelefono;

      if (Object.keys(payload).length === 0) {
        showFlash(infoResponse("No hay cambios para guardar"));
        return;
      }

      const res = await updateOwnUser(payload);
      showFlash(successResponse(res.message || "Perfil actualizado"));
      await getUser();
    } catch {
      showFlash(errorResponse("No se pudo actualizar el perfil"));
    } finally {
      setSavingProfile(false);
    }
  });

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    clearFlash();
    passwordForm.clearErrors(["currentPassword", "newPassword"]);
    setSavingPassword(true);
    try {
      const res = await changeMyPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      showFlash(successResponse(res.message || "Contrasena actualizada correctamente"));
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      const parsed = parseChangePasswordError(error);
      if (parsed.fieldErrors.currentPassword) {
        passwordForm.setError("currentPassword", {
          type: "server",
          message: parsed.fieldErrors.currentPassword,
        });
      }
      if (parsed.fieldErrors.newPassword) {
        passwordForm.setError("newPassword", {
          type: "server",
          message: parsed.fieldErrors.newPassword,
        });
      }
      showFlash(errorResponse(parsed.message));
    } finally {
      setSavingPassword(false);
    }
  });

  const onPickAvatar = async (file: File) => {
    clearFlash();
    setSavingAvatar(true);
    try {
      await updateMyAvatar(file);
      showFlash(successResponse("Foto actualizada"));
      await getUser();
    } catch {
      showFlash(errorResponse("No se pudo actualizar la foto"));
    } finally {
      setSavingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    clearFlash();
    setSavingAvatar(true);
    try {
      await removeMyAvatar();
      showFlash(successResponse("Foto eliminada"));
      await getUser();
    } catch {
      showFlash(errorResponse("No se pudo eliminar la foto"));
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <PageTitle title="Perfil" />

      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:max-w-[1280px] lg:px-8 2xl:max-w-[1600px] 2xl:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Personalizar tu perfil</h1>
          <p className="text-sm text-black/60">
            Edita tu informacion, actualiza tu foto y manten tu cuenta segura.
          </p>
        </motion.div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4"
          >
            <ProfileSidebarCard
              loading={loading}
              displayName={displayName}
              avatarUrl={avatarUrl}
              user={user}
              savingAvatar={savingAvatar}
              onPickAvatar={onPickAvatar}
              onRemoveAvatar={onRemoveAvatar}
            />
          </motion.section>

          <div className="space-y-6 lg:col-span-8">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <ProfileInfoFormCard
                form={profileForm}
                onSubmit={onSubmitProfile}
                saving={savingProfile}
                loading={loading}
                hasSession={Boolean(userId)}
              />
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ProfilePasswordFormCard
                form={passwordForm}
                onSubmit={onSubmitPassword}
                saving={savingPassword}
                loading={loading}
              />
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
