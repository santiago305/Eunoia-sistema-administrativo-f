import { createRoot } from "react-dom/client";
import IncomePage from "../src/features/income/IncomePage";
import { AuthContext } from "../src/shared/context/AuthContext";
import { CompanyContext } from "../src/shared/context/CompanyContext";
import { TooltipProvider } from "../src/shared/components/ui/tooltip";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

const auth = {
  isAuthenticated: false,
  authChecked: true,
  userRole: "Finanzas",
  userRoles: ["Finanzas"],
  permissions: [
    "income.read",
    "sale_orders.payments.post",
    "sale_orders.payments.post_bulk",
    ...(new URLSearchParams(window.location.search).get("permissions")?.split(",").filter(Boolean) ?? []),
  ],
  preferredHomePath: null,
  isSuperAdmin: false,
  userId: "browser-e2e-finance-user",
  login: async () => ({ success: true, message: "" }),
  logout: () => undefined,
  checkAuth: async () => ({ success: true, message: "" }),
  loading: false,
};

const harnessCompanyId = new URLSearchParams(window.location.search).get("companyId");
const company = {
  company: harnessCompanyId ? {
    companyId: harnessCompanyId,
    name: "Empresa financiera E2E",
    ruc: "20100000001",
    primaryColor: "#7f1d1d",
    production: false,
    isActive: true,
  } : null,
  hasCompany: Boolean(harnessCompanyId),
  loading: false,
  checked: true,
  refreshCompany: async () => null,
};

createRoot(document.getElementById("root")!).render(
  <AuthContext.Provider value={auth}>
    <CompanyContext.Provider value={company}>
      <TooltipProvider>
        <IncomePage />
      </TooltipProvider>
    </CompanyContext.Provider>
  </AuthContext.Provider>,
);
