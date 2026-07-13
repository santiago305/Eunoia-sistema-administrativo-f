import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  deletePaymentSearchMetric,
  getPaymentSearchState,
  savePaymentSearchMetric,
} from "./paymentService";
import {
  PaymentSearchFields,
  PaymentSearchOperators,
  type PaymentSearchSnapshot,
} from "@/features/payments/types/payment-search.types";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("paymentService search state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads payment search state from the payments endpoint", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: { recent: [], saved: [], catalogs: { statuses: [] } },
    });

    await getPaymentSearchState();

    expect(axiosInstance.get).toHaveBeenCalledWith("/payments/search-state");
  });

  it("saves payment search metrics with name and snapshot", async () => {
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: { type: "success", message: "Metrica guardada correctamente" },
    });
    const snapshot: PaymentSearchSnapshot = {
      q: "bcp",
      filters: [
        {
          field: PaymentSearchFields.STATUS,
          operator: PaymentSearchOperators.IN,
          values: ["PENDING_APPROVAL"],
        },
      ],
    };

    const result = await savePaymentSearchMetric("Pagos por aprobar", snapshot);

    expect(axiosInstance.post).toHaveBeenCalledWith("/payments/search-metrics", {
      name: "Pagos por aprobar",
      snapshot,
    });
    expect(result.type).toBe("success");
  });

  it("deletes payment search metrics by metric id", async () => {
    vi.mocked(axiosInstance.delete).mockResolvedValueOnce({
      data: { type: "success", message: "Metrica eliminada correctamente" },
    });

    const result = await deletePaymentSearchMetric("metric-1");

    expect(axiosInstance.delete).toHaveBeenCalledWith("/payments/search-metrics/metric-1");
    expect(result.type).toBe("success");
  });
});
