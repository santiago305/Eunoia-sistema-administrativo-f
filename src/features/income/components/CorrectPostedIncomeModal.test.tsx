import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CorrectPostedIncomeModal } from "./CorrectPostedIncomeModal";
import { listAllPendingIncomeOperations } from "../services/income-operation-recovery";

const mocks = vi.hoisted(() => ({
  correct: vi.fn(), upload: vi.fn(), evidence: vi.fn(), evidenceContent: vi.fn(), showFeedback: vi.fn(),
}));

vi.mock("@/shared/services/incomeService", () => ({
  correctPostedIncome: mocks.correct,
  uploadCorrectedIncomeEvidence: mocks.upload,
  getIncomeEvidence: mocks.evidence,
  getIncomeEvidenceContent: mocks.evidenceContent,
}));
vi.mock("@/features/sale-orders/components/useSaleOrderPaymentOptions", () => ({
  useSaleOrderPaymentOptions: () => ({ methodOptions: [{ value: "method-1", label: "Transferencia", paymentMethodCode: "BANK_TRANSFER" }], bankAccountOptions: [{ value: "account-1", label: "Banco principal", accountType: "BANK" }] }),
  filterSaleOrderBankAccountOptions: (options: unknown[]) => options,
}));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback: mocks.showFeedback }) }));
vi.mock("@/shared/hooks/useAuth", () => ({ useAuth: () => ({ userId: "user-1" }) }));
vi.mock("@/shared/components/modales/Modal", () => ({ Modal: ({ open, title, description, children, footer }: any) => open ? <section><h2>{title}</h2><p>{description}</p>{children}{footer}</section> : null }));
vi.mock("@/shared/components/components/SystemButton", () => ({ SystemButton: ({ children, onClick, disabled }: any) => <button type="button" disabled={disabled} onClick={onClick}>{children}</button> }));
vi.mock("@/shared/components/components/FloatingInput", () => ({ FloatingInput: ({ label, value, onChange, disabled, readOnly }: any) => <label>{label}<input aria-label={label} value={value} disabled={disabled} readOnly={readOnly} onChange={onChange} /></label> }));
vi.mock("@/shared/components/components/FloatingSelect", () => ({ FloatingSelect: ({ label, value, options, onChange, disabled }: any) => <label>{label}<select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }));
vi.mock("@/shared/components/components/date-picker/FloatingDatePicker", () => ({ FloatingDatePicker: ({ label, value, onChange, disabled }: any) => <label>{label}<input aria-label={label} type="date" disabled={disabled} value={value ? value.toISOString().slice(0, 10) : ""} onChange={(event) => onChange(event.target.value ? new Date(`${event.target.value}T12:00:00`) : null)} /></label> }));
vi.mock("@/shared/components/components/OperationImageGallery", () => ({ OperationImageGallery: ({ canUpload, onUpload }: any) => <button type="button" aria-label="Cambiar evidencia" disabled={!canUpload} onClick={() => onUpload(new File(["proof"], "proof.png", { type: "image/png" }))}>Cambiar evidencia</button> }));

const income = {
  incomeId: "income-1", version: 4, saleOrderId: "order-1", saleOrderNumber: "SO-1", clientName: "Cliente",
  amount: 125.5, method: "Transferencia", paymentMethodId: "method-1", companyPaymentAccountId: "account-1",
  companyPaymentAccountLabel: "Banco principal", operationNumber: "OP-1", detail: "Anticipo", date: "2026-10-01",
  paymentDate: "2026-10-01", createdAt: "2026-10-01", evidenceUrl: null, status: "POSTED" as const,
};

describe("CorrectPostedIncomeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.evidence.mockResolvedValue({ available: false, url: null });
    mocks.correct.mockResolvedValue({ incomeId: "income-corrected-1" });
    mocks.upload.mockResolvedValue({});
  });

  it("uses the correction command and attaches replacement evidence to the new row", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<CorrectPostedIncomeModal open income={income} canViewEvidence canReplaceEvidence onClose={onClose} onSaved={onSaved} />);

    await screen.findByRole("button", { name: "Cambiar evidencia" });
    fireEvent.change(screen.getByLabelText("Motivo de la corrección"), { target: { value: "El importe fue digitado incorrectamente" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Corregir ingreso" }));

    await waitFor(() => expect(mocks.correct).toHaveBeenCalledWith("income-1", expect.objectContaining({ version: 4, amount: 125.5, reason: "El importe fue digitado incorrectamente", idempotencyKey: expect.any(String) })));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith("income-corrected-1", expect.any(File), expect.stringMatching(/^[0-9a-f-]{36}$/i)));
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(listAllPendingIncomeOperations("user-1")).toEqual([]);
  });

  it("offers evidence-only retry after the correction is committed", async () => {
    mocks.upload.mockRejectedValueOnce(new Error("storage unavailable"));
    render(<CorrectPostedIncomeModal open income={income} canViewEvidence={false} canReplaceEvidence onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Motivo de la corrección"), { target: { value: "El importe fue digitado incorrectamente" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Corregir ingreso" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar evidencia" })).toBeInTheDocument());
    expect(mocks.correct).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Monto")).toHaveAttribute("readonly", "");
    expect(screen.getByLabelText("Monto")).not.toBeDisabled();
    mocks.upload.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole("button", { name: "Guardar evidencia" }));
    await waitFor(() => expect(mocks.correct).toHaveBeenCalledTimes(1));
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.upload.mock.calls[1][2]).toBe(mocks.upload.mock.calls[0][2]);
  });

  it("retains the exact correction command and closes the modal if the response is lost", async () => {
    mocks.correct.mockRejectedValueOnce(new Error("network disconnected"));
    const onClose = vi.fn();
    const onCorrectionPending = vi.fn();
    render(<CorrectPostedIncomeModal open income={income} canViewEvidence={false} canReplaceEvidence onClose={onClose} onSaved={vi.fn()} onCorrectionPending={onCorrectionPending} />);
    fireEvent.change(screen.getByLabelText(/Motivo de la correcci/), { target: { value: "El importe fue digitado incorrectamente" } });
    fireEvent.click(screen.getByRole("button", { name: "Corregir ingreso" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const [operation] = listAllPendingIncomeOperations("user-1");
    expect(operation).toMatchObject({
      operationId: "income.correct:income-1", incomeId: "income-1", kind: "income.correct",
      idempotencyKey: mocks.correct.mock.calls[0][1].idempotencyKey,
      payload: { version: 4, amount: 125.5, reason: "El importe fue digitado incorrectamente" },
    });
    expect(onCorrectionPending).toHaveBeenCalledWith(operation);
  });
});
