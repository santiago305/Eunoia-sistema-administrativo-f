import { SystemButton} from "@/components/SystemButton";
import type { SessionsDeviceCardProps } from "../types/components.types";

const SessionsDeviceCard = ({ session, revokingId, onRevoke, onOpenDetails }: SessionsDeviceCardProps) => {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-md transition hover:shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold truncate">{session.deviceName}</p>
            {session.isCurrent && (
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-[#E6F0FA] text-[#145DA0]">
                <span className="h-2 w-2 rounded-full bg-[#145DA0]" />
                Sesion actual
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-black/50">
            {session.browser} · {session.os}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-black/60">
            <span className="rounded-full bg-black/5 px-2 py-1">
              Ultima actividad: <span className="text-black">{session.lastActive}</span>
            </span>
            {session.ip && <span className="rounded-full bg-black/5 px-2 py-1">IP: {session.ip}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          <SystemButton
            disabled={session.isCurrent || revokingId === session.id}
            onClick={() => onRevoke(session.id)}
            variant="outline"
            className={[
              "text-sm font-medium border transition",
              session.isCurrent
                ? "border-black/10 text-black/40 cursor-not-allowed bg-black/5"
                : "border-black/15 text-black hover:bg-black/5",
            ].join(" ")}
          >
            {session.isCurrent ? "Estas aqui" : "Cerrar"}
          </SystemButton>
          <SystemButton
            onClick={() => onOpenDetails(session)}
            variant="outline"
            className="text-sm font-medium hover:bg-black/5 transition"
            title="Ver detalles"
          >
            Detalles
          </SystemButton>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-black/60">Navegador</p>
            <p>{session.browser}</p>
          </div>
          <div>
            <p className="text-xs text-black/60">Sistema</p>
            <p>{session.os}</p>
          </div>
          <div>
            <p className="text-xs text-black/60">Estado</p>
            <p>{session.isCurrent ? "Activa (actual)" : "Activa"}</p>
          </div>
          <div>
            <p className="text-xs text-black/60">Creada</p>
            <p>{session.createdAt}</p>
          </div>
          <div>
            <p className="text-xs text-black/60">Expira</p>
            <p>{session.expiresAt}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-black/50">
          La ubicacion es aproximada. Si no reconoces esta sesion, cierrala y cambia tu contrasena.
        </p>
      </div>
    </div>
  );
};

export default SessionsDeviceCard;


