interface SessionsSummaryCardProps {
  activeCount: number;
  otherCount: number;
}

const SessionsSummaryCard = ({ activeCount, otherCount }: SessionsSummaryCardProps) => {
  return (
    <div className="flex-1 rounded-2xl border border-black/10 bg-[#f0faf9] p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-4 right-4 opacity-10 text-[48px] pointer-events-none select-none">🛡️</div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[#0a0a0a]/70">Resumen de sesiones</p>

        <h2 className="text-4xl font-bold text-black">{activeCount}</h2>
        <p className="text-sm text-black/60">{otherCount} en otros dispositivos</p>

        <div className="mt-2 text-sm text-black/60">
          Asegúrate de cerrar sesiones en dispositivos que no uses.
        </div>
      </div>

      <div className="absolute bottom-4 right-4 text-xs px-3 py-1 rounded-full border border-black/10 bg-white shadow-sm text-black/80">
        Seguridad activa
      </div>
    </div>
  );
};

export default SessionsSummaryCard;
