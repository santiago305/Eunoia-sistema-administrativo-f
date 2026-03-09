export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(33,184,166,.08),_transparent_22%),linear-gradient(to_bottom,_#fbfdfc,_#f5f7f6)]">
      <div className="mx-auto flex w-full max-w-[1550px] flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        {children}
      </div>
    </div>
  );
}
