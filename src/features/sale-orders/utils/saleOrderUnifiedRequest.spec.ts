import { describe, expect, it } from "vitest";
import { buildSaleOrderUnifiedRequest } from "./saleOrderUnifiedRequest";
import type { SaveSaleOrderWithClientDto } from "../types/saleOrder";

const data: SaveSaleOrderWithClientDto = {
  client: {
    mode: "existing",
    id: "11111111-1111-4111-8111-111111111111",
  },
  workflowId: "22222222-2222-4222-8222-222222222222",
  warehouseId: "33333333-3333-4333-8333-333333333333",
  items: [
    {
      quantity: 1,
      unitPrice: 20,
      total: 20,
      description: "Pack",
      components: [
        {
          skuId: "44444444-4444-4444-8444-444444444444",
          quantity: 1,
          unitPrice: 20,
          total: 20,
        },
      ],
    },
  ],
  payments: [
    {
      clientKey: "new-1",
      method: "EFECTIVO",
      amount: 10,
    },
  ],
  removedAttachmentIds: [
    "55555555-5555-4555-8555-555555555555",
  ],
};

describe("buildSaleOrderUnifiedRequest", () => {
  it("keeps a JSON request when there are no new files", () => {
    const result = buildSaleOrderUnifiedRequest({ data });

    expect(result).toBe(data);
  });

  it("builds multipart data with stable payment photo keys", () => {
    const shippingPhoto = new File(["shipping"], "shipping.png", {
      type: "image/png",
    });
    const paymentPhoto = new File(["proof"], "proof.webp", {
      type: "image/webp",
    });

    const result = buildSaleOrderUnifiedRequest({
      data,
      shippingPhoto,
      paymentPhotos: new Map([["new-1", paymentPhoto]]),
    });

    expect(result).toBeInstanceOf(FormData);
    const formData = result as FormData;
    expect([...formData.keys()]).toEqual([
      "data",
      "shippingPhoto",
      "paymentPhotos[new-1]",
    ]);
    expect(JSON.parse(String(formData.get("data")))).toEqual(data);
    expect(formData.get("shippingPhoto")).toBe(shippingPhoto);
    expect(formData.get("paymentPhotos[new-1]")).toBe(paymentPhoto);
  });
});
