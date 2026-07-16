import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportPopover, type ExportColumn } from "./ExportPopover";

const getColumnRow = (label: string) => {
  const row = screen.getByText(label).closest("[draggable]");
  if (!row) throw new Error(`No row found for ${label}`);
  return row as HTMLElement;
};

const getRenderedColumnLabels = () =>
  screen
    .getAllByText(/Numero|Cliente|Total/)
    .map((element) => element.textContent);

describe("ExportPopover", () => {
  it("renders dragged columns in the selected export order", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const columns: ExportColumn[] = [
      { key: "number", label: "Numero" },
      { key: "client", label: "Cliente" },
      { key: "total", label: "Total" },
    ];

    render(<ExportPopover columns={columns} onExport={onExport} />);

    await user.click(screen.getByRole("button", { name: "Exportar" }));

    fireEvent.dragStart(getColumnRow("Total"));
    fireEvent.dragOver(getColumnRow("Numero"));
    fireEvent.drop(getColumnRow("Numero"));

    await waitFor(() => {
      expect(getRenderedColumnLabels()).toEqual(["Total", "Numero", "Cliente"]);
    });

    await user.click(screen.getAllByText("Exportar").at(-1)!);

    expect(onExport).toHaveBeenCalledWith([
      { key: "total", label: "Total" },
      { key: "number", label: "Numero" },
      { key: "client", label: "Cliente" },
    ]);
  });
});
