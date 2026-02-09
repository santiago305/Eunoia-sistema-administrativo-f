
﻿import AvatarPhoto from "@/pages/users/components/profile/avatar";
import { PageTitle } from "@/components/PageTitle";
import ProfileForm from "@/pages/users/components/profile/profile-form-settings";
import ModalVerifyPassword from "@/pages/users/components/profile/modalVerifyPassword";
import { useCallback, useEffect, useState } from "react";
import { changePassword } from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { UpdateUserDto } from "@/types/user";
import { findOwnUser } from "@/services/userService";


type PendingUpdate = { password: string };


export default function Profile() {
    const { userId } = useAuth();
    const { showFlash, clearFlash } = useFlashMessage();
    const [openModal, setOpenModal] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<UpdateUserDto>();

    const requestVerify = useCallback((password: string) => {
        setPendingUpdate({ password });
        setOpenModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setOpenModal(false);
    }, []);

    const applyPendingUpdate = useCallback(async (currentPassword:string) => {
        if (!userId || !pendingUpdate) return;

        clearFlash();
        setSaving(true);
        try {
            await changePassword(userId, {
                currentPassword: currentPassword,
                newPassword: pendingUpdate.password,
            });
            showFlash(successResponse("Campo actualizado correctamente"));
            setOpenModal(false);
            setPendingUpdate(null);
        } catch {
            showFlash(errorResponse("Error al actualizar datos"));
        } finally {
            setSaving(false);
            getUser();
        }
    }, [userId, pendingUpdate, clearFlash, showFlash]);

        const getUser = useCallback(async () => {
            try {
                const res = await findOwnUser();
                setUser(res.data);
            } catch {
                showFlash(errorResponse("Error al cargar usuario"));
            }
        }, [showFlash]);

        useEffect(() => {
            getUser();
        }, [getUser]);

    return (
        <div className="h-screen w-screen bg-white text-black overflow-hidden">
            <PageTitle title="Perfil" />
            <div className="relative px-10 py-4 border-b border-black/10">
                <h1 className="text-3xl font-semibold text-gray-700">Personalizar tu perfil</h1>
            </div>

            <AvatarPhoto getUser={getUser} user={user} />

            <ProfileForm getUser={getUser} user={user} onRequestVerify={requestVerify} />

            <ModalVerifyPassword open={openModal} onClose={closeModal} onVerified={applyPendingUpdate} submitting={saving} />
        </div>
    );
}
