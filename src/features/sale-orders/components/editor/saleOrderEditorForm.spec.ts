import { describe, expect, it } from "vitest";
import type { SaleOrder } from "../../types/saleOrder";
import {
  buildEmptySaleOrderEditorForm,
  calculateSaleOrderTotals,
  mapSaleOrderToEditorForm,
  markAttachmentRemoved,
  toSaveSaleOrderWithClientDto,
} from "./saleOrderEditorForm";

const order = {
  id: "order-1",
  serie: "PE",
  correlative: 10,
  workflow: { id: "workflow-1" },
  warehouse: { id: "warehouse-1", name: "Principal" },
  client: {
    id: "client-1",
    type: "NEW",
    docType: "DNI",
    fullName: "Ana Perez",
    docNumber: "12345678",
    address: "Av. Lima",
    reference: "Puerta azul",
    departmentId: "15",
    provinceId: "1501",
    districtId: "150101",
    isActive: true,
    telephones: [
      {
        id: "phone-1",
        number: "999999999",
        isMain: true,
        isActive: true,
      },
    ],
  },
  items: [
    {
      id: "item-1",
      quantity: 2,
      unitPrice: 25,
      total: 50,
      description: "Pack",
      components: [],
    },
  ],
  payments: [
    {
      id: "payment-1",
      clientKey: "payment-1",
      bankAccount: null,
      date: "2026-07-03T00:00:00.000Z",
      method: "EFECTIVO",
      operationNumber: null,
      amount: 20,
      note: null,
      paymentPhoto: "proof.webp",
      createdAt: "2026-07-03T00:00:00.000Z",
    },
  ],
  attachments: [
    {
      id: "attachment-1",
      saleOrderPaymentId: "payment-1",
      type: "PAYMENT_PROOF",
      filename: "proof.webp",
      originalName: "proof.webp",
      mimeType: "image/webp",
      sizeBytes: 100,
      url: "proof.webp",
      note: null,
      createdAt: "2026-07-03T00:00:00.000Z",
    },
  ],
  deliveryCost: 10,
  discount: 5,
  createdAt: "2026-07-03T12:00:00.000Z",
} as unknown as SaleOrder;

describe("saleOrderEditorForm", () => {
  it("maps complete detail to editable state while preserving createdAt as display-only", () => {
    const form = mapSaleOrderToEditorForm(order);

    expect(form.createdAt).toBe("2026-07-03T12:00:00.000Z");
    expect(form.clientMode).toBe("update");
    expect(form.clientData.fullName).toBe("Ana Perez");
    expect(form.payments[0]).toEqual(
      expect.objectContaining({
        id: "payment-1",
        clientKey: "payment-1",
        existingPhotoUrl: "proof.webp",
      }),
    );
  });

  it("normalizes sale order item components for editor display", () => {
    const form = mapSaleOrderToEditorForm({
      ...order,
      items: [
        {
          id: "item-1",
          quantity: 1,
          unitPrice: 20,
          total: 20,
          description: "Pack",
          components: [
            {
              skuId: "sku-1",
              skuLabel: "JABON AZUFRE",
              skuCode: "10017",
              skuImage: "jabon.webp",
              attributes: [{ code: "variant", name: "Variante", value: "AZUFRE" }],
              quantity: 1,
              unitPrice: 20,
              total: 20,
            },
          ],
        },
      ],
    } as unknown as SaleOrder);

    expect(form.items[0].components?.[0]).toEqual(
      expect.objectContaining({
        sku: expect.objectContaining({
          id: "sku-1",
          name: "JABON AZUFRE",
          backendSku: "10017",
          image: "jabon.webp",
        }),
        attributes: [{ code: "variant", name: "Variante", value: "AZUFRE" }],
      }),
    );
    expect(form.items[0].components?.[0]).not.toHaveProperty("skuLabel");
  });

  it("calculates a fixed discount over subtotal plus delivery cost", () => {
    expect(
      calculateSaleOrderTotals(
        [{ total: 50 }, { total: 30 }],
        12,
        7,
      ),
    ).toEqual({ subTotal: 80, deliveryCost: 12, discount: 7, total: 85 });
  });

  it("builds stable client and payment commands", () => {
    const form = mapSaleOrderToEditorForm(order);
    const payload = toSaveSaleOrderWithClientDto(form);

    expect(payload.client).toEqual(
      expect.objectContaining({ mode: "update", id: "client-1" }),
    );
    expect(payload.payments?.[0]).toEqual(
      expect.objectContaining({
        id: "payment-1",
        clientKey: "payment-1",
      }),
    );
    expect(payload).not.toHaveProperty("createdAt");
  });

  it("tracks existing attachment removal once", () => {
    const form = buildEmptySaleOrderEditorForm();
    const once = markAttachmentRemoved(form, "attachment-1");
    const twice = markAttachmentRemoved(once, "attachment-1");

    expect(twice.removedAttachmentIds).toEqual(["attachment-1"]);
  });
});
