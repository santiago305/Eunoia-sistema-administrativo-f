import { describe, expect, it } from "vitest";
import { getCompanyPaymentAccountDisplay, getCompanyPaymentAccountTypeLabel } from "./paymentAccountView";

describe("paymentAccountView", () => {
  it("formats company payment accounts with masked sensitive data", () => {
    expect(
      getCompanyPaymentAccountDisplay({
        id: "account-1",
        companyId: "company-1",
        type: "BANK_ACCOUNT",
        name: "BCP Empresa",
        bankName: "BCP",
        accountLastFour: "8901",
        maskedLabel: "BCP Empresa ****8901",
        currency: "PEN",
        isActive: true,
      }),
    ).toBe("BCP Empresa ****8901 · PEN");
  });

  it("maps account types to readable labels", () => {
    expect(getCompanyPaymentAccountTypeLabel("BANK_ACCOUNT")).toBe("Cuenta bancaria");
    expect(getCompanyPaymentAccountTypeLabel("CREDIT_CARD")).toBe("Tarjeta de credito");
    expect(getCompanyPaymentAccountTypeLabel("CASH")).toBe("Caja");
    expect(getCompanyPaymentAccountTypeLabel("DIGITAL_WALLET")).toBe("Billetera digital");
  });
});
