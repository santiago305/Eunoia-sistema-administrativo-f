import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExcelPreviewTable } from "./ExcelPreviewTable";
import type { ImportField, ImportUbigeoConfig } from "./excelImporter.types";

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
        validRowIndexes={new Set([0])}
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

  it("edits configured ubigeo fields as dependent selects using display names", async () => {
    const user = userEvent.setup();
    const onChangeCell = vi.fn();
    const ubigeoFields: ImportField[] = [
      { key: "departmentName", label: "Departamento", required: true },
      { key: "provinceName", label: "Provincia", required: true },
      { key: "districtName", label: "Distrito", required: true },
    ];
    const ubigeoConfig: ImportUbigeoConfig = {
      departmentKey: "departmentName",
      provinceKey: "provinceName",
      districtKey: "districtName",
      valueMode: "name",
      catalog: {
        departments: [
          { id: "15", name: "Lima" },
          { id: "04", name: "Arequipa" },
        ],
        provinces: [
          { id: "1501", name: "Lima", departmentId: "15" },
          { id: "0401", name: "Arequipa", departmentId: "04" },
        ],
        districts: [
          { id: "150122", name: "Miraflores", provinceId: "1501", departmentId: "15" },
          { id: "040101", name: "Arequipa", provinceId: "0401", departmentId: "04" },
        ],
      },
    };

    render(
      <ExcelPreviewTable
        fields={ubigeoFields}
        rows={[
          {
            departmentName: "",
            provinceName: "",
            districtName: "",
          },
        ]}
        errors={[]}
        selectedRowIndexes={new Set([0])}
        validRowIndexes={new Set([0])}
        ubigeoConfig={ubigeoConfig}
        onToggleRow={vi.fn()}
        onToggleAllRows={vi.fn()}
        onChangeCell={onChangeCell}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Editar fila 2" }));
    await user.click(screen.getByRole("button", { name: "Distrito" }));
    await user.click(screen.getByRole("option", { name: "Miraflores" }));

    expect(onChangeCell).toHaveBeenCalledWith(0, "departmentName", "Lima");
    expect(onChangeCell).toHaveBeenCalledWith(0, "provinceName", "Lima");
    expect(onChangeCell).toHaveBeenCalledWith(0, "districtName", "Miraflores");
  });
});
