
﻿import Avatar from "@/components/users/avatar";
import ProfileForm from "@/pages/users/components/profile-form-settings";
import ModalVerifyPassword from "@/components/users/modalVerifyPassword";
import { useCallback, useState } from "react";
import { changePassword } from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";

type PendingUpdate = { password: string };

export default function SettingsUnifiedFull() {
    const { userId } = useAuth();
    const { showFlash, clearFlash } = useFlashMessage();
    const [openModal, setOpenModal] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
    const [saving, setSaving] = useState(false);

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
        }
    }, [userId, pendingUpdate, clearFlash, showFlash]);

    return (
        <div className="h-screen w-screen bg-white text-black">
            <div className="relative px-10 py-4 border-b border-black/10">
                <h1 className="text-3xl font-semibold text-gray-700">Personalizar tu perfil</h1>
            </div>

            <Avatar />

            <ProfileForm onRequestVerify={requestVerify} />

            <ModalVerifyPassword open={openModal} onClose={closeModal} onVerified={applyPendingUpdate} submitting={saving} />
        </div>
    );
}
