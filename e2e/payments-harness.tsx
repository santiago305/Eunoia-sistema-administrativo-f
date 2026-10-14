import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  SaleIncomeModal,
  type SaleIncomeModalMode,
  type SaleIncomeModalValues,
  type SaleIncomeSelectOption,
} from "../src/shared/components/payments/SaleIncomeModal";
import "../src/app/styles/globals.css";
import "../src/app/styles/app.css";

const evidence =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='320'%3E%3Crect width='100%25' height='100%25' fill='%23fce7e7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%237f1d1d'%3EComprobante de prueba%3C/text%3E%3C/svg%3E";

const methods: SaleIncomeSelectOption[] = [
  { value: "transfer", label: "Transferencia", paymentMethodCode: "BANK_TRANSFER" },
];
const accounts: SaleIncomeSelectOption[] = [
  { value: "account-pen", label: "Cuenta PEN", accountType: "BANK_ACCOUNT" },
];
const getCompatibleAccounts = (items: SaleIncomeSelectOption[]) => items;

function PaymentsHarness() {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<SaleIncomeModalMode>("view-posted");
  const [submission, setSubmission] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const values: SaleIncomeModalValues = {
    id: "browser-income-1",
    version: 3,
    amount: 125.5,
    date: "2026-10-12",
    paymentMethodId: "transfer",
    companyPaymentAccountId: "account-pen",
    operationNumber: "OP-BROWSER-1",
    note: "Pago de prueba",
    reason: "",
    status: mode === "view-cancelled" ? "CANCELLED" : mode === "view-reversed" ? "REVERSED" : mode === "create" || mode === "edit-pending" || mode === "reenter" ? "PENDING_CONFIRMATION" : "POSTED",
    currency: "PEN",
    financialReason: mode === "view-reversed" ? "Ingreso revertido en prueba" : null,
    voidReason: mode === "view-cancelled" ? "Ingreso cancelado en prueba" : null,
  };

  return (
    <main>
      <output data-testid="submission-result">{submission}</output>
      <nav aria-label="Seleccionar modo después de cerrar" className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setErrorMessage(null); setMode("view-posted"); setOpen(true); }}>Consultar contabilizado</button>
        <button type="button" onClick={() => { setErrorMessage(null); setMode("edit-pending"); setOpen(true); }}>Editar pendiente</button>
        <button type="button" onClick={() => { setErrorMessage(null); setMode("create"); setOpen(true); }}>Crear pago</button>
        <button type="button" onClick={() => { setErrorMessage(null); setMode("correct-posted"); setOpen(true); }}>Corregir contabilizado</button>
        <button type="button" onClick={() => { setErrorMessage(null); setMode("view-cancelled"); setOpen(true); }}>Consultar cancelado</button>
        <button type="button" onClick={() => { setErrorMessage(null); setMode("view-reversed"); setOpen(true); }}>Consultar revertido</button>
        <button type="button" onClick={() => { setErrorMessage(null); setMode("reenter"); setOpen(true); }}>Reingresar cobro</button>
      </nav>
      <SaleIncomeModal
        open={open}
        mode={mode}
        values={values}
        evidenceUrl={mode === "create" ? null : evidence}
        canViewEvidence
        canUploadEvidence={mode === "edit-pending" || mode === "create" || mode === "correct-posted"}
        errorMessage={errorMessage}
        methodOptions={methods}
        bankAccountOptions={accounts}
        getCompatibleAccounts={getCompatibleAccounts}
        extraContent={
          <nav aria-label="Modo de la prueba" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setErrorMessage(null); setMode("view-posted"); }}>Consultar contabilizado</button>
            <button type="button" onClick={() => { setErrorMessage(null); setMode("edit-pending"); }}>Editar pendiente</button>
            <button type="button" onClick={() => { setErrorMessage(null); setMode("create"); }}>Crear pago</button>
            <button type="button" onClick={() => { setErrorMessage(null); setMode("correct-posted"); }}>Corregir contabilizado</button>
            <button type="button" onClick={() => { setErrorMessage(null); setMode("view-cancelled"); }}>Consultar cancelado</button>
            <button type="button" onClick={() => { setErrorMessage(null); setMode("view-reversed"); }}>Consultar revertido</button>
            <button type="button" onClick={() => { setErrorMessage(null); setMode("reenter"); }}>Reingresar cobro</button>
          </nav>
        }
        onClose={() => setOpen(false)}
        onSubmit={(formValues, file) => {
          if (mode === "edit-pending" && formValues.operationNumber === "OP-TAKEN") {
            setErrorMessage("Ese número de operación ya está registrado.");
            return;
          }
          setErrorMessage(null);
          setSubmission(JSON.stringify({
            mode,
            amount: formValues.amount,
            operationNumber: formValues.operationNumber,
            reason: formValues.reason,
            fileName: file?.name ?? null,
          }));
        }}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<PaymentsHarness />);
