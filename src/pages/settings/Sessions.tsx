import { SessionItem } from "@/components/settings/session-item";
import { useCallback, useEffect, useState } from "react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import type { SessionDto } from "@/common/utils/sessionDetect";
import { Modal } from "@/components/settings/modal";
import { revokeAllSessionsLessMe, revokeSession, findSessionsMe } from "@/services/sessionService";
import { verifyPassword } from "@/services/userService";
import { useForm } from "react-hook-form";
import { TextField } from "@mui/material";
import { Trash2 } from "lucide-react";

const Sessions = () => {
  const { showFlash, clearFlash } = useFlashMessage();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [openModal, setOpenModal] = useState(false);
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

  const sessionsRecords = useCallback(async () => {
    clearFlash();
    try {
      const res = await findSessionsMe();
      setSessions(res);
    } catch {
      showFlash(errorResponse("Error al ver sesiones"));
    }
  }, [clearFlash, showFlash]);

  const revokeSessionsAll = async () => {
    clearFlash();
    try {
      const res = await revokeAllSessionsLessMe();
      if (res?.message) {
        showFlash(successResponse(res.message));
        await sessionsRecords();
        setOpenModal(false);
      } else {
        showFlash(errorResponse("No se pudieron cerrar las sesiones"));
      }
    } catch {
      showFlash(errorResponse("Error al cerrar sesiones"));
    }
  };

  const revokeOneSession = async () => {
    clearFlash();
    if (!selectedSession) {
      showFlash(errorResponse("Session id faltante"));
      return;
    }
    try {
      const res = await revokeSession(selectedSession);
      if (res?.message) {
        showFlash(successResponse(res.message));
        await sessionsRecords();
        setOpenModal(false);
      } else {
        showFlash(errorResponse("No se pudo cerrar la sesion"));
      }
    } catch {
      showFlash(errorResponse("Error al cerrar sesion"));
    }
  };

  const verifyPasswordPass = async (data: FormValues) => {
    clearFlash();
    setSubmitting(true);
    try {
      const res = await verifyPassword({ currentPassword: data.password });
      if (res?.pass === true) {
        reset({ password: "" });
        if (oneSession) {
          await revokeOneSession();
        } else {
          await revokeSessionsAll();
        }
      } else {
        showFlash(errorResponse("Contrasena incorrecta"));
      }
    } catch {
      showFlash(errorResponse("Error al verificar contrasena"));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void sessionsRecords();
  }, [sessionsRecords]);

  return (
    <div className="page-shell flex items-start justify-center">
      <div className="page-card">
        <div className="page-card-header">
          <div className="grid grid-cols-2">
            <h2 className="page-card-title">Sesiones activas</h2>
            <button
              className="
                hidden sm:flex items-center justify-center
                h-10 px-4 rounded-lg
                bg-slate-50 border border-slate-200
                font-medium cursor-pointer
                transition
                hover:scale-[1.02] hover:bg-red-400 hover:text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:scale-100 disabled:hover:bg-slate-50 disabled:hover:text-inherit
              "
              onClick={() => {
                setOneSession(false);
                setOpenModal(true);
              }}
              disabled={sessions.length <= 1}
            >
              Eliminar sesiones
            </button>
          </div>
          <p className="page-card-subtitle">Revisa donde tienes tu cuenta abierta.</p>
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
                    className="hidden sm:flex items-center justify-center h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 hover:scale-[1.02] cursor-pointer hover:bg-red-400 hover:text-white text-red-600"
                    onClick={() => {
                      setOneSession(true);
                      setOpenModal(true);
                      setSelectedSession(s.id);
                    }}
                  >
                    <Trash2 size={25} />
                  </div>
                )}
              </div>
            </SessionItem>
          ))}
        </div>
      </div>

      {openModal && (
        <Modal
          onClose={() => setOpenModal(false)}
          title={oneSession ? "Seguro de cerrar la sesion?" : "Seguro de cerrar todas tus sesiones?"}
        >
          <p className="mt-0 text-slate-500">
            {oneSession ? "Esto cerrara la sesion seleccionada." : "Esto cerrara todas tus sesiones activas."}
          </p>
          <form className="mt-2" onSubmit={handleSubmit(verifyPasswordPass)}>
            <TextField
              label="Ingresa contrasena"
              placeholder="********"
              type="password"
              size="small"
              fullWidth
              error={!!errors.password}
              helperText={errors.password && "La contrasena es obligatoria"}
              {...register("password", { required: "La contrasena es obligatoria" })}
            />
            <hr />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1 text-sm text-slate-600 rounded-md hover:scale-[1.02] cursor-pointer bg-gray-200"
                onClick={() => setOpenModal(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white cursor-pointer hover:scale-[1.02]"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Cerrando..." : oneSession ? "Cerrar sesion" : "Cerrar sesiones"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Sessions;
