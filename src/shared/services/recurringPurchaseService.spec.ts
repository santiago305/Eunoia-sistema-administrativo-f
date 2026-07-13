import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  cancelRecurringPurchase,
  createRecurringPurchase,
  deleteRecurringPurchaseExportPreset,
  exportRecurringPurchasesExcel,
  generateCurrentRecurringPayable,
  getRecurringPurchaseExportColumns,
  getRecurringPurchaseExportPresets,
  listRecurringPurchases,
  pauseRecurringPurchase,
  resumeRecurringPurchase,
  saveRecurringPurchaseExportPreset,
} from "./recurringPurchaseService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

  it("uses recurring purchase export endpoints", async () => {
    const blob = new Blob(["xlsx"]);
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({ data: [{ key: "name", label: "Nombre" }] })
      .mockResolvedValueOnce({
        data: [{ metricId: "metric-1", name: "Basico", snapshot: { columns: [{ key: "name", label: "Nombre" }] } }],
      });
    vi.mocked(axiosInstance.post)
      .mockResolvedValueOnce({ data: { metricId: "metric-2" } })
      .mockResolvedValueOnce({
        data: blob,
        headers: { "content-disposition": 'attachment; filename="recurrentes.xlsx"' },
      });
    vi.mocked(axiosInstance.delete).mockResolvedValueOnce({ data: true });

    await expect(getRecurringPurchaseExportColumns()).resolves.toEqual([{ key: "name", label: "Nombre" }]);
    await expect(getRecurringPurchaseExportPresets()).resolves.toEqual([
      { metricId: "metric-1", name: "Basico", snapshot: { columns: [{ key: "name", label: "Nombre" }] } },
    ]);
    await saveRecurringPurchaseExportPreset({ name: "Basico", columns: [{ key: "name", label: "Nombre" }] });
    await deleteRecurringPurchaseExportPreset("metric-1");
    const file = await exportRecurringPurchasesExcel({
      columns: [{ key: "name", label: "Nombre" }],
      q: "hosting",
      filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }],
    });

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, "/recurring-purchases/export-columns");
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, "/recurring-purchases/export-presets");
    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, "/recurring-purchases/export-presets", {
      name: "Basico",
      columns: [{ key: "name", label: "Nombre" }],
    });
    expect(axiosInstance.delete).toHaveBeenCalledWith("/recurring-purchases/export-presets/metric-1");
    expect(axiosInstance.post).toHaveBeenNthCalledWith(
      2,
      "/recurring-purchases/export-excel",
      {
        columns: [{ key: "name", label: "Nombre" }],
        q: "hosting",
        filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }],
      },
      { responseType: "blob" },
    );
    expect(file).toEqual({ blob, filename: "recurrentes.xlsx" });
  });
});
