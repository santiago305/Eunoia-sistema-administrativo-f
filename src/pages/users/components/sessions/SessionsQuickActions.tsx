interface SessionsQuickActionsProps {
  otherCount: number;
  revokingAll: boolean;
  onRevokeAllOthers: () => void;
}

const SessionsQuickActions = ({ otherCount, revokingAll, onRevokeAllOthers }: SessionsQuickActionsProps) => {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm lg:w-[360px]">
      <p className="text-sm font-medium">Acciones rápidas</p>
      <p className="mt-1 text-sm text-black/60">
        Cierra todas las sesiones excepto esta.
      </p>

      <button
        type="button"
        onClick={onRevokeAllOthers}
        disabled={revokingAll || otherCount === 0}
        className={[
          "mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition",
          otherCount === 0 || revokingAll
            ? "bg-black/5 text-black/40 cursor-not-allowed"
            : "text-white",
        ].join(" ")}
        style={
          otherCount === 0 || revokingAll
            ? undefined
            : { backgroundColor: "#21b8a6" }
        }
      >
        {revokingAll ? "Cerrando sesiones..." : "Cerrar todas (excepto esta)"}
      </button>

      <div className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-xs text-black/60">
        Si cambiaste tu contraseña recientemente, también se cerrarán sesiones antiguas.
      </div>
    </div>
  );
};

export default SessionsQuickActions;
