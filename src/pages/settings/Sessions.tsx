import { SessionItem } from "@/components/settings/session-item";
import { useEffect, useState } from "react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import type { SessionDto } from "@/common/utils/sessionDetect";
import { ModalDeleteSessions } from "@/components/settings/modal-delete-sessions";
import { revokeAllSessionsLessMe, revokeSession, findSessionsMe } from "@/services/sessionService";
import { verifyPassword } from '@/services/userService'
import { useForm } from "react-hook-form"
import { TextField } from "@mui/material";
import { Trash2 } from "lucide-react";

const Sessions = () => {
    const { showFlash, clearFlash } = useFlashMessage();
    const [sessions, setSessions] = useState<SessionDto[]>([]);
    const [ openModal, setOpenModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [oneSession, setOneSession] = useState(false);
    const [selectedSession, setSelectedSession] = useState("");
    
    type FormValues = { password: string };
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>();


    const verifyPasswordPass = async(data:FormValues)=>{
        clearFlash();
        setSubmitting(true);
        try {
            const res = await verifyPassword({
                currentPassword: data.password
            });
            if (res?.pass === true) {
                reset({
                    password: "",
                });
                oneSession ? revokeOneSession() : revokeSessionsLessMe();
            } else {
                showFlash(errorResponse("Contraseña incorrecta"));
            }
        } catch{
            showFlash(errorResponse("Error al verificar contraseña"));
        }
        setSubmitting(false);
    }
    const sessionsRecords = async () => {
        clearFlash();
        try {
        const res = await findSessionsMe();
        setSessions(res);
        } catch {
            showFlash(errorResponse("Error al ver sessiones"));
        }
    };

    const revokeSessionsLessMe = async () => {
        clearFlash();
        try {
        const res = await revokeAllSessionsLessMe();
         if (res?.revoked === true) {
             showFlash(successResponse("Sesiones cerradas correctamente"));
             sessionsRecords();
             setOpenModal(false);
         } else {
             showFlash(errorResponse("No se pudieron cerrar las sesiones"));
         }
        } catch {
            showFlash(errorResponse("Error al ver sessiones"));
        }
    };
    const revokeOneSession = async () => {
        clearFlash();
        if (!selectedSession) {
            showFlash(errorResponse("User id is missing."));
            return;
        }
        try {
            const res = await revokeSession(selectedSession);
            if (res?.revoked === true) {
                showFlash(successResponse("Sesión cerrada correctamente"));
                sessionsRecords();
                setOpenModal(false);
         } else {
             showFlash(errorResponse("No se pudieron cerrar las sesiones"));
         }
        } catch {
            showFlash(errorResponse("Error al ver sessiones"));
        }
    };
    useEffect(() => {
        console.log("useEffect fired");
        (async () => {
            await sessionsRecords();
        })();
    }, []);

    return (
        <div className="h-full w-full flex items-start justify-start bg-slate-50 p-6 overflow-scroll">
            <div className="w-full mt-10 max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-200 px-6 py-4">
                    <div className="grid grid-cols-2">
                        <h2 className="text-lg font-semibold text-slate-900">Sesiones activas</h2>
                        <button
                            className={`
                                hidden sm:flex items-center justify-center
                                h-10 px-4 rounded-lg
                                bg-slate-50 border border-slate-200
                                font-medium cursor-pointer
                                transition
                                hover:scale-[1.02] hover:bg-red-400 hover:text-white
                                disabled:opacity-50
                                disabled:cursor-not-allowed
                                disabled:hover:scale-100
                                disabled:hover:bg-slate-50
                                disabled:hover:text-inherit
                                `}
                            onClick={() => {
                                setOneSession(false);
                                setOpenModal(true);
                            }}
                            disabled={sessions.length === 1}
                        >
                            Eliminar sessiones
                        </button>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Revisa dónde tienes tu cuenta abierta.</p>
                </div>
                <div className="px-6 py-5 space-y-3">
                    {sessions.map((s) => (
                        <SessionItem key={s.id} session={s}>
                            <div className="flex items-center gap-2">
                                {s.isCurrent ? (
                                    <div className="hidden sm:flex items-center justify-center h-10 w-15 px-2 rounded-lg bg-slate-50 border border-slate-200">
                                        <p className="text-slate-500 text-sm">Actual</p>
                                    </div>
                                ) : (
                                    <div
                                        className="hidden sm:flex items-center justify-center h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 hover:scale-[1.02]
                                    cursor-pointer  hover:bg-red-400 hover:text-white text-red-600"
                                        onClick={() => {
                                            setOneSession(true);
                                            setOpenModal(true);
                                            setSelectedSession(s.id);
                                        }}
                                    >
                                        <Trash2 className="" size={25} />
                                    </div>
                                )}
                            </div>
                        </SessionItem>
                    ))}
                </div>
            </div>
            {openModal && (
                <ModalDeleteSessions onClose={() => setOpenModal(false)} title={oneSession ? "Esta seguro de cerrar la sesión " : "Esta seguro de cerrar todas tus sessiones"}>
                    <p className="mt-0 text-slate-500">{oneSession ? "Esto cerrará la sesión" : "Esto cerrará todas tus sesiones activas en otros dispositivos."}</p>
                    <form className="mt-2" onSubmit={handleSubmit(verifyPasswordPass)}>
                        <TextField
                            label="Ingrese contraseña"
                            placeholder="********"
                            type="password"
                            size="small"
                            fullWidth
                            error={!!errors.password}
                            helperText={errors.password && "La contraseña es obligatoria"}
                            {...register("password", {
                                required: "La contraseña es obligatoria",
                            })}
                        />
                        <hr />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                className="px-3 py-1 text-sm text-slate-600 rounded-md hover:scale-[1.02]
                                cursor-pointer bg-gray-200"
                                onClick={() => setOpenModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white 
                                cursor-pointer hover:scale-[1.02]"
                                type="submit"
                                disabled={submitting}
                            >
                                {submitting ? "Cerrando..." : oneSession ? "Cerrar sesión" : "Cerrar sesiones"}
                            </button>
                        </div>
                    </form>
                </ModalDeleteSessions>
            )}
        </div>
    );
};

export default Sessions;
