import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { IncomePendingEditModal } from "./IncomePendingEditModal";

type MockSelectOption = { value: string; label: string };

const { editPending, uploadEvidence, showFeedback } = vi.hoisted(() => ({
  editPending: vi.fn(),
  uploadEvidence: vi.fn(),
  showFeedback: vi.fn(),
}));

vi.mock("@/shared/services/incomeService", () => ({
  editPendingIncome: editPending,
  uploadIncomeEvidence: uploadEvidence,
  getIncomeEvidence: vi.fn(),
  getIncomeEvidenceContent: vi.fn(),
}));
vi.mock("@/features/sale-orders/components/useSaleOrderPaymentOptions", () => ({
  useSaleOrderPaymentOptions: () => ({
    methodOptions: [{ value: "method-1", label: "Transferencia", paymentMethodCode: "BANK_TRANSFER" }],
    bankAccountOptions: [{ value: "account-1", label: "Banco principal", accountType: "BANK" }],
  }),
  filterSaleOrderBankAccountOptions: (options: unknown[]) => options,
}));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback }) }));
vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, description, children, footer }: { open: boolean; title: string; description?: string; children?: ReactNode; footer?: ReactNode }) => open ? <section><h2>{title}</h2><p>{description}</p>{children}{footer}</section> : null,
}));
vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({ label, value, options, onChange }: { label: string; value: string; options: MockSelectOption[]; onChange: (value: string) => void }) => <label>{label}<select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>,
}));
vi.mock("@/shared/components/components/date-picker/FloatingDatePicker", () => ({
  FloatingDatePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (value: Date | null) => void }) => <label>{label}<input aria-label={label} type="date" value={value ? value.toISOString().slice(0, 10) : ""} onChange={(event) => onChange(event.target.value ? new Date(`${event.target.value}T12:00:00`) : null)} /></label>,
}));
vi.mock("@/shared/components/components/OperationImageGallery", () => ({
  OperationImageGallery: ({ canUpload, onUpload }: { canUpload: boolean; onUpload: (file: File) => void }) => <div><button type="button" aria-label="Cambiar evidencia" disabled={!canUpload} onClick={() => onUpload(new File(["image"], "proof.png", { type: "image/png" }))}>Evidencia</button></div>,
}));

const income = {
  incomeId: "income-1", version: 4, saleOrderId: "order-1", saleOrderNumber: "SO-1", clientName: "Cliente",
  amount: 125.5, method: "Transferencia", paymentMethodId: "method-1", companyPaymentAccountId: "account-1",
  companyPaymentAccountLabel: "Banco principal", operationNumber: "OP-1", detail: "Anticipo", date: "2026-10-01",
  paymentDate: "2026-10-01", createdAt: "2026-10-01", evidenceUrl: null, status: "PENDING_CONFIRMATION" as const,
};

describe("IncomePendingEditModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    editPending.mockResolvedValue({ incomeId: "income-1", version: 5 });
    uploadEvidence.mockResolvedValue({});
  });

  it("edits pending income and uploads the replacement evidence from the same modal", async () => {
    const onSaved = vi.fn();
    render(<IncomePendingEditModal open income={income} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "140.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(editPending).toHaveBeenCalledWith("income-1", expect.objectContaining({ version: 4, amount: 140.25, date: "2026-10-01", paymentMethodId: "method-1", companyPaymentAccountId: "account-1" })));
    await waitFor(() => expect(uploadEvidence).toHaveBeenCalledWith("income-1", expect.any(File), expect.stringMatching(/^[0-9a-f-]{36}$/i)));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(showFeedback).toHaveBeenCalled();
  });

  it("keeps the fields saved and allows evidence retry if evidence upload fails", async () => {
    uploadEvidence.mockRejectedValueOnce(new Error("storage unavailable"));
    const onSaved = vi.fn();
    render(<IncomePendingEditModal open income={income} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "Cambiar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(editPending).toHaveBeenCalledTimes(1);
    expect(uploadEvidence).toHaveBeenCalledTimes(1);
    expect(showFeedback).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Los datos se guardaron") }));
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("shows uncertain evidence recovery before waiting for the income refresh", async () => {
    uploadEvidence.mockRejectedValueOnce(new Error("network disconnected"));
    let finishRefresh!: () => void;
    const onSaved = vi.fn(() => new Promise<void>((resolve) => { finishRefresh = resolve; }));
    render(<IncomePendingEditModal open income={income} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "Cambiar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/respuesta de la carga de evidencia/i)).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
    finishRefresh();
  });

  it("recovers an evidence upload after remount with the same UUID key", async () => {
    uploadEvidence.mockRejectedValueOnce(new Error("network disconnected"));
    const onSaved = vi.fn();
    const firstRender = render(<IncomePendingEditModal open income={income} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await screen.findByText(/respuesta de la carga de evidencia/i);
    const firstKey = uploadEvidence.mock.calls[0][2];
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sessionStorage.getItem("eunoia:income-pending-operations:user-1")).toContain("income.evidence-upload:income-1");
    firstRender.unmount();

    render(<IncomePendingEditModal open income={income} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={vi.fn()} onSaved={onSaved} />);
    await screen.findByText(/respuesta de la carga de evidencia/i);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar evidencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(uploadEvidence).toHaveBeenCalledTimes(2));
    expect(uploadEvidence.mock.calls[1][2]).toBe(firstKey);
    expect(sessionStorage.getItem("eunoia:income-pending-operations:user-1")).toBeNull();
  });

  it.each([
    ["duplicate operation", "Ese número de operación ya está registrado."],
    ["stale version", "El ingreso cambió. Actualiza la información antes de guardar."],
    ["archived order", "El pedido está archivado."],
  ])("keeps the editor available and announces a %s conflict", async (_caseName, message) => {
    editPending.mockRejectedValueOnce({
      response: { status: 409, data: { message } },
    });
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<IncomePendingEditModal open income={income} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={onClose} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Monto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  });

  it("recovers an uncertain edit after remount with the same idempotency key and payload", async () => {
    editPending.mockRejectedValueOnce(new Error("network unavailable"));
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const firstRender = render(<IncomePendingEditModal open income={income} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={onClose} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Descripci.n/), { target: { value: "Cambio financiero" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await screen.findByRole("button", { name: /Reintentar/ });
    expect(editPending).toHaveBeenCalledTimes(1);
    const firstRequest = editPending.mock.calls[0][1];
    expect(firstRequest).toMatchObject({ idempotencyKey: expect.any(String), version: 4, note: "Cambio financiero" });
    firstRender.unmount();

    render(<IncomePendingEditModal open income={{ ...income, version: 5, detail: "Cambio financiero" }} userId="user-1" canViewEvidence={false} canAttachEvidence onClose={onClose} onSaved={onSaved} />);
    await screen.findByRole("button", { name: /Reintentar/ });
    fireEvent.click(screen.getByRole("button", { name: /Reintentar edici.n guardada/ }));

    await waitFor(() => expect(editPending).toHaveBeenCalledTimes(2));
    expect(editPending.mock.calls[1][1]).toEqual(firstRequest);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem("eunoia:income-pending-operations:user-1")).toBeNull();
  });
});
