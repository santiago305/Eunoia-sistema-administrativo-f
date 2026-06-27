import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PurchaseAttachmentViewer } from "./PurchaseAttachmentViewer";
import { PurchaseAttachmentTypes, type PurchaseAttachment } from "@/features/purchases/types/purchase-attachment.types";

vi.mock("@/env", () => ({
  env: { apiBaseUrl: "https://api.test/" },
}));

const baseAttachment: PurchaseAttachment = {
  attachmentId: "attachment-1",
  purchaseId: "purchase-1",
  paymentId: null,
  receptionId: null,
  type: PurchaseAttachmentTypes.INVOICE,
  filename: "factura.png",
  originalName: "Factura.png",
  mimeType: "image/png",
  sizeBytes: 2048,
  url: "purchase-attachments/factura.png",
  note: null,
  uploadedByUserId: null,
  createdAt: "2026-06-27T10:00:00.000Z",
};

describe("PurchaseAttachmentViewer", () => {
  it("renders attachments in a responsive grid instead of a row table layout", () => {
    render(
      <PurchaseAttachmentViewer
        attachments={[
          baseAttachment,
          { ...baseAttachment, attachmentId: "attachment-2", originalName: "Boleta.png" },
          { ...baseAttachment, attachmentId: "attachment-3", originalName: "Recibo.png" },
          { ...baseAttachment, attachmentId: "attachment-4", originalName: "Factura 2.png" },
        ]}
      />,
    );

    expect(screen.getByTestId("purchase-attachment-grid-fiscal")).toHaveClass("sm:grid-cols-2");
    expect(screen.getByTestId("purchase-attachment-viewer")).toHaveClass("max-h-[68vh]");
  });

  it("previews image attachments inside the app instead of rendering external links", async () => {
    const user = userEvent.setup();

    render(<PurchaseAttachmentViewer attachments={[baseAttachment]} />);

    expect(screen.queryByRole("link", { name: /factura\.png/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ver factura\.png/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByAltText("Factura.png")).toBeInTheDocument();
  });

  it("previews pdf attachments inside the same modal", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseAttachmentViewer
        attachments={[
          {
            ...baseAttachment,
            attachmentId: "attachment-pdf",
            originalName: "Factura.pdf",
            filename: "factura.pdf",
            mimeType: "application/pdf",
            url: "purchase-attachments/factura.pdf",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /ver factura\.pdf/i }));

    expect(screen.getByRole("dialog", { name: /factura\.pdf/i })).toBeInTheDocument();
    expect(screen.getByTitle("Factura.pdf")).toHaveAttribute("src", "https://api.test/purchase-attachments/factura.pdf");
  });
});
