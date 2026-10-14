import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { IncomePendingEditModal } from "@/features/income/components/IncomePendingEditModal";
import type { Income } from "@/features/income/types/income.types";
import { listIncome } from "@/shared/services/incomeService";
import { AuthContext } from "@/shared/context/AuthContext";
import { CompanyContext } from "@/shared/context/CompanyContext";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import "@/app/styles/globals.css";
import "@/app/styles/app.css";

const initialIncome: Income = {
  incomeId: "60000000-0000-4000-8000-000000000001",
  saleOrderId: "50000000-0000-4000-8000-000000000001",
  saleOrderNumber: "PED-HTTP-001",
  clientName: "Cliente de prueba HTTP",
  amount: 45.67,
  currency: "PEN",
  method: "Transferencia",
  paymentMethodId: "30000000-0000-4000-8000-000000000001",
  companyPaymentAccountId: "20000000-0000-4000-8000-000000000001",
  companyPaymentAccountLabel: "Cuenta de pruebas",
  operationNumber: "EVIDENCE-RETRY-HTTP",
  detail: "Prueba de reintento de evidencia",
  date: "2026-10-13",
  paymentDate: "2026-10-13",
  createdAt: "2026-10-13T12:00:00.000Z",
  evidenceUrl: null,
  status: "PENDING_CONFIRMATION",
  version: 1,
};

export function EvidenceUploadHarness() {
  const [income, setIncome] = useState(initialIncome);
  const refreshIncome = useCallback(async () => {
    const response = await listIncome();
    const current = response.items.find((item) => item.incomeId === initialIncome.incomeId);
    if (current) setIncome(current);
  }, []);

  useEffect(() => { void refreshIncome(); }, [refreshIncome]);

  return <>
    <output data-testid="income-version">{income.version}</output>
    <IncomePendingEditModal
      open
      income={income}
      userId={auth.userId}
      canViewEvidence={false}
      canAttachEvidence
      onClose={() => undefined}
      onSaved={refreshIncome}
    />
  </>;
}

const auth = {
  isAuthenticated: false,
  authChecked: true,
  userRole: "Finanzas",
  userRoles: ["Finanzas"],
  permissions: ["income.read", "payments.attach_evidence", "income.view_all"],
  preferredHomePath: null,
  isSuperAdmin: false,
  userId: "70000000-0000-4000-8000-000000000001",
  login: async () => ({ success: true, message: "" }),
  logout: () => undefined,
  checkAuth: async () => ({ success: true, message: "" }),
  loading: false,
};

const company = {
  company: {
    companyId: "10000000-0000-4000-8000-000000000001",
    name: "Empresa financiera E2E",
    ruc: "20100000001",
    primaryColor: "#7f1d1d",
    production: false,
    isActive: true,
  },
  hasCompany: true,
  loading: false,
  checked: true,
  refreshCompany: async () => null,
};

createRoot(document.getElementById("root")!).render(
  <AuthContext.Provider value={auth}>
    <CompanyContext.Provider value={company}>
      <TooltipProvider>
        <EvidenceUploadHarness />
      </TooltipProvider>
    </CompanyContext.Provider>
  </AuthContext.Provider>,
);
