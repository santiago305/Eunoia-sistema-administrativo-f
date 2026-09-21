import { describe, expect, it } from "vitest";
import {
  getCompanyPaymentAccountDisplay,
  getCompanyPaymentAccountTypeLabel,
  getCompatibleTreasuryAccountTypes,
  isTreasuryAccountOperational,
} from "./paymentAccountView";

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

  it("filters operational accounts by direction, currency and payment method", () => {
    const account = {
      id: "account-1",
      companyId: "company-1",
      type: "BANK_ACCOUNT" as const,
      usage: "OUTFLOW" as const,
      name: "BCP",
      maskedLabel: "BCP ****1234",
      currency: "PEN" as const,
      isActive: true,
    };

    expect(isTreasuryAccountOperational(account, {
      usage: "OUTFLOW",
      currency: "PEN",
      paymentMethodCode: "BANK_TRANSFER",
    })).toBe(true);
    expect(isTreasuryAccountOperational(account, {
      usage: "INFLOW",
      currency: "PEN",
      paymentMethodCode: "BANK_TRANSFER",
    })).toBe(false);
    expect(isTreasuryAccountOperational(account, {
      usage: "OUTFLOW",
      currency: "USD",
      paymentMethodCode: "CARD",
    })).toBe(false);
  });

  it("allows bank deposits from a bank account or cash register", () => {
    expect(getCompatibleTreasuryAccountTypes("BANK_DEPOSIT")).toEqual(["BANK_ACCOUNT", "CASH"]);
  });
});
