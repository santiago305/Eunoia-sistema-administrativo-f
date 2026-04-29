export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1360px] mx-auto px-3 sm:px-4 py-4 sm:py-5">
        {children}
      </div>
    </div>
  );
}
