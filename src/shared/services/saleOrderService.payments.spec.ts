import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignSaleOrderWorkflow,
  changeSaleOrderState,
  createSaleOrderPayment,
  deleteSaleOrderPayment,
  getAvailableSaleOrderTransitions,
  getSaleOrderWorkflowHistory,
  listSaleOrderPayments,
  previewSaleOrdersJsonImport,
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

describe("saleOrderService payments/workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assignSaleOrderWorkflow -> POST /sale-orders/:id/assign-workflow", async () => {
    (axiosInstance.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { id: "so-1" } });
    await assignSaleOrderWorkflow("so-1", "wf-1");
    expect(axiosInstance.post).toHaveBeenCalledWith("/sale-orders/so-1/assign-workflow", { workflowId: "wf-1" });
  });

  it("listSaleOrderPayments -> GET /sale-orders/:id/payments", async () => {
    (axiosInstance.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [] });

    const res = await listSaleOrderPayments("so-2");

    expect(axiosInstance.get).toHaveBeenCalledWith("/sale-orders/so-2/payments");
    expect(res).toEqual([]);
  });

  it("changeSaleOrderState sends transitionId and metadata", async () => {
    (axiosInstance.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { type: "success" } });
    await changeSaleOrderState("so-1", "tr-1", { source: "sale-order-details" });
    expect(axiosInstance.post).toHaveBeenCalledWith("/sale-orders/so-1/change-state", {
      transitionId: "tr-1",
      metadata: { source: "sale-order-details" },
    });
  });

  it("gets available transitions and history", async () => {
    (axiosInstance.get as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });
    await getAvailableSaleOrderTransitions("so-1");
    await getSaleOrderWorkflowHistory("so-1");
    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, "/sale-orders/so-1/available-transitions");
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, "/sale-orders/so-1/history");
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

  it("previewSaleOrdersJsonImport -> POST /sale-orders/import-preview with direct rows array", async () => {
    (axiosInstance.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        totalRows: 1,
        processedRows: 1,
        importedRows: 1,
        failedRows: 0,
        rows: [],
        errors: [],
      },
    });

    const rows = [
      {
        departmentName: "Lima",
        provinceName: "Lima",
        districtName: "Miraflores",
        recipientName: "Ana Perez",
        phone: "999888777",
        productCodes: "AMPOLLA - ROJO - EVA001",
        total: 120,
      },
    ];

    const res = await previewSaleOrdersJsonImport(rows);

    expect(axiosInstance.post).toHaveBeenCalledWith("/sale-orders/import-preview", rows);
    expect(res.importedRows).toBe(1);
  });
});
