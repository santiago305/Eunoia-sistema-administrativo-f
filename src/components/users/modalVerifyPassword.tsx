import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { Modal } from "@/components/settings/modal";
import { verifyPassword } from "@/services/userService";
import { useForm } from "react-hook-form";
import { TextField } from "@mui/material";

type FormValues = { password: string };

type Props = {
    open: boolean;
    onClose: () => void;
    onVerified: (currentPassword: string) => void;
    submitting?: boolean;
};

export default function ModalVerifyPassword({ open, onClose, onVerified, submitting }: Props) {
    const { showFlash, clearFlash } = useFlashMessage();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>();

    const verifyPasswordPass = async (data: FormValues) => {
        clearFlash();
        try {
            const res = await verifyPassword({ currentPassword: data.password });

            if (res?.pass === true) {
                reset({ password: "" });
                showFlash(successResponse("Contraseña correcta"));
                onVerified(data.password); 
            } else {
                showFlash(errorResponse("Contraseña incorrecta"));
            }
        } catch {
            showFlash(errorResponse("Error al verificar contraseña"));
        }
    };

    if (!open) return null;

    return (
        <Modal onClose={onClose} title="Verificar contraseña">
            <p className="mt-0 text-slate-500">Es necesario validar su contraseña por su seguridad.</p>

            <form className="mt-4" onSubmit={handleSubmit(verifyPasswordPass)}>
                <TextField
                    label="Ingrese contraseña"
                    placeholder="********"
                    type="password"
                    size="small"
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    {...register("password", { required: "La contraseña es obligatoria" })}
                    sx={{
                        /* label */
                        "& label": {
                            color: "#4B5563", // gray-600
                        },
                        "& label.Mui-focused": {
                            color: "#374151", // gray-700
                        },

                        /* texto ingresado */
                        "& .MuiInputBase-input": {
                            color: "#4B5563",
                        },

                        /* quitar bordes */
                        "& .MuiOutlinedInput-root fieldset": {
                            border: "none",
                        },
                        "& .MuiOutlinedInput-root:hover fieldset": {
                            border: "none",
                        },
                        "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                            border: "none",
                        },

                        /* background */
                        "& .MuiOutlinedInput-root": {
                            backgroundColor: "#F3F4F6", // gray-100 (cámbialo si quieres)
                        },
                    }}
                />

                <hr />

                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" className="px-3 py-1 text-sm text-slate-600 rounded-md hover:scale-[1.02] cursor-pointer bg-gray-200" onClick={onClose}>
                        Cancelar
                    </button>

                    <button className="rounded-md bg-[#21b8a6] px-3 py-1 text-sm text-white cursor-pointer hover:scale-[1.02]" type="submit" disabled={!!submitting}>
                        {submitting ? "Guardando..." : "Validar"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
