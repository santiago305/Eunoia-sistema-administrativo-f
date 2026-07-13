import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountsPayablePage from "./AccountsPayablePage";

const listAccountPayablesMock = vi.hoisted(() => vi.fn());
const markOverdueAccountPayablesMock = vi.hoisted(() => vi.fn());
const showFeedbackMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/accountsPayableService", () => ({
  listAccountPayables: listAccountPayablesMock,
  markOverdueAccountPayables: markOverdueAccountPayablesMock,
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: showFeedbackMock }),
}));

vi.mock("@/shared/layouts/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/AccountsPayableTable", () => ({
  AccountsPayableTable: () => <div data-testid="accounts-payable-table" />,
}));

vi.mock("../components/RegisterPayablePaymentModal", () => ({
  RegisterPayablePaymentModal: () => null,
}));

describe("AccountsPayablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAccountPayablesMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    markOverdueAccountPayablesMock.mockResolvedValue({ updated: 0 });
  });

  it("uses purchaseId from the URL query as the initial payable filter", async () => {
    render(
      <MemoryRouter initialEntries={["/cuentas-por-pagar?purchaseId=purchase-1"]}>
        <AccountsPayablePage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(listAccountPayablesMock).toHaveBeenCalledWith(
        expect.objectContaining({ purchaseId: "purchase-1" }),
      ),
    );
  });
});
