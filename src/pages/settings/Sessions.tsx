import { SessionItem } from "@/components/settings/session-item";
import { useEffect, useState } from "react";
import { findSessionsMe } from "@/services/sessionService";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse } from "@/common/utils/response";
import type { SessionDto } from "@/common/utils/sessionDetect";

const Sessions = () => {
     const [sessions, setSessions] = useState<SessionDto[]>([]);
     const { showFlash, clearFlash } = useFlashMessage();

     const sessionsRecords = async () => {
         clearFlash();
         try {
            const res = await findSessionsMe();
            setSessions(res);
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
                    <h2 className="text-lg font-semibold text-slate-900">Sesiones activas</h2>
                    <p className="mt-1 text-sm text-slate-500">Revisa dónde tienes tu cuenta abierta.</p>
                </div>

                <div className="px-6 py-5 space-y-3">
                    {sessions.map((s) => (
                        <SessionItem key={s.id} session={s} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sessions;
