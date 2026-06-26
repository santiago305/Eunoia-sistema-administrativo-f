import { Link } from "react-router-dom";
import { PageShell } from "@/shared/layouts/PageShell";
import { RoutesPaths } from "@/routes/config/routesPaths";

export default function RecurringPurchasesPage() {
  return (
    <PageShell className="bg-white">
      <div className="space-y-4">
        <header className="border-b border-black/10 pb-4">
          <h1 className="text-xl font-semibold text-black">Compras recurrentes</h1>
          <p className="mt-1 text-sm text-black/60">Ruta preparada para administrar plantillas y recurrencias de compra.</p>
        </header>
        <Link to={RoutesPaths.purchases} className="inline-flex min-h-11 items-center rounded-sm border border-black/10 px-3 text-sm font-medium text-black hover:bg-black/[0.03]">
          Ver compras
        </Link>
      </div>
    </PageShell>
  );
}
