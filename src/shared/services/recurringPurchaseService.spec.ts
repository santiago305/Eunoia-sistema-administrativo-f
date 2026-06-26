import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  cancelRecurringPurchase,
  createRecurringPurchase,
  generateCurrentRecurringPayable,
  listRecurringPurchases,
  pauseRecurringPurchase,
  resumeRecurringPurchase,
} from "./recurringPurchaseService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("recurringPurchaseService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses recurring purchase endpoints", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({ data: { items: [] } });
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: {} });
    vi.mocked(axiosInstance.patch).mockResolvedValue({ data: {} });

    const payload = {
      supplierId: "supplier-1",
      name: "Hosting mensual",
      frequency: "MONTHLY" as const,
      currency: "PEN" as const,
      amount: 150,
      startDate: "2026-06-10",
    };

    await listRecurringPurchases({ status: "ACTIVE", page: 2, limit: 10 });
    await createRecurringPurchase(payload);
    await pauseRecurringPurchase("rec-1");
    await resumeRecurringPurchase("rec-1");
    await cancelRecurringPurchase("rec-1");
    await generateCurrentRecurringPayable("rec-1");

    expect(axiosInstance.get).toHaveBeenCalledWith("/recurring-purchases", {
      params: { status: "ACTIVE", page: 2, limit: 10 },
    });
    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, "/recurring-purchases", payload);
    expect(axiosInstance.patch).toHaveBeenNthCalledWith(1, "/recurring-purchases/rec-1/pause");
    expect(axiosInstance.patch).toHaveBeenNthCalledWith(2, "/recurring-purchases/rec-1/resume");
    expect(axiosInstance.patch).toHaveBeenNthCalledWith(3, "/recurring-purchases/rec-1/cancel");
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, "/recurring-purchases/rec-1/generate-current-payable");
  });
});
