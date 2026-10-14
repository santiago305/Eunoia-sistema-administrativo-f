import { createRoot } from "react-dom/client";
import { CompanyContext } from "../src/shared/context/CompanyContext";
import { TooltipProvider } from "../src/shared/components/ui/tooltip";
import { BankReconciliationReportModal } from "../src/features/income/components/BankReconciliationReportModal";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

createRoot(document.getElementById("root")!).render(
  <CompanyContext.Provider value={{
    company: { companyId: "company-report-e2e" } as any,
    hasCompany: true,
    loading: false,
    checked: true,
    refreshCompany: async () => null,
  }}>
    <TooltipProvider>
      <BankReconciliationReportModal open onClose={() => undefined} />
    </TooltipProvider>
  </CompanyContext.Provider>,
);
