import { Edit3, Menu, Power } from "lucide-react";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import type { PaymentMethod } from "../types/paymentMethod";

type Props = {
  method: PaymentMethod;
  canManage: boolean;
  busy?: boolean;
  onEdit: (method: PaymentMethod) => void;
  onToggleActive: (method: PaymentMethod) => void;
};

export function PaymentMethodActionsMenu({
  method,
  canManage,
  busy = false,
  onEdit,
  onToggleActive,
}: Props) {
  return (
    <ActionsPopover
      actions={[
        {
          id: "edit",
          label: "Editar",
          icon: <Edit3 className="h-4 w-4 text-black/60" />,
          hidden: !canManage,
          disabled: busy,
          onClick: () => onEdit(method),
        },
        {
          id: "toggle-active",
          label: method.isActive ? "Desactivar" : "Activar",
          icon: <Power className="h-4 w-4 text-black/60" />,
          hidden: !canManage,
          disabled: busy,
          onClick: () => onToggleActive(method),
        },
      ]}
      columns={1}
      compact
      showLabels
      triggerIcon={<Menu className="h-4 w-4" />}
      popoverClassName="min-w-36"
      popoverBodyClassName="p-2"
      itemClassName="justify-start px-2 py-2"
    />
  );
}
