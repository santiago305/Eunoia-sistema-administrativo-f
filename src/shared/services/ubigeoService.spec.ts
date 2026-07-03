import { describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { listAllUbigeoProvinces } from "./ubigeoService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("ubigeoService", () => {
  it("loads all provinces from the full ubigeo catalog", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: {
        data: {
          departments: [],
          provinces: [{ id: "1501", name: "Lima", departmentId: "15" }],
          districts: [],
        },
      },
    });

    await expect(listAllUbigeoProvinces()).resolves.toEqual([
      { id: "1501", name: "Lima", departmentId: "15" },
    ]);
    expect(axiosInstance.get).toHaveBeenCalledWith("/ubigeo");
  });
});
