import type { ChangeEventHandler, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleIncomeModal, type SaleIncomeModalMode, type SaleIncomeModalValues, type SaleIncomeSelectOption } from "./SaleIncomeModal";

const showFeedback = vi.fn();
vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, description, children, footer }: { open: boolean; title: string; description?: string; children: ReactNode; footer?: ReactNode }) => open
    ? <section role="dialog" aria-label={title}><p>{description}</p>{children}<footer>{footer}</footer></section>
    : null,
}));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback }) }));
vi.mock("@/shared/components/components/FloatingInput", () => ({
  FloatingInput: ({ label, name, value, disabled, readOnly, onChange, type = "text" }: { label: string; name?: string; value?: string | number; disabled?: boolean; readOnly?: boolean; onChange?: ChangeEventHandler<HTMLInputElement>; type?: string }) => <label>{label}<input aria-label={label} name={name} type={type} value={value ?? ""} disabled={disabled} readOnly={readOnly} onChange={onChange} /></label>,
}));
vi.mock("@/shared/components/components/date-picker/FloatingDatePicker", () => ({
  FloatingDatePicker: ({ label, name, disabled, onChange }: { label: string; name?: string; disabled?: boolean; onChange: (date: Date | null) => void }) => <label>{label}<input aria-label={label} name={name} type="date" disabled={disabled} onChange={(event) => onChange(event.target.value ? new Date(`${event.target.value}T00:00:00`) : null)} /></label>,
}));
vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({ label, name, value, options, disabled, onChange }: { label: string; name?: string; value: string; options: SaleIncomeSelectOption[]; disabled?: boolean; onChange: (value: string) => void }) => <label>{label}<select aria-label={label} name={name} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>,
}));
vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
}));

const values: SaleIncomeModalValues = {
  id: "income-1", version: 2, amount: 125.5, date: "2026-10-12", paymentMethodId: "method-1",
  companyPaymentAccountId: "account-1", operationNumber: "OP-1", note: "Detalle", reason: "Motivo válido",
  status: "POSTED", currency: "PEN",
};
const methodOptions: SaleIncomeSelectOption[] = [{ value: "method-1", label: "Transferencia", paymentMethodCode: "BANK_TRANSFER" }];
const bankAccountOptions: SaleIncomeSelectOption[] = [{ value: "account-1", label: "Cuenta PEN", accountType: "BANK_ACCOUNT" }];
const compatibleAccounts = (accounts: SaleIncomeSelectOption[]) => accounts;
const titles: Record<SaleIncomeModalMode, string> = {
  create: "Agregar pago", "edit-pending": "Modificar pago", "view-posted": "Detalle del ingreso",
  "correct-posted": "Corregir ingreso contabilizado", "view-cancelled": "Detalle del ingreso cancelado",
  "view-reversed": "Detalle del ingreso revertido", "view-unknown": "Detalle del ingreso (estado desconocido)", reenter: "Reingresar cobro",
};

function renderModal(mode: SaleIncomeModalMode, overrides: Partial<React.ComponentProps<typeof SaleIncomeModal>> = {}) {
  return render(<SaleIncomeModal open mode={mode} values={values} canViewEvidence={false} canUploadEvidence={false}
    methodOptions={methodOptions} bankAccountOptions={bankAccountOptions} getCompatibleAccounts={compatibleAccounts}
    onClose={vi.fn()} {...overrides} />);
}

describe("SaleIncomeModal", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it.each(Object.entries(titles) as Array<[SaleIncomeModalMode, string]>) ("renders the %s mode with its title and amount formatted to two decimals", (mode, title) => {
      renderModal(mode);
      expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
      expect(screen.getByLabelText("Monto")).toHaveValue(125.5);
      expect(screen.getByLabelText("Monto")).toHaveAttribute("value", "125.50");
    });

  it.each(["view-posted", "view-cancelled", "view-reversed", "view-unknown"] as const) ("keeps %s strictly read-only", (mode) => {
      renderModal(mode);
      for (const label of ["Monto", "Fecha de pago", "Método de cobro", "Cuenta receptora", "Número de operación", "Descripción"]) {
        expect(screen.getByLabelText(label)).toHaveAttribute("readonly", "");
        expect(screen.getByLabelText(label)).not.toBeDisabled();
      }
      expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    });

  it("leaves empty operation and description fields blank", () => {
    renderModal("edit-pending", { values: { ...values, operationNumber: "", note: "" } });
    expect(screen.getByLabelText(/operación/i)).toHaveValue("");
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("");
  });

  it.each([
    ["create", "Guardar pago"], ["edit-pending", "Guardar cambios"],
    ["correct-posted", "Corregir ingreso"], ["reenter", "Crear ingreso por confirmar"],
  ] as const)("exposes the correct save action for %s", (mode, action) => {
    renderModal(mode, { onSubmit: vi.fn() });
    expect(screen.getByRole("button", { name: action })).toBeEnabled();
    expect(screen.getByLabelText("Monto")).toBeEnabled();
  });

  it("requires a reason for correction and reentry modes", async () => {
    const onSubmit = vi.fn();
    const { rerender } = renderModal("correct-posted", { onSubmit, values: { ...values, reason: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Corregir ingreso" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(showFeedback).toHaveBeenCalled();

    rerender(<SaleIncomeModal open mode="reenter" values={{ ...values, reason: "" }} canViewEvidence={false} canUploadEvidence={false}
      methodOptions={methodOptions} bankAccountOptions={bankAccountOptions} getCompatibleAccounts={compatibleAccounts} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Crear ingreso por confirmar" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a replacement evidence file with the normalized amount", async () => {
    const onSubmit = vi.fn();
    const createObjectURL = vi.fn(() => "blob:replacement-preview");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(new URL("http://localhost"), { createObjectURL, revokeObjectURL }));
    const file = new File(["image"], "replacement.png", { type: "image/png" });
    renderModal("edit-pending", { onSubmit, canViewEvidence: true, canUploadEvidence: true, evidenceUrl: "blob:stored-evidence" });
    fireEvent.change(screen.getByLabelText("Cambiar imagen"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 125.5 }), file);
    vi.unstubAllGlobals();
  });
});
