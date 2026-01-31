interface SessionsHeaderProps {
  title: string;
  subtitle: string;
}

const SessionsHeader = ({ title, subtitle }: SessionsHeaderProps) => {
  return (
    <div className="w-full border-b border-black/10">
      <div className="w-full px-6 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold">{title}</h1>
          <p className="text-sm text-black/60">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default SessionsHeader;
