import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OperationImageGallery } from "./OperationImageGallery";

describe("OperationImageGallery", () => {
  it("uses the empty image area itself as the upload control", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(
      <OperationImageGallery
        images={[]}
        canUpload
        emptyMessage="No hay comprobante."
        onUpload={onUpload}
      />,
    );

    expect(screen.queryByText("No hay comprobante.")).not.toBeInTheDocument();

    const input = screen.getByLabelText("Subir imagen");
    expect(input).toHaveClass("sr-only");

    const file = new File(["voucher"], "voucher.png", { type: "image/png" });
    await user.upload(input, file);

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("keeps the empty message when upload is disabled", () => {
    render(
      <OperationImageGallery
        images={[]}
        emptyMessage="No hay comprobante."
      />,
    );

    expect(screen.getByText("No hay comprobante.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Subir imagen")).not.toBeInTheDocument();
  });
});
