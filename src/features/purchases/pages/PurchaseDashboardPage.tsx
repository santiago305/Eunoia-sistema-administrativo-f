import { Link } from "react-router-dom";
import { BarChart3, Clock, FilePlus2, ListChecks } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { RoutesPaths } from "@/routes/config/routesPaths";

const shortcuts = [
  { label: "Compras", href: RoutesPaths.purchases, icon: ListChecks },
  { label: "Nueva compra", href: RoutesPaths.purchaseCreate, icon: FilePlus2 },
  { label: "Historial", href: RoutesPaths.purchasesHistory, icon: Clock },
  { label: "Cuentas por pagar", href: RoutesPaths.accountsPayable, icon: BarChart3 },
];

export default function PurchaseDashboardPage() {
  return (
    <PageShell className="bg-white">
      <div className="space-y-4">
        <header className="border-b border-black/10 pb-4">
          <h1 className="text-xl font-semibold text-black">Compras</h1>
          <p className="mt-1 text-sm text-black/60">Panel operativo de adquisiciones, pagos y seguimiento documental.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map(({ label, href, icon: Icon }) => (
            <Link key={href} to={href} className="flex min-h-20 items-center gap-3 rounded-sm border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-black/20">
              <Icon className="h-5 w-5 text-black/55" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
