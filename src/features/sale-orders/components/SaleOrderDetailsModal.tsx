import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { AlertModal } from "@/shared/components/components/AlertModal";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderEditor } from "./editor/SaleOrderEditor";

type Props = {
  open: boolean;
  mode?: "create" | "edit";
  order: SaleOrder | null;
  onClose: () => void;
  onSaved?: (saleOrderId: string) => void | Promise<void>;
  onOrderChanged?: () => void | Promise<void>;
};

export function SaleOrderDetailsModal({
  open,
  mode = "edit",
  order,
  onClose,
  onSaved,
  onOrderChanged,
}: Props) {
  const [dirty, setDirty] = useState(false);
  const [showCloseAlert, setShowCloseAlert] = useState(false);
  const title = useMemo(() => {
    if (mode === "create") return "Nuevo pedido";
    if (!order) return "Editar pedido";
    return `Editar ${order.serie ?? "-"}-${order.correlative ?? "-"} (Creado por ${order.createdBy?.name ?? "desconocido"})`;
  }, [mode, order]);

  useEffect(() => {
    if (open) {
      setDirty(false);
      setShowCloseAlert(false);
    }
  }, [mode, open, order?.id]);

  const requestClose = useCallback(() => {
    if (dirty) {
      setShowCloseAlert(true);
      return;
    }
    setDirty(false);
    onClose();
  }, [dirty, onClose]);

  const confirmClose = useCallback(() => {
    setShowCloseAlert(false);
    setDirty(false);
    onClose();
  }, [onClose]);

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        title={title}
        className="h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[1500px]"
        containerClassName="p-2 sm:p-4"
        bodyClassName="p-0"
        closeOnOverlayClick={false}
      >
        <SaleOrderEditor
          mode={mode}
          order={order}
          onCancel={requestClose}
          onDirtyChange={setDirty}
          onSaved={async (saleOrderId) => {
            setDirty(false);
            await onSaved?.(saleOrderId);
            await onOrderChanged?.();
          }}
        />
      </Modal>

      <AlertModal
        open={showCloseAlert}
        type="warning"
        title="Cambios sin guardar"
        message="Hay cambios sin guardar. ¿Deseas cerrar el pedido?"
        confirmText="Cerrar pedido"
        cancelText="Seguir editando"
        onClose={() => setShowCloseAlert(false)}
        onConfirm={confirmClose}
      />
    </>
  );
}
