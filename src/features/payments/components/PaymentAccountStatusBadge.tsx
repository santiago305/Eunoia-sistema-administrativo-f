type Props = {
  isActive: boolean;
};

export function PaymentAccountStatusBadge({ isActive }: Props) {
  return (
    <span
      className={
        isActive
          ? "inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
          : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
      }
    >
      {isActive ? "Activa" : "Inactiva"}
    </span>
  );
}
