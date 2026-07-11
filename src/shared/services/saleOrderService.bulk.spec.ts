import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { bulkChangeSaleOrderState } from "@/shared/services/saleOrderService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("saleOrderService bulk actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts one global target for all selected orders", async () => {
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: {
        type: "success",
        message: "Operacion masiva procesada",
        data: {
          targetStateId: "global-delivered",
          requested: 2,
          succeeded: 1,
          failed: 1,
          partiallyCompleted: 1,
          results: [
            {
              saleOrderId: "order-1",
              targetStateId: "global-delivered",
              status: "success",
              initialState: {
                workflowStateId: "workflow-created",
                saleOrderStateId: "global-created",
                code: "CREATED",
                name: "Creado",
              },
              finalState: {
                workflowStateId: "workflow-delivered",
                saleOrderStateId: "global-delivered",
                code: "DELIVERED",
                name: "Entregado",
              },
              completedTransitions: [],
              warnings: [],
            },
            {
              saleOrderId: "order-2",
              targetStateId: "global-delivered",
              status: "failed",
              message: "El DNI del cliente es obligatorio",
              initialState: null,
              finalState: null,
              completedTransitions: [],
              warnings: [],
              failure: {
                code: "CONDITION_FAILED",
                message: "El DNI del cliente es obligatorio",
              },
            },
          ],
        },
      },
    });

    const response = await bulkChangeSaleOrderState({
      saleOrderIds: ["order-1", "order-2"],
      targetStateId: "global-delivered",
    });

    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/sale-orders/bulk/change-state",
      {
        saleOrderIds: ["order-1", "order-2"],
        targetStateId: "global-delivered",
      },
    );
    expect(response.data.partiallyCompleted).toBe(1);
    expect(response.data.results[1]).toMatchObject({
      status: "failed",
      failure: { code: "CONDITION_FAILED" },
    });
  });
});
