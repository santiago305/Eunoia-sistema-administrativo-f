export function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-zinc-200/80 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,.05)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-zinc-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
