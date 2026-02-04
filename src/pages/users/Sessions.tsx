import { useCallback, useEffect, useMemo, useState } from "react";
import SessionsDeviceCard from "./components/sessions/SessionsDeviceCard";
import SessionsHeader from "./components/sessions/SessionsHeader";
import SessionsQuickActions from "./components/sessions/SessionsQuickActions";
import SessionsSecurityTip from "./components/sessions/SessionsSecurityTip";
import SessionsSummaryCard from "./components/sessions/SessionsSummaryCard";
import type { Session } from "./components/sessions/types";
import { findSessions, revokeAllSessions, revokeSession } from "@/services/sessionService";
import type { SessionApiDto } from "@/types/session";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { Modal } from "@/components/settings/modal";

const securityTips = [
  "Si notas actividad extrana, cierra las sesiones y cambia tu contrasena.",
  "Si no reconoces un acceso, cierralo y cambia tu contrasena.",
  "Protege tu cuenta: revisa tus sesiones activas con frecuencia.",
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const detectBrowser = (ua: string) => {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Chrome\//i.test(ua)) return "Chrome";
  return "Desconocido";
};

const detectOS = (ua: string) => {
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Desconocido";
};

const mapSessionToUi = (session: SessionApiDto): Session => {
  const ua = session.userAgent ?? "";
  return {
    id: session.id,
    deviceName: session.deviceName || "Dispositivo",
    browser: detectBrowser(ua),
    os: detectOS(ua),
    ip: session.ip ?? undefined,
    userAgent: session.userAgent ?? undefined,
    lastActive: formatDate(session.lastUsedAt),
    createdAt: formatDate(session.createdAt),
    expiresAt: formatDate(session.expiresAt),
    isCurrent: session.isCurrent,
  };
};

export default function SessionsUsers() {
  const { showFlash, clearFlash } = useFlashMessage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailsSession, setDetailsSession] = useState<Session | null>(null);

  const randomTip = useMemo(() => {
    const index = Math.floor(Math.random() * securityTips.length);
    return securityTips[index];
  }, []);

  const loadSessions = useCallback(async () => {
    clearFlash();
    setLoading(true);
    try {
      const result = await findSessions();
      const sorted = [...result].sort(
        (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
      );
      setSessions(sorted.map(mapSessionToUi));
    } catch {
      showFlash(errorResponse("No se pudieron cargar las sesiones"));
    } finally {
      setLoading(false);
    }
  }, [clearFlash, showFlash]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const onRevoke = async (id: string) => {
    clearFlash();
    try {
      setRevokingId(id);
      console.log("[sessions] revoke one -> start", { sessionId: id });
      const res = await revokeSession(id);
      console.log("[sessions] revoke one -> success", { sessionId: id, response: res });
      showFlash(successResponse(res.message || "Sesion cerrada"));
      await loadSessions();
    } catch {
      console.log("[sessions] revoke one -> error", { sessionId: id });
      showFlash(errorResponse("No se pudo cerrar la sesion"));
    } finally {
      setRevokingId(null);
    }
  };

  const onRevokeAll = async () => {
    clearFlash();
    try {
      setRevokingAll(true);
      console.log("[sessions] revoke all -> start");
      const res = await revokeAllSessions();
      console.log("[sessions] revoke all -> success", { response: res });
      showFlash(successResponse(res.message || "Todas las sesiones cerradas"));
      await loadSessions();
    } catch {
      console.log("[sessions] revoke all -> error");
      showFlash(errorResponse("No se pudieron cerrar las sesiones"));
    } finally {
      setRevokingAll(false);
    }
  };

  const activeCount = sessions.length;
  const otherCount = sessions.filter((session) => !session.isCurrent).length;
  const canCloseDetailsSession = Boolean(detailsSession && !detailsSession.isCurrent);

  const closeDetailsSession = async () => {
    if (!detailsSession || detailsSession.isCurrent) return;
    await onRevoke(detailsSession.id);
    setDetailsSession(null);
  };

  return (
    <div className="w-full h-full min-h-screen bg-white text-black">
      <SessionsHeader
        title="Sesiones activas"
        subtitle="Revisa donde esta abierta tu cuenta y cierra accesos que no reconozcas."
      />

      <div className="w-full px-6 py-6 space-y-6">
        <div className="w-full flex flex-col lg:flex-row gap-4">
          <SessionsSummaryCard activeCount={activeCount} otherCount={otherCount} />
          <SessionsQuickActions totalCount={activeCount} revokingAll={revokingAll} onRevokeAll={onRevokeAll} />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Dispositivos</h2>
            <div className="text-xs text-black/60">Ultima actividad aproximada</div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-black/60">Cargando sesiones...</div>
          ) : sessions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/60">
              No hay sesiones activas.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <SessionsDeviceCard
                  key={s.id}
                  session={s}
                  revokingId={revokingId}
                  onRevoke={onRevoke}
                  onOpenDetails={setDetailsSession}
                />
              ))}
            </div>
          )}
        </div>

        {sessions.length > 1 && <SessionsSecurityTip tip={randomTip} />}
      </div>

      {detailsSession && (
        <Modal onClose={() => setDetailsSession(null)} title="Detalle de sesion" className="max-w-lg">
          <div className="space-y-2">
            <p><span className="font-semibold">Dispositivo:</span> {detailsSession.deviceName}</p>
            <p><span className="font-semibold">Navegador:</span> {detailsSession.browser}</p>
            <p><span className="font-semibold">Sistema:</span> {detailsSession.os}</p>
            <p><span className="font-semibold">IP:</span> {detailsSession.ip || "No disponible"}</p>
            <p><span className="font-semibold">Creada:</span> {detailsSession.createdAt}</p>
            <p><span className="font-semibold">Ultimo uso:</span> {detailsSession.lastActive}</p>
            <p><span className="font-semibold">Expira:</span> {detailsSession.expiresAt}</p>
            <p><span className="font-semibold">User Agent:</span> {detailsSession.userAgent || "No disponible"}</p>
            <p><span className="font-semibold">Estado:</span> {detailsSession.isCurrent ? "Sesion actual" : "Sesion activa"}</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDetailsSession(null)}
              className="px-3 py-1 text-sm rounded-md bg-gray-200 hover:scale-[1.02] transition"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={!canCloseDetailsSession || revokingId === detailsSession.id}
              onClick={() => void closeDetailsSession()}
              className={[
                "px-3 py-1 text-sm rounded-md text-white transition",
                canCloseDetailsSession ? "bg-red-600 hover:scale-[1.02]" : "bg-gray-300 cursor-not-allowed",
              ].join(" ")}
            >
              {revokingId === detailsSession.id ? "Cerrando..." : "Cerrar sesion"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
