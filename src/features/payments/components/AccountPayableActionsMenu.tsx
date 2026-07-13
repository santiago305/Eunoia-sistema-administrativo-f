import { CalendarClock, CreditCard, ExternalLink, Menu, ReceiptText } from "lucide-react";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { canRegisterAccountPayablePayment } from "../accountPayableView";
import type { AccountPayable } from "../types/payable.types";

type Props = {
  payable: AccountPayable;
  canManage: boolean;
  onRegisterPayment: (payable: AccountPayable) => void;
  onSchedulePayment: (payable: AccountPayable) => void;
};

export function AccountPayableActionsMenu({
  payable,
  canManage,
  onRegisterPayment,
  onSchedulePayment,
}: Props) {
  const canPay = canRegisterAccountPayablePayment(payable.status, canManage);

  return (
    <ActionsPopover
      actions={[
        {
          id: "register-payment",
          label: "Registrar pago",
          icon: <CreditCard className="h-4 w-4 text-black/60" />,
          hidden: !canPay,
          onClick: () => onRegisterPayment(payable),
        },
        {
          id: "schedule-payment",
          label: "Programar pago",
          icon: <CalendarClock className="h-4 w-4 text-black/60" />,
          hidden: !canPay,
          onClick: () => onSchedulePayment(payable),
        },
        {
          id: "view-purchase",
          label: "Ver compra",
          icon: <ExternalLink className="h-4 w-4 text-black/60" />,
          href: `/compras/${payable.purchaseId}`,
        },
        {
          id: "view-payments",
          label: "Ver pagos",
          icon: <ReceiptText className="h-4 w-4 text-black/60" />,
          href: `/compras/${payable.purchaseId}/pagos`,
        },
      ]}
      columns={1}
      compact
      showLabels
      triggerIcon={<Menu className="h-4 w-4" />}
      popoverClassName="min-w-40"
      popoverBodyClassName="p-2"
      itemClassName="justify-start px-2 py-2"
    />
  );
}
