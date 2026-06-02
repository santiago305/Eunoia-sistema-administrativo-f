import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExcelPreviewTable } from "./ExcelPreviewTable";
import type { ImportField } from "./excelImporter.types";

const fields: ImportField[] = [
  {
    key: "name",
    label: "Nombre",
    type: "string",
    required: true,
  },
  {
    key: "active",
    label: "Activo",
    type: "boolean",
  },
];

describe("ExcelPreviewTable", () => {
  it("renders cells as text until a row is enabled for editing", async () => {
    render(
      <ExcelPreviewTable
        fields={fields}
        rows={[
          {
            name: "Producto A",
            active: true,
          },
        ]}
        errors={[]}
        selectedRowIndexes={new Set([0])}
        onToggleRow={vi.fn()}
        onToggleAllRows={vi.fn()}
        onChangeCell={vi.fn()}
      />,
    );

    expect(screen.getByText("Producto A")).toBeTruthy();
    expect(screen.queryByLabelText("Nombre")).toBeNull();
    expect(screen.queryByLabelText("Activo")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Editar fila 2" }));

    expect(screen.getByLabelText("Nombre")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Activo: Sí" })).toBeTruthy();
  });
});
