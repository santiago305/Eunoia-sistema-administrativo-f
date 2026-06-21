import { describe, expect, it } from "vitest";
import {
  canShowPaymentApprovalActions,
  canShowPaymentDeleteAction,
  getPaymentStatusView,
  getPaymentMethodOptions,
} from "./paymentView";
import { PaymentTypes } from "@/features/purchases/types/purchaseEnums";

describe("paymentView", () => {
  it("maps payment statuses to readable labels", () => {
    expect(getPaymentStatusView("PENDING_APPROVAL").label).toBe("Pendiente");
    expect(getPaymentStatusView("APPROVED").label).toBe("Aprobado");
    expect(getPaymentStatusView("REJECTED").label).toBe("Rechazado");
  });

  it("only shows approval actions for pending payments when user can approve", () => {
    expect(canShowPaymentApprovalActions("PENDING_APPROVAL", true)).toBe(true);
    expect(canShowPaymentApprovalActions("APPROVED", true)).toBe(false);
    expect(canShowPaymentApprovalActions("PENDING_APPROVAL", false)).toBe(false);
  });

  it("only shows delete action when user can manage payments", () => {
    expect(canShowPaymentDeleteAction(true)).toBe(true);
    expect(canShowPaymentDeleteAction(false)).toBe(false);
  });

  it("prefers backend payment method records and falls back to local enum", () => {
    expect(
      getPaymentMethodOptions([
        { methodId: "1", name: "Transferencia BCP", isActive: true },
        { methodId: "2", name: "Tarjeta inactiva", isActive: false },
      ]),
    ).toEqual([{ value: "Transferencia BCP", label: "Transferencia BCP" }]);

    expect(getPaymentMethodOptions()).toContainEqual({
      value: PaymentTypes.EFECTIVO,
      label: PaymentTypes.EFECTIVO,
    });
  });
});
