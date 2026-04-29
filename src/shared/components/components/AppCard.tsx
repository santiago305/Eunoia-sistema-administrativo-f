type CardProps = {
  children: React.ReactNode;
};

type CardHeaderProps = {
  title: string;
  subtitle?: string;
};

export function Card({ children }: CardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/8 bg-white shadow-sm">
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: CardHeaderProps) {
  return (
    <div className="px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-black">{title}</h3>
          {subtitle && <p className="mt-1 max-w-sm text-sm leading-5 text-black/60">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
