import { Edit3, Menu, Power } from "lucide-react";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import type { CompanyPaymentAccount } from "../types/payment-account.types";

type Props = {
  account: CompanyPaymentAccount;
  canEdit: boolean;
  canDisable: boolean;
  busy?: boolean;
  onEdit: (account: CompanyPaymentAccount) => void;
  onToggleActive: (account: CompanyPaymentAccount) => void;
};

export function PaymentAccountActionsMenu({
  account,
  canEdit,
  canDisable,
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
          hidden: !canEdit,
          disabled: busy,
          onClick: () => onEdit(account),
        },
        {
          id: "toggle-active",
          label: account.isActive ? "Desactivar" : "Activar",
          icon: <Power className="h-4 w-4 text-black/60" />,
          hidden: !canDisable,
          disabled: busy,
          onClick: () => onToggleActive(account),
        },
      ]}
      columns={1}
      compact
      showLabels
      triggerIcon={<Menu className="h-4 w-4" />}
      popoverClassName="min-w-32"
      popoverBodyClassName="p-1"
      gridClassName="gap-0.5"
      itemClassName="justify-start gap-1.5 px-2 py-1"
    />
  );
}
