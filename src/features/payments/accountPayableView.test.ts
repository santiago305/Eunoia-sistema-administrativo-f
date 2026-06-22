import { describe, expect, it } from "vitest";
import {
  getAccountPayableStatusView,
  getPayablePaymentStatusAfterTotals,
} from "./accountPayableView";

describe("accountPayableView", () => {
  it("maps payable statuses to readable labels", () => {
    expect(getAccountPayableStatusView("PENDING").label).toBe("Pendiente");
    expect(getAccountPayableStatusView("PARTIAL").label).toBe("Parcial");
    expect(getAccountPayableStatusView("PAID").label).toBe("Pagada");
    expect(getAccountPayableStatusView("OVERDUE").label).toBe("Vencida");
    expect(getAccountPayableStatusView("CANCELLED").label).toBe("Cancelada");
  });

  it("derives the expected status after totals change", () => {
    expect(getPayablePaymentStatusAfterTotals(1000, 0)).toBe("PENDING");
    expect(getPayablePaymentStatusAfterTotals(1000, 400)).toBe("PARTIAL");
    expect(getPayablePaymentStatusAfterTotals(1000, 1000)).toBe("PAID");
  });
});
