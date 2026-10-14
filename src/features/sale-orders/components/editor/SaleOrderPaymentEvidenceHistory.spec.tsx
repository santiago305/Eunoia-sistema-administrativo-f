import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderPaymentEvidenceHistory } from "./SaleOrderPaymentEvidenceHistory";

const { listRevisions, getRevisionContent } = vi.hoisted(() => ({
  listRevisions: vi.fn(),
  getRevisionContent: vi.fn(),
}));

vi.mock("@/shared/services/incomeService", () => ({
  getIncomeEvidenceRevisions: listRevisions,
  getIncomeEvidenceRevisionContent: getRevisionContent,
}));

const revisions = [{
  attachmentId: "revision-1",
  incomeId: "income-1",
  originalName: "comprobante-anterior.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  uploadedByUserId: "user-1",
  note: null,
  contentSha256: "safe-hash",
  createdAt: "2026-10-13T15:00:00.000Z",
  isCurrent: false,
}];

describe("SaleOrderPaymentEvidenceHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRevisions.mockResolvedValue(revisions);
    getRevisionContent.mockResolvedValue("blob:historical-evidence");
  });

  it("loads metadata and displays the selected revision using the authenticated blob URL", async () => {
    const user = userEvent.setup();
    render(<SaleOrderPaymentEvidenceHistory incomeId="income-1" />);

    await waitFor(() => expect(listRevisions).toHaveBeenCalledWith("income-1", 50));
    await user.click(screen.getByRole("button", { name: "Ver historial (1)" }));
    expect(screen.getByText("comprobante-anterior.jpg")).toBeInTheDocument();
    expect(screen.getByText(/Anterior ·/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver evidencia" }));

    await waitFor(() => expect(getRevisionContent).toHaveBeenCalledWith("income-1", "revision-1"));
    expect(screen.getByRole("img", { name: "Versión de evidencia del pago 1" })).toHaveAttribute("src", "blob:historical-evidence");
  });

  it("offers a retry after a failed revision listing", async () => {
    listRevisions.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<SaleOrderPaymentEvidenceHistory incomeId="income-1" />);
    await user.click(screen.getByRole("button", { name: "Ver historial" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar o abrir la evidencia");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(listRevisions).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("comprobante-anterior.jpg")).toBeInTheDocument();
  });
});
