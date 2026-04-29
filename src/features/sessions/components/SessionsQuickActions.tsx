
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { SessionsQuickActionsProps } from "../types/components.types";

const SessionsQuickActions = ({ totalCount, revokingAll, onRevokeAll }: SessionsQuickActionsProps) => {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm lg:w-[360px]">
      <p className="text-sm font-medium">Acciones rapidas</p>
      <p className="mt-1 text-sm text-black/60">Cierra todas tus sesiones activas.</p>

      <SystemButton
        onClick={onRevokeAll}
        fullWidth
        disabled={revokingAll || totalCount === 0}
        className={[
          "mt-4 text-sm font-medium transition",
          totalCount === 0 || revokingAll ? "bg-black/5 text-black/40 cursor-not-allowed" : "text-white",
        ].join(" ")}
        style={totalCount === 0 || revokingAll ? undefined : { backgroundColor: "hsl(var(--primary))" }}
      >
        {revokingAll ? "Cerrando sesiones..." : "Cerrar todas"}
      </SystemButton>

      <div className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-xs text-black/60">
        Si detectas actividad extrana, cierra sesiones y cambia tu contrasena.
      </div>
    </div>
  );
};

export default SessionsQuickActions;


