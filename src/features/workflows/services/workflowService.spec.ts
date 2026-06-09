import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  createSaleOrderState,
  getSaleOrderState,
  listSaleOrderStates,
  listWorkflowActions,
  listWorkflowConditions,
  updateSaleOrderState,
  updateFullWorkflow,
} from "./workflowService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("workflowService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads condition and action catalogs from their endpoints", async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });

    await listWorkflowConditions();
    await listWorkflowActions();

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, "/workflows/conditions");
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, "/workflows/actions");
  });

  it("updates a full workflow through the primary backend route", async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValueOnce({ data: {} });
    const payload = { name: "Venta", states: [], transitions: [] };

    await updateFullWorkflow("wf-1", payload);

    expect(axiosInstance.patch).toHaveBeenCalledWith("/workflows/full/wf-1", payload);
  });

  it("uses sale order state CRUD endpoints", async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { id: "state-1", name: "Creado", color: "#0ea5e9" } });
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({ data: {} });
    vi.mocked(axiosInstance.patch).mockResolvedValueOnce({ data: {} });

    await listSaleOrderStates();
    await getSaleOrderState("state-1");
    await createSaleOrderState({ name: "Creado", color: "#0ea5e9" });
    await updateSaleOrderState("state-1", { name: "Preparando", color: "#22c55e" });

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, "/sale-order-states");
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, "/sale-order-states/state-1");
    expect(axiosInstance.post).toHaveBeenCalledWith("/sale-order-states", {
      name: "Creado",
      color: "#0ea5e9",
    });
    expect(axiosInstance.patch).toHaveBeenCalledWith("/sale-order-states/state-1", {
      name: "Preparando",
      color: "#22c55e",
    });
  });
});
