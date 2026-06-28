import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSaleOrderPaymentOptions } from "./useSaleOrderPaymentOptions";

const {
  getPaymentMethodsByCompanyMock,
  listCompanyPaymentAccountsByCompanyMock,
} = vi.hoisted(() => ({
  getPaymentMethodsByCompanyMock: vi.fn(),
  listCompanyPaymentAccountsByCompanyMock: vi.fn(),
}));

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn(), clearFeedback: vi.fn() }),
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getPaymentMethodsByCompany: getPaymentMethodsByCompanyMock,
}));

vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  listCompanyPaymentAccountsByCompany: listCompanyPaymentAccountsByCompanyMock,
}));

describe("useSaleOrderPaymentOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPaymentMethodsByCompanyMock.mockResolvedValue([]);
    listCompanyPaymentAccountsByCompanyMock.mockResolvedValue([
      {
        id: "company-account-1",
        name: "BCP Empresa",
        maskedLabel: "BCP Empresa ****0001",
        currency: "PEN",
        isActive: true,
      },
    ]);
  });

  it("loads sale payment account options from company payment accounts", async () => {
    const { result } = renderHook(() => useSaleOrderPaymentOptions());

    await waitFor(() => {
      expect(result.current.bankAccountOptions).toEqual([
        {
          value: "company-account-1",
          label: "BCP Empresa ****0001 · PEN",
        },
      ]);
    });
    expect(listCompanyPaymentAccountsByCompanyMock).toHaveBeenCalledWith("company-1");
  });
});
