import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BankAccountListModal } from "./BankAccountListModal";

const { listCompanyPaymentAccountsByCompanyMock } = vi.hoisted(() => ({
  listCompanyPaymentAccountsByCompanyMock: vi.fn(),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn(), clearFeedback: vi.fn() }),
}));

vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  listCompanyPaymentAccountsByCompany: listCompanyPaymentAccountsByCompanyMock,
  createCompanyPaymentAccount: vi.fn(),
  updateCompanyPaymentAccount: vi.fn(),
  setCompanyPaymentAccountActive: vi.fn(),
}));

vi.mock("@/shared/components/settings/modal", () => ({
  Modal: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("BankAccountListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCompanyPaymentAccountsByCompanyMock.mockResolvedValue([
      {
        id: "company-account-1",
        name: "BCP Empresa",
        accountLastFour: "0001",
        maskedLabel: "BCP Empresa ****0001",
        currency: "PEN",
        isActive: true,
      },
    ]);
  });

  it("lists company payment accounts instead of legacy bank accounts", async () => {
    render(
      <BankAccountListModal
        title="Cuentas de pago"
        close={vi.fn()}
        companyId="company-1"
      />,
    );

    await waitFor(() => {
      expect(listCompanyPaymentAccountsByCompanyMock).toHaveBeenCalledWith("company-1");
    });
    expect(await screen.findByText("BCP Empresa")).toBeInTheDocument();
    expect(screen.getByText("0001")).toBeInTheDocument();
  });
});
