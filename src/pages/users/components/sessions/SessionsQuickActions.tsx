interface SessionsQuickActionsProps {
  totalCount: number;
  revokingAll: boolean;
  onRevokeAll: () => void;
}

const SessionsQuickActions = ({ totalCount, revokingAll, onRevokeAll }: SessionsQuickActionsProps) => {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm lg:w-[360px]">
      <p className="text-sm font-medium">Acciones rapidas</p>
      <p className="mt-1 text-sm text-black/60">Cierra todas tus sesiones activas.</p>

      <button
        type="button"
        onClick={onRevokeAll}
        disabled={revokingAll || totalCount === 0}
        className={[
          "mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition",
          totalCount === 0 || revokingAll ? "bg-black/5 text-black/40 cursor-not-allowed" : "text-white",
        ].join(" ")}
        style={totalCount === 0 || revokingAll ? undefined : { backgroundColor: "#21b8a6" }}
      >
        {revokingAll ? "Cerrando sesiones..." : "Cerrar todas"}
      </button>

      <div className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-xs text-black/60">
        Si detectas actividad extrana, cierra sesiones y cambia tu contrasena.
      </div>
    </div>
  );
};

export default SessionsQuickActions;
