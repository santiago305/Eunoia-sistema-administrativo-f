import { describe, expect, it } from "vitest";
import {
  formatPurchaseDashboardItemType,
  formatPurchaseDashboardPaymentStatus,
  formatPurchaseDashboardSeriesLabel,
} from "./purchaseDashboardLabels";

describe("purchaseDashboardLabels", () => {
  it("shows purchase type codes in Spanish for dashboard series", () => {
    expect(formatPurchaseDashboardSeriesLabel("RAW_MATERIAL")).toBe("Materia prima");
    expect(formatPurchaseDashboardSeriesLabel("INVENTORY")).toBe("Producto");
  });

  it("shows payment status codes in Spanish", () => {
    expect(formatPurchaseDashboardPaymentStatus("PENDING")).toBe("Pendiente");
    expect(formatPurchaseDashboardPaymentStatus("OVERDUE")).toBe("Vencido");
  });

  it("shows top item type codes in Spanish", () => {
    expect(formatPurchaseDashboardItemType("INTERNAL_MATERIAL")).toBe("Material interno");
  });

  it("keeps unknown labels readable and fixes known Spanish accents", () => {
    expect(formatPurchaseDashboardSeriesLabel("Sin metodo")).toBe("Sin método");
    expect(formatPurchaseDashboardPaymentStatus("CUSTOM_STATUS")).toBe("Custom status");
  });
});
