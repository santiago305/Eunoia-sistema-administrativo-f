import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider } from "./NotificationProvider";
import { NOTIFICATION_SOCKET_EVENTS, NOTIFICATION_WINDOW_EVENTS } from "@/features/mail/constants/mail-events.constants";
import { showNotificationToast } from "@/features/mail/services/mail-toast.service";

type SocketHandler = (payload?: unknown) => void;

const { createNotificationSocketMock, getHasUnreadMailMock, socketHandlers } = vi.hoisted(() => ({
  createNotificationSocketMock: vi.fn(),
  getHasUnreadMailMock: vi.fn(),
  socketHandlers: new Map<string, SocketHandler>(),
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, userId: "user-1" }),
}));

vi.mock("@/shared/lib/socket", () => ({
  closeNotificationSocket: vi.fn(),
  createNotificationSocket: createNotificationSocketMock,
}));

vi.mock("@/shared/services/notificationService", () => ({
  getHasUnreadMail: getHasUnreadMailMock,
}));

vi.mock("@/features/mail/services/mail-toast.service", () => ({
  showNotificationToast: vi.fn(),
}));

describe("NotificationProvider purchase notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    getHasUnreadMailMock.mockResolvedValue(false);
    createNotificationSocketMock.mockReturnValue({
      on: vi.fn((event: string, handler: SocketHandler) => {
        socketHandlers.set(event, handler);
      }),
      off: vi.fn(),
    });
  });

  it("dispatches a purchase history window event when the notification socket receives a purchase notification", async () => {
    const onPurchaseHistoryUpdated = vi.fn();
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.purchaseHistoryUpdated, onPurchaseHistoryUpdated);

    render(
      <NotificationProvider>
        <div>app</div>
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(socketHandlers.has(NOTIFICATION_SOCKET_EVENTS.created)).toBe(true);
    });

    socketHandlers.get(NOTIFICATION_SOCKET_EVENTS.created)?.({
      recipientId: "recipient-1",
      notification: {
        title: "Compra actualizada",
        metadata: { sourceEntityType: "purchase_order", poId: "po-1" },
      },
    });

    expect(onPurchaseHistoryUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          notification: expect.objectContaining({
            metadata: expect.objectContaining({ poId: "po-1" }),
          }),
        }),
      }),
    );

    window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.purchaseHistoryUpdated, onPurchaseHistoryUpdated);
  });

  it("classifies recurring purchase notifications by module metadata without refreshing purchase history", async () => {
    const onRecurringPurchaseNotification = vi.fn();
    const onPurchaseHistoryUpdated = vi.fn();
    window.addEventListener(
      NOTIFICATION_WINDOW_EVENTS.recurringPurchasesNotificationCreated,
      onRecurringPurchaseNotification,
    );
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.purchaseHistoryUpdated, onPurchaseHistoryUpdated);

    render(
      <NotificationProvider>
        <div>app</div>
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(socketHandlers.has(NOTIFICATION_SOCKET_EVENTS.created)).toBe(true);
    });

    const payload = {
      recipientId: "recipient-2",
      notification: {
        title: "Compra recurrente vence hoy",
        message: "Hosting vence hoy. Monto: USD 25.00.",
        priority: "URGENT",
        actionUrl: "/compras/recurrentes",
        actionLabel: "Ver o registrar pago",
        sourceEntityType: "recurring_purchase_template",
        sourceEntityId: "rec-1",
        metadata: {
          module: "recurring-purchases",
          notificationKind: "due_reminder",
          recurringTemplateId: "rec-1",
          dueDate: "2026-07-11",
        },
      },
    };

    socketHandlers.get(NOTIFICATION_SOCKET_EVENTS.created)?.(payload);

    expect(showNotificationToast).toHaveBeenCalledWith(payload.notification);
    expect(onRecurringPurchaseNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          notification: expect.objectContaining({
            metadata: expect.objectContaining({
              module: "recurring-purchases",
              recurringTemplateId: "rec-1",
            }),
          }),
        }),
      }),
    );
    expect(onPurchaseHistoryUpdated).not.toHaveBeenCalled();

    window.removeEventListener(
      NOTIFICATION_WINDOW_EVENTS.recurringPurchasesNotificationCreated,
      onRecurringPurchaseNotification,
    );
    window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.purchaseHistoryUpdated, onPurchaseHistoryUpdated);
  });
});
