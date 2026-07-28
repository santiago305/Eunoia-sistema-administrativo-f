import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfViewerModal } from "./ModalOpenPdf";

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <section role="dialog" aria-label={title}>
      {children}
    </section>
  ),
}));

describe("PdfViewerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:purchase-pdf"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("open", vi.fn());
  });

  it("opens the loaded pdf in a new browser tab", async () => {
    render(
      <PdfViewerModal
        open
        onClose={vi.fn()}
        title="Orden de compra"
        getPdf={() => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" }))}
      />,
    );

    await waitFor(() => expect(screen.getByTitle("Orden de compra")).toHaveAttribute("src", "blob:purchase-pdf"));

    fireEvent.click(screen.getByRole("button", { name: "Abrir PDF" }));

    expect(window.open).toHaveBeenCalledWith("blob:purchase-pdf", "_blank", "noopener,noreferrer");
  });
});
