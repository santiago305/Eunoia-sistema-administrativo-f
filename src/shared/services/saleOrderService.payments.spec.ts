import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSaleOrder,
  confirmSaleOrderDelivery,
  createSaleOrderPayment,
  deleteSaleOrderPayment,
  listSaleOrderPayments,
} from "@/shared/services/saleOrderService";

vi.mock("@/shared/common/utils/axios", () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import axiosInstance from "@/shared/common/utils/axios";

describe("saleOrderService payments/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancelSaleOrder -> PATCH /sale-orders/:id/cancel", async () => {
    (axiosInstance.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { saleOrderId: "so-1", agendaStatus: "CANCELED", deliveryStatus: "CANCELED" },
    });

    const res = await cancelSaleOrder("so-1");

    expect(axiosInstance.patch).toHaveBeenCalledWith("/sale-orders/so-1/cancel");
    expect(res.agendaStatus).toBe("CANCELED");
  });

  it("listSaleOrderPayments -> GET /sale-orders/:id/payments", async () => {
    (axiosInstance.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [] });

    const res = await listSaleOrderPayments("so-2");

    expect(axiosInstance.get).toHaveBeenCalledWith("/sale-orders/so-2/payments");
    expect(res).toEqual([]);
  });

  it("confirmSaleOrderDelivery -> PATCH /sale-orders/:id/confirm-delivery", async () => {
    (axiosInstance.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { saleOrderId: "so-10", deliveryStatus: "DELIVERED" },
    });

    const res = await confirmSaleOrderDelivery("so-10");

    expect(axiosInstance.patch).toHaveBeenCalledWith("/sale-orders/so-10/confirm-delivery");
    expect(res.deliveryStatus).toBe("DELIVERED");
  });

  it("createSaleOrderPayment -> POST /sale-orders/:id/payments", async () => {
    (axiosInstance.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { paymentId: "p-1" } });

    const payload = { bankAccountId: "ba-1", method: "EFECTIVO", amount: 10, note: "x" };
    const res = await createSaleOrderPayment("so-3", payload);

    expect(axiosInstance.post).toHaveBeenCalledWith("/sale-orders/so-3/payments", payload);
    expect(res.paymentId).toBe("p-1");
  });

  it("deleteSaleOrderPayment -> DELETE /sale-orders/:id/payments/:paymentId", async () => {
    (axiosInstance.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { deleted: true } });

    const res = await deleteSaleOrderPayment("so-4", "p-9");

    expect(axiosInstance.delete).toHaveBeenCalledWith("/sale-orders/so-4/payments/p-9");
    expect(res.deleted).toBe(true);
  });
});
