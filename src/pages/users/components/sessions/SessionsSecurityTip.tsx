interface SessionsSecurityTipProps {
  tip: string;
}

const SessionsSecurityTip = ({ tip }: SessionsSecurityTipProps) => {
  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium">Consejo de seguridad</p>
      <p className="mt-1 text-sm text-black/60">{tip}</p>
      <div className="mt-3 h-1 w-full rounded-full bg-black/5 overflow-hidden">
        <div className="h-full w-[40%]" style={{ backgroundColor: "#a884f3" }} />
      </div>
    </div>
  );
};

export default SessionsSecurityTip;
