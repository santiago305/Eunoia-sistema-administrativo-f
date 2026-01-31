import { useForm } from "react-hook-form";
import { ChangePasswordType } from "@/types/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangePasswordSchema } from "@/schemas/authSchemas";
import { Box, Button, TextField } from "@mui/material";
import { useState } from "react";
import { changePassword } from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";

const ChangePassword = ({ embedded = false }: { embedded?: boolean }) => {
    const [submitting, setSubmitting] = useState(false);
    const { userId } = useAuth();
    const { showFlash, clearFlash } = useFlashMessage();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ChangePasswordType>({
        resolver: zodResolver(ChangePasswordSchema),
    });

    const Submit = async (data: ChangePasswordType) => {
        clearFlash();
        if (!userId) {
            showFlash(errorResponse("No se pudo identificar el usuario"));
            return;
        }
        setSubmitting(true);
        try {
            await changePassword(userId, {
                currentPassword: data.password,
                newPassword: data.newPassword,
            });
            reset({
                password: "",
                newPassword: "",
            });
            showFlash(successResponse("Contraseña actualizada correctamente"));
        } catch (error: any) {
            const message: string | undefined = error?.response?.data?.message || "No se pudo actualizar la contraseña";
            showFlash(errorResponse(message));
        } finally {
            setSubmitting(false);
        }
    };

    const content = (
        <div className="page-card">
            <div className="page-card-header">
                <h2 className="page-card-title">Cambiar contraseña</h2>
                <p className="page-card-subtitle">Mantén tu cuenta segura actualizando tu clave.</p>
            </div>
            <div className="px-6 py-5">
                <form onSubmit={handleSubmit(Submit)} className="grid gap-4">
                    <TextField
                        label="Contraseña"
                        placeholder="********"
                        type="password"
                        size="small"
                        fullWidth
                        {...register("password")}
                        error={!!errors.password}
                        helperText={errors.password?.message}
                    />
                    <TextField
                        label="Nueva contraseña"
                        placeholder="********"
                        type="password"
                        size="small"
                        fullWidth
                        {...register("newPassword")}
                        error={!!errors.newPassword}
                        helperText={errors.newPassword?.message}
                    />

                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                        <Button
                            className="w-50"
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                            sx={{ textTransform: "none", color: "white", backgroundColor: "#009578", width: "100%" }}
                        >
                            {submitting ? "Guardando..." : "Guardar"}
                        </Button>
                    </Box>
                </form>
            </div>
        </div>
    );

    if (embedded) return content;

    return <div className="page-shell flex items-start justify-center">{content}</div>;
};

export default ChangePassword;
