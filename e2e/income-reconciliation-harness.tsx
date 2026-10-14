import { createRoot } from "react-dom/client";
import { useState } from "react";
import { CompanyContext } from "../src/shared/context/CompanyContext";
import { AuthContext } from "../src/shared/context/AuthContext";
import { TooltipProvider } from "../src/shared/components/ui/tooltip";
import { IncomeReconciliationModal } from "../src/features/income/components/IncomeReconciliationModal";
import type { Income } from "../src/features/income/types/income.types";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

const params = new URLSearchParams(window.location.search);
const income = {
  incomeId: params.get("incomeId") ?? "income-reconciliation-e2e",
  saleOrderId: params.get("saleOrderId") ?? "order-reconciliation-e2e",
  saleOrderNumber: "SO-RECON-E2E",
  clientName: "Cliente E2E",
  amount: 100,
  currency: "PEN",
  method: "Transferencia",
  companyPaymentAccountId: params.get("accountId") ?? "inflow-account",
  companyPaymentAccountLabel: "Cuenta receptora",
  operationNumber: "OP-INCOME",
  detail: "Pago de prueba",
  date: "2026-10-02",
  createdAt: "2026-10-02T12:00:00.000Z",
  evidenceUrl: null,
  version: 2,
} satisfies Income;

function ReconciliationHarness() {
  const [open, setOpen] = useState(true);
  const [savedCount, setSavedCount] = useState(0);

  return (
    <>
      <div data-testid="reconciliation-saved-count">{savedCount}</div>
      <IncomeReconciliationModal
        open={open}
        income={income}
        canReconcile
        canUnreconcile
        onClose={() => setOpen(false)}
        onSaved={() => setSavedCount((count) => count + 1)}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <CompanyContext.Provider value={{
    company: { companyId: params.get("companyId") ?? "company-reconciliation-e2e" } as any,
    hasCompany: true,
    loading: false,
    checked: true,
    refreshCompany: async () => null,
  }}>
    <AuthContext.Provider value={{ userId: "user-reconciliation-e2e", isAuthenticated: true, authChecked: true, userRole: null, userRoles: [], permissions: [], preferredHomePath: null, isSuperAdmin: false, login: async () => ({} as any), logout: () => undefined, checkAuth: async () => ({} as any), loading: false }}>
      <TooltipProvider>
        <ReconciliationHarness />
      </TooltipProvider>
    </AuthContext.Provider>
  </CompanyContext.Provider>,
);
