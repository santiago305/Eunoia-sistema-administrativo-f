import { PageShell } from "@/shared/layouts/PageShell";

export default function PaymentMethodsPage() {
  return (
    <PageShell className="bg-white">
      <div className="space-y-2 border-b border-black/10 pb-4">
        <h1 className="text-xl font-semibold text-black">Métodos de pago</h1>
        <p className="text-sm text-black/60">Ruta central para métodos de pago usados en compras y pagos.</p>
      </div>
    </PageShell>
  );
}
