import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import { uploadPurchaseImageProdution } from "./purchaseActions";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe("purchaseActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads legacy completion photos through purchase attachments as PRODUCT_PHOTO", async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        type: "success",
        message: "Documento subido.",
        attachment: { url: "purchase-attachments/purchase-1/product.webp" },
      },
    });

    const file = new File(["image"], "product.webp", { type: "image/webp" });
    const result = await uploadPurchaseImageProdution("purchase-1", file);

    expect(axiosInstance.patch).not.toHaveBeenCalled();
    expect(axiosInstance.post).toHaveBeenCalledWith("/purchase-attachments", expect.any(FormData));
    const formData = vi.mocked(axiosInstance.post).mock.calls[0][1] as FormData;
    expect(formData.get("purchaseId")).toBe("purchase-1");
    expect(formData.get("type")).toBe("PRODUCT_PHOTO");
    expect(formData.get("file")).toBe(file);
    expect(formData.get("note")).toBe("Migrado desde flujo legacy image_prodution.");
    expect(result.imageProdution).toEqual(["purchase-attachments/purchase-1/product.webp"]);
  });
});
