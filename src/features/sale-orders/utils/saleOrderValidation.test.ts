import { describe, expect, it } from "vitest";
import { validateSaleOrderForm } from "@/features/sale-orders/utils/saleOrderValidation";
import { buildEmptySaleOrderForm } from "@/features/sale-orders/utils/saleOrderForm";

describe("saleOrderValidation", () => {
  it("requiere warehouseId y clientId", () => {
    const form = { ...buildEmptySaleOrderForm(), workflowId: "wf" };
    const result = validateSaleOrderForm(form);
    expect(result.ok).toBe(false);
    expect((result as any).message).toMatch(/almacén/i);
  });

  it("requiere scheduleDate", () => {
    const form = {
      ...buildEmptySaleOrderForm(),
      workflowId: "wf",
      warehouseId: "w",
      clientId: "c",
      scheduleDate: "",
    };
    const result = validateSaleOrderForm(form);
    expect(result.ok).toBe(false);
    expect((result as any).message).toMatch(/scheduleDate|fecha/i);
  });

  it("sin pack requiere components", () => {
    const form = {
      ...buildEmptySaleOrderForm(),
      workflowId: "wf",
      warehouseId: "w",
      clientId: "c",
      scheduleDate: "2026-05-25",
      items: [{ quantity: 1, unitPrice: 0, total: 0, description: "x", components: [] }],
    };
    const result = validateSaleOrderForm(form);
    expect(result.ok).toBe(false);
  });

  it("con pack permite components vacío", () => {
    const form = {
      ...buildEmptySaleOrderForm(),
      workflowId: "wf",
      warehouseId: "w",
      clientId: "c",
      scheduleDate: "2026-05-25",
      items: [{ quantity: 1, unitPrice: 0, total: 0, description: "Pack", referencePackId: "p1", components: [] }],
    };
    const result = validateSaleOrderForm(form);
    expect(result.ok).toBe(true);
  });
});
