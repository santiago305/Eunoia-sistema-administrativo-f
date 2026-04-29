export function SectionHeaderForm({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-foreground">{title}</h3>
    </div>
  );
}