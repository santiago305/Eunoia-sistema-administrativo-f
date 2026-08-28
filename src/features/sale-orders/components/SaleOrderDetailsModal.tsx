import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  capabilities?: {
    canEdit: boolean;
    canManageAdvancedOrders?: boolean;
    canAssignWorkflow?: boolean;
  };
};

export function SaleOrderDetailsModal({
  open,
  mode = "edit",
  order,
  onClose,
  onSaved,
  onOrderChanged,
  capabilities: providedCapabilities,
}: Props) {
  const [dirty, setDirty] = useState(false);
  const [showCloseAlert, setShowCloseAlert] = useState(false);
  const [editorFooter, setEditorFooter] = useState<ReactNode | null>(null);
  const capabilities = providedCapabilities ?? {
    canEdit: true,
    canManageAdvancedOrders: true,
    canAssignWorkflow: true,
  };
  const readOnly = mode === "edit" && Boolean(order) && (!capabilities.canEdit || order?.isActive === false);
  const title = useMemo(() => {
    if (mode === "create") return "Nuevo pedido";
    if (!order) return "Editar pedido";
    return `${readOnly ? "Detalle" : "Editar"} ${order.serie ?? "-"}-${order.correlative ?? "-"} (Creado por ${order.createdBy?.name ?? "desconocido"})`;
  }, [mode, order, readOnly]);

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

  const handleSaved = useCallback(
    async (saleOrderId: string) => {
      setDirty(false);
      await onSaved?.(saleOrderId);
      await onOrderChanged?.();
    },
    [onOrderChanged, onSaved],
  );

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        title={title}
        className="h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[1500px]"
        containerClassName="p-2 sm:p-4"
        bodyClassName="p-0"
        footer={editorFooter}
      >
        <SaleOrderEditor
          mode={mode}
          order={order}
          onCancel={requestClose}
          onDirtyChange={setDirty}
          onFooterChange={setEditorFooter}
          onSaved={handleSaved}
          readOnly={readOnly}
          canManageAdvancedOrders={
            capabilities.canManageAdvancedOrders ?? true
          }
          canAssignWorkflow={capabilities.canAssignWorkflow ?? true}
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
