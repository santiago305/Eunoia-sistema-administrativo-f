import { createRoot } from "react-dom/client";
import { useState } from "react";
import { SaleOrderPaymentCards } from "@/features/sale-orders/components/editor/SaleOrderPaymentCards";
import { buildEmptySaleOrderEditorForm, type SaleOrderEditorForm } from "@/features/sale-orders/components/editor/saleOrderEditorForm";
import { AuthContext } from "@/shared/context/AuthContext";
import { CompanyContext } from "@/shared/context/CompanyContext";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import "@/app/styles/globals.css";
import "@/app/styles/app.css";

const incomeId = "60000000-0000-4000-8000-000000000001";
const methodId = "30000000-0000-4000-8000-000000000001";
const accountId = "20000000-0000-4000-8000-000000000001";
const baselinePermissions = ["income.read", "income.audit.view", "payments.view_evidence", "income.view_all"];
const permissions = [...baselinePermissions, ...(new URLSearchParams(window.location.search).get("permissions")?.split(",").filter(Boolean) ?? [])];

const auth = {
  isAuthenticated: false,
  authChecked: true,
  userRole: "Finanzas",
  userRoles: ["Finanzas"],
  permissions,
  preferredHomePath: null,
  isSuperAdmin: false,
  userId: "browser-e2e-finance-user",
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

function PaymentHarness() {
  const [form, setForm] = useState<SaleOrderEditorForm>(() => ({
    ...buildEmptySaleOrderEditorForm(),
    items: [{ total: 100 } as SaleOrderEditorForm["items"][number]],
    payments: [{
      id: incomeId,
      version: 1,
      clientKey: "evidence-history-payment",
      bankAccountId: accountId,
      companyPaymentAccountId: accountId,
      paymentMethodId: methodId,
      method: "Transferencia",
      amount: 45.67,
      date: "2026-10-13",
      operationNumber: "OP-EVIDENCE-HISTORY",
      status: "PENDING_CONFIRMATION",
      existingPhotoUrl: null,
    }],
  }));

  return <main className="mx-auto max-w-3xl p-6">
    <h1 className="mb-4 text-lg font-semibold">Pedido PED-HTTP-001</h1>
    <SaleOrderPaymentCards
      form={form}
      setForm={setForm}
      methodOptions={[{ value: methodId, label: "Transferencia", paymentMethodCode: "BANK_TRANSFER" }]}
      bankAccountOptions={[{ value: accountId, label: "Cuenta PEN" }]}
    />
  </main>;
}

createRoot(document.getElementById("root")!).render(
  <AuthContext.Provider value={auth}>
    <CompanyContext.Provider value={company}>
      <TooltipProvider><PaymentHarness /></TooltipProvider>
    </CompanyContext.Provider>
  </AuthContext.Provider>,
);
