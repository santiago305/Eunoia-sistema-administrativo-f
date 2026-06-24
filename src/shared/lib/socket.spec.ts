import { beforeEach, describe, expect, it, vi } from "vitest";

const { ioMock, disconnectMock } = vi.hoisted(() => ({
  disconnectMock: vi.fn(),
  ioMock: vi.fn(() => ({ disconnect: disconnectMock })),
}));

vi.mock("socket.io-client", () => ({
  io: ioMock,
}));

vi.mock("@/env", () => ({
  env: { apiBaseUrl: "http://localhost:3000/api" },
}));

describe("socket factories", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const socketModule = await import("./socket");
    socketModule.closeNotificationSocket();
    socketModule.closeSaleOrdersSocket();
  });

  it("creates the notification socket in the notifications namespace", async () => {
    const { createNotificationSocket } = await import("./socket");

    createNotificationSocket("user-1");

    expect(ioMock).toHaveBeenCalledWith("http://localhost:3000/notifications", {
      withCredentials: true,
      transports: ["websocket"],
      auth: { userId: "user-1" },
    });
  });

  it("creates the sale orders socket in the sale-orders namespace", async () => {
    const { createSaleOrdersSocket } = await import("./socket");

    createSaleOrdersSocket("user-1");

    expect(ioMock).toHaveBeenCalledWith("http://localhost:3000/sale-orders", {
      withCredentials: true,
      transports: ["websocket"],
      auth: { userId: "user-1" },
    });
  });
});
