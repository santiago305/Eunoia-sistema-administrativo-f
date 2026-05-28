import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { SaleOrderModal } from "@/features/sale-orders/components/SaleOrderModal";

export default function SaleOrders() {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Pedidos</h1>
        <SystemButton onClick={openModal} leftIcon={<Plus className="h-4 w-4" />}>
          Nuevo pedido
        </SystemButton>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-muted-foreground">
        Aún no hay listado disponible; por ahora solo creación.
      </div>

      <SaleOrderModal open={open} onClose={closeModal} />
    </PageShell>
  );
}

