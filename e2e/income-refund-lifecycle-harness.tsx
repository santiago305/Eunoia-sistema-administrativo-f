import { createRoot } from "react-dom/client";
import { useState } from "react";
import { CompanyContext } from "../src/shared/context/CompanyContext";
import { AuthContext } from "../src/shared/context/AuthContext";
import { TooltipProvider } from "../src/shared/components/ui/tooltip";
import { IncomeRefundsModal } from "../src/features/income/components/IncomeRefundsModal";
import type { Income } from "../src/features/income/types/income.types";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

const params = new URLSearchParams(window.location.search);
const income = {
  incomeId: params.get("incomeId") ?? "income-refund-lifecycle",
  saleOrderId: params.get("saleOrderId") ?? "order-refund-lifecycle",
  saleOrderNumber: "SO-REFUND-E2E",
  clientName: "Cliente E2E",
  amount: 100,
  currency: "PEN",
  method: "Transferencia",
  companyPaymentAccountId: "inflow-account",
  companyPaymentAccountLabel: "Cuenta receptora",
  operationNumber: "OP-INCOME",
  detail: "Pago de prueba",
  date: "2026-10-02",
  createdAt: "2026-10-02T12:00:00.000Z",
  evidenceUrl: null,
  version: 2,
} satisfies Income;

function RefundLifecycleHarness() {
  const [open, setOpen] = useState(true);
  const [savedCount, setSavedCount] = useState(0);

  return (
    <>
      <div data-testid="refund-saved-count">{savedCount}</div>
      <IncomeRefundsModal
        open={open}
        income={income}
        canCreate={params.get("canCreate") === "true"}
        canPost
        canCancel
        canReverse
        onClose={() => setOpen(false)}
        onSaved={() => setSavedCount((count) => count + 1)}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <CompanyContext.Provider value={{
    company: { companyId: params.get("companyId") ?? "company-refund-e2e" } as any,
    hasCompany: true,
    loading: false,
    checked: true,
    refreshCompany: async () => null,
  }}>
    <AuthContext.Provider value={{ userId: "user-refund-e2e", isAuthenticated: true, authChecked: true, userRole: null, userRoles: [], permissions: [], preferredHomePath: null, isSuperAdmin: false, login: async () => ({} as any), logout: () => undefined, checkAuth: async () => ({} as any), loading: false }}>
      <TooltipProvider>
        <RefundLifecycleHarness />
      </TooltipProvider>
    </AuthContext.Provider>
  </CompanyContext.Provider>,
);
