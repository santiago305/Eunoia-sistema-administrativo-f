import { describe, expect, it } from "vitest";
import { buildPackDecomposition } from "./saleOrderPackDecomposition";

describe("buildPackDecomposition", () => {
  it("extracts the selected pack and keeps surplus SKUs as products", () => {
    const result = buildPackDecomposition(
      {
        description: "Pack desconocido",
        quantity: 1,
        unitPrice: 200,
        total: 200,
        components: [
          { skuId: "p1", skuLabel: "Producto 1", quantity: 2, basePrice: 20, unitPrice: 20, total: 40 },
          { skuId: "p2", skuLabel: "Producto 2", quantity: 1, basePrice: 20, unitPrice: 20, total: 20 },
          { skuId: "p3", skuLabel: "Producto 3", quantity: 3, basePrice: 20, unitPrice: 20, total: 60 },
        ],
      },
      {
        pack: { packId: "amor-propio", description: "Amor Propio", total: 140 } as any,
        items: [
          { id: "pi1", skuId: "p1", quantity: 1, price: 20, lineTotal: 20, sku: null },
          { id: "pi2", skuId: "p2", quantity: 1, price: 20, lineTotal: 20, sku: null },
          { id: "pi3", skuId: "p3", quantity: 1, price: 20, lineTotal: 20, sku: null },
        ],
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.replacements).toHaveLength(3);
    expect(result.proposal.packItem).toMatchObject({
      referencePackId: "amor-propio",
      quantity: 1,
      total: 140,
    });
    expect(result.proposal.leftoverItems).toEqual([
      expect.objectContaining({ description: "Producto 1", quantity: 1, total: 20 }),
      expect.objectContaining({ description: "Producto 3", quantity: 2, total: 40 }),
    ]);
    expect(
      result.proposal.replacements.reduce((sum, item) => sum + item.total, 0),
    ).toBe(200);
  });

  it("rejects a pack that is not contained in the unknown composition", () => {
    const result = buildPackDecomposition(
      {
        description: "Desconocido",
        quantity: 1,
        unitPrice: 10,
        total: 10,
        components: [{ skuId: "p1", quantity: 1, unitPrice: 10, total: 10 }],
      },
      {
        pack: { packId: "pack", description: "Pack", total: 10 } as any,
        items: [
          { id: "pi1", skuId: "p1", quantity: 1, price: 5, lineTotal: 5, sku: null },
          { id: "pi2", skuId: "p2", quantity: 1, price: 5, lineTotal: 5, sku: null },
        ],
      },
    );

    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });
});
