import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncomePaymentEvidenceModal } from "./IncomePaymentEvidenceModal";

const { getEvidenceMock, getEvidenceContentMock, getEvidenceRevisionsMock, getEvidenceRevisionContentMock, getQuarantineMock, recoverQuarantineMock, showFeedback } = vi.hoisted(() => ({
  getEvidenceMock: vi.fn(),
  getEvidenceContentMock: vi.fn(),
  getEvidenceRevisionsMock: vi.fn(),
  getEvidenceRevisionContentMock: vi.fn(),
  getQuarantineMock: vi.fn(),
  recoverQuarantineMock: vi.fn(),
  showFeedback: vi.fn(),
}));
vi.mock("@/shared/services/incomeService", () => ({
  getIncomeEvidence: getEvidenceMock,
  getIncomeEvidenceContent: getEvidenceContentMock,
  getIncomeEvidenceRevisions: getEvidenceRevisionsMock,
  getIncomeEvidenceRevisionContent: getEvidenceRevisionContentMock,
  getIncomeEvidenceQuarantine: getQuarantineMock,
  recoverIncomeEvidenceQuarantine: recoverQuarantineMock,
}));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback }) }));
vi.mock("@/features/sale-orders/components/useSaleOrderPaymentOptions", () => ({
  useSaleOrderPaymentOptions: () => ({ methodOptions: [], bankAccountOptions: [] }),
  filterSaleOrderBankAccountOptions: (accounts: unknown[]) => accounts,
}));

const income = {
  incomeId: "income-1", version: 1, saleOrderId: "order-1", saleOrderNumber: "SO-1", clientName: "Cliente",
  amount: 100, method: "EFECTIVO", companyPaymentAccountId: null, companyPaymentAccountLabel: null,
  operationNumber: null, detail: null, date: "2026-10-01", createdAt: "2026-10-01", evidenceUrl: null,
  status: "PENDING_CONFIRMATION" as const,
};

describe("IncomePaymentEvidenceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEvidenceMock.mockResolvedValue({ status: "MISSING_OPTIONAL", available: false, attachmentId: null, url: null, originalName: null, mimeType: null, sizeBytes: null, createdAt: null, canView: true, canUpload: true });
    getEvidenceContentMock.mockResolvedValue("blob:income-proof");
    getEvidenceRevisionsMock.mockResolvedValue([]);
    getEvidenceRevisionContentMock.mockResolvedValue("blob:old-proof");
    getQuarantineMock.mockResolvedValue([]);
    recoverQuarantineMock.mockResolvedValue({ status: "COMPLETED" });
  });

  it("previews existing evidence without repeating payment summary or offering upload", async () => {
    getEvidenceMock.mockResolvedValueOnce({ status: "AVAILABLE", available: true, attachmentId: "evidence-1", url: "/private", originalName: "proof.png", mimeType: "image/png", sizeBytes: 100, createdAt: "2026-10-01", canView: true, canUpload: false });
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence onClose={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "Ver imagen grande" })).toBeInTheDocument();
    expect(getEvidenceContentMock).toHaveBeenCalledWith("income-1");
    expect(screen.queryByText("Monto")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /subir evidencia|cambiar imagen/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver imagen grande" }));
    expect(await screen.findByRole("link", { name: "Descargar imagen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar imagen" }));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("shows payment details when there is no image and does not fetch without permission", async () => {
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence={false} onClose={vi.fn()} />);

    expect(getEvidenceMock).not.toHaveBeenCalled();
    expect(screen.getByText("Monto")).toBeInTheDocument();
    expect(screen.getByText(/no tienes permiso para consultar/i)).toBeInTheDocument();
    await waitFor(() => expect(getEvidenceContentMock).not.toHaveBeenCalled());
  });

  it("shows legacy VOIDED as unknown rather than inferring a reversal", () => {
    render(<IncomePaymentEvidenceModal open income={{ ...income, status: "VOIDED" }} canViewEvidence={false} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Detalle del ingreso (estado desconocido)" })).toBeInTheDocument();
    expect(screen.getByText("Estado desconocido")).toBeInTheDocument();
    expect(screen.queryByText("Revertido")).not.toBeInTheDocument();
  });

  it("loads the authorized revision history and previews an older proof through the authenticated endpoint", async () => {
    getEvidenceRevisionsMock.mockResolvedValueOnce([
      {
        attachmentId: "revision-old", incomeId: "income-1", originalName: "proof-old.png", mimeType: "image/webp",
        sizeBytes: 2048, uploadedByUserId: "user-1", note: null, contentSha256: "a".repeat(64),
        createdAt: "2026-10-01T12:00:00.000Z", isCurrent: false,
      },
    ]);
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence canViewRevisionHistory onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ver historial (1)" }));
    expect(await screen.findByText("proof-old.png")).toBeInTheDocument();
    expect(screen.getByText(/Anterior ·/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver evidencia" }));

    await waitFor(() => expect(getEvidenceRevisionContentMock).toHaveBeenCalledWith("income-1", "revision-old"));
    expect(await screen.findByRole("button", { name: "Ver imagen grande" })).toBeInTheDocument();
    expect(screen.getByAltText("Evidencia del pago 1")).toHaveAttribute("src", "blob:old-proof");
  });

  it("does not request revision history when the audit permission is absent", async () => {
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence canViewRevisionHistory={false} onClose={vi.fn()} />);

    await waitFor(() => expect(getEvidenceRevisionsMock).not.toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Ver historial/ })).not.toBeInTheDocument();
  });

  it("shows quarantine metadata only with the recovery permission and recovers with an audited reason", async () => {
    getQuarantineMock.mockResolvedValueOnce([{
      id: "upload-op-1", incomeId: "income-1", saleOrderId: "order-1", uploadedByUserId: "user-1",
      originalName: "receipt.webp", mimeType: "image/webp", sizeBytes: 4096, errorCode: "INTEGRITY_REVIEW",
      attempts: 1, createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z", fileAvailable: true,
    }]);
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence={false} canManageEvidenceQuarantine onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ver revisión (1)" }));
    expect(await screen.findByText("receipt.webp")).toBeInTheDocument();
    expect(screen.getByText("Código: INTEGRITY_REVIEW")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Motivo de recuperación"), { target: { value: "Se confirmó el falso positivo" } });
    fireEvent.click(screen.getByRole("button", { name: "Validar y recuperar evidencia" }));

    await waitFor(() => expect(recoverQuarantineMock).toHaveBeenCalledWith("income-1", "upload-op-1", "Se confirmó el falso positivo"));
    expect(await screen.findByText("Evidencia recuperada y registrada en la auditoría.")).toBeInTheDocument();
    expect(screen.queryByText("receipt.webp")).not.toBeInTheDocument();
  });

  it("does not query or render quarantine controls without the audit/recovery permission", async () => {
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence={false} canManageEvidenceQuarantine={false} onClose={vi.fn()} />);
    await waitFor(() => expect(getQuarantineMock).not.toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Ver revisión/ })).not.toBeInTheDocument();
  });
});
