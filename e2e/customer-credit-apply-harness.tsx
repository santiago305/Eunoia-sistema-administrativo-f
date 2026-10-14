import { createRoot } from "react-dom/client";
import { useState } from "react";
import { AuthContext } from "../src/shared/context/AuthContext";
import { TooltipProvider } from "../src/shared/components/ui/tooltip";
import { CustomerCreditApplyPanel } from "../src/features/sale-orders/components/editor/CustomerCreditApplyPanel";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

const params = new URLSearchParams(window.location.search);
const auth = {
  isAuthenticated: false,
  authChecked: true,
  userRole: "Finanzas",
  userRoles: ["Finanzas"],
  permissions: ["customer_credits.view", "customer_credits.apply", "income.view_all"],
  preferredHomePath: null,
  isSuperAdmin: false,
  userId: "browser-e2e-finance-user",
  login: async () => ({ success: true, message: "" }),
  logout: () => undefined,
  checkAuth: async () => ({ success: true, message: "" }),
  loading: false,
};

function CustomerCreditApplyHarness() {
  const [applied, setApplied] = useState(0);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <output data-testid="credit-application-count">{applied}</output>
      <CustomerCreditApplyPanel
        clientId={params.get("client") ?? "client-e2e"}
        saleOrderId={params.get("order") ?? "order-e2e"}
        currency="PEN"
        remainingAmount={50}
        hasUnsavedChanges={false}
        onApplied={() => setApplied((count) => count + 1)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <AuthContext.Provider value={auth}>
    <TooltipProvider><CustomerCreditApplyHarness /></TooltipProvider>
  </AuthContext.Provider>,
);
