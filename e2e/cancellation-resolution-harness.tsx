import { createRoot } from "react-dom/client";
import { useState } from "react";
import { AuthContext } from "../src/shared/context/AuthContext";
import { TooltipProvider } from "../src/shared/components/ui/tooltip";
import { usePermissions } from "../src/shared/hooks/usePermissions";
import { SaleOrderCancellationResolutionModal } from "../src/features/sale-orders/components/sale-order/SaleOrderCancellationResolutionModal";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

const auth = {
  isAuthenticated: false,
  authChecked: true,
  userRole: "Finanzas",
  userRoles: ["Finanzas"],
  permissions: [
    "sale_orders.payments.resolve_cancelled_order",
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

const saleOrderId = new URLSearchParams(window.location.search).get("order") ?? "order-cancel-e2e";

function CancellationHarness() {
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState("pending");
  const { can } = usePermissions();

  return (
    <>
      <div data-testid="harness-permissions">{auth.permissions.join(",")}</div>
      <div data-testid="can-create-refund">{String(can("customer_refunds.create"))}</div>
      <div data-testid="cancellation-result">{result}</div>
      <SaleOrderCancellationResolutionModal
        open={open}
        saleOrderId={saleOrderId}
        onClose={() => setOpen(false)}
        onCompleted={() => setResult("completed")}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <AuthContext.Provider value={auth}>
    <TooltipProvider>
      <CancellationHarness />
    </TooltipProvider>
  </AuthContext.Provider>,
);
