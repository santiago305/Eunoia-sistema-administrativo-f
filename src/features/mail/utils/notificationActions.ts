import type { NotificationRecipientItem } from "../types/notification.types";

export const getNotificationViewUrl = (item: NotificationRecipientItem): string | null => {
  return item.notification.actionUrl ?? null;
};

export const getNotificationApproveUrl = (item: NotificationRecipientItem): string | null => {
  const poId = String(item.notification.metadata?.poId ?? item.notification.sourceEntityId ?? "");
  const paymentId = String(item.notification.metadata?.paymentId ?? "");

  switch (item.notification.type) {
    case "PURCHASE_CREATION_WITH_PAYMENT_PENDING":
      return poId ? `/compras?purchaseId=${poId}&modal=detail&action=approveCreationWithPayment` : null;
    case "PURCHASE_PROCESSING_REQUESTED":
      return poId ? `/compras?purchaseId=${poId}&modal=detail&action=approveProcessing` : null;
    case "PURCHASE_PAYMENT_PENDING_APPROVAL":
      if (!poId || !paymentId) return poId ? `/compras?purchaseId=${poId}&modal=payments` : null;
      return `/compras?purchaseId=${poId}&modal=payments&action=approvePayment&paymentId=${paymentId}`;
    default:
      return null;
  }
};

