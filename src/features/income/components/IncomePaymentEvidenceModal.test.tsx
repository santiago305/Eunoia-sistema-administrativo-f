import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncomePaymentEvidenceModal } from "./IncomePaymentEvidenceModal";

const { getEvidenceMock, uploadEvidenceMock } = vi.hoisted(() => ({ getEvidenceMock: vi.fn(), uploadEvidenceMock: vi.fn() }));
vi.mock("@/shared/services/incomeService", () => ({ getIncomeEvidence: getEvidenceMock, uploadIncomeEvidence: uploadEvidenceMock }));

const income = { incomeId: "income-1", saleOrderId: "order-1", saleOrderNumber: "SO-1", clientName: "Cliente", amount: 100, method: "EFECTIVO", companyPaymentAccountId: null, companyPaymentAccountLabel: null, operationNumber: null, detail: null, date: "2026-10-01", createdAt: "2026-10-01", evidenceUrl: null, status: "POSTED" as const };

describe("IncomePaymentEvidenceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEvidenceMock.mockResolvedValue({ status: "MISSING_REQUIRED", attachmentId: null, url: null, originalName: null, mimeType: null, sizeBytes: null, createdAt: null, canView: true, canUpload: true });
    uploadEvidenceMock.mockResolvedValue({ type: "success", message: "ok" });
  });

  it("loads evidence and uploads only the selected image", async () => {
    const onUploaded = vi.fn();
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence canAttachEvidence onClose={vi.fn()} onUploaded={onUploaded} />);
    expect(await screen.findByText(/este ingreso no tiene evidencia/i)).toBeInTheDocument();
    const file = new File(["image"], "proof.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/seleccionar evidencia/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /subir evidencia/i }));
    await waitFor(() => expect(uploadEvidenceMock).toHaveBeenCalledWith("income-1", file));
    expect(onUploaded).toHaveBeenCalled();
  });

  it("hides evidence contents when view permission is missing", () => {
    render(<IncomePaymentEvidenceModal open income={income} canViewEvidence={false} canAttachEvidence onClose={vi.fn()} />);
    expect(getEvidenceMock).not.toHaveBeenCalled();
    expect(screen.getByText(/no tienes permiso para ver/i)).toBeInTheDocument();
  });
});
