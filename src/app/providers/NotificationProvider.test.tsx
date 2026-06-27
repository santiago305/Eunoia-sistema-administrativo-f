import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider } from "./NotificationProvider";
import { NOTIFICATION_SOCKET_EVENTS, NOTIFICATION_WINDOW_EVENTS } from "@/features/mail/constants/mail-events.constants";

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
});
