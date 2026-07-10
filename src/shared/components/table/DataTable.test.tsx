import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";
import { TooltipProvider } from "@/shared/components/ui/tooltip";

vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("DataTable refresh action", () => {
  const columns = [{ id: "name", header: "Nombre", accessorKey: "name" as const }];
  const data = [{ id: "1", name: "Compra demo" }];

  it("keeps the reusable refresh button hidden when refreshAction.visible is false", () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="refresh-hidden-test"
          data={data}
          columns={columns}
          rowKey="id"
          selectableColumns
          refreshAction={{
            visible: false,
            onRefresh: vi.fn(),
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.queryByRole("button", { name: /recargar/i })).not.toBeInTheDocument();
  });

  it("shows the reusable refresh button when refreshAction.visible is true", () => {
    const onRefresh = vi.fn();

    render(
      <TooltipProvider>
        <DataTable
          tableId="refresh-visible-test"
          data={data}
          columns={columns}
          rowKey="id"
          refreshAction={{
            visible: true,
            onRefresh,
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /recargar/i }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("DataTable toolbar actions", () => {
  const columns = [{ id: "name", header: "Nombre", accessorKey: "name" as const }];
  const data = [{ id: "1", name: "Pedido demo" }];

  it("renders page actions beside the column manager", () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="toolbar-actions-test"
          data={data}
          columns={columns}
          rowKey="id"
          selectableColumns
          toolbarActions={<button type="button">Importar</button>}
        />
      </TooltipProvider>,
    );

    const importButton = screen.getByRole("button", { name: "Importar" });
    const columnsButton = screen.getByRole("button", { name: "Columnas" });
    const toolbarActions = screen.getByRole("group", { name: "Acciones de tabla" });

    expect(toolbarActions).toContainElement(importButton);
    expect(toolbarActions).toContainElement(columnsButton);
  });
});

describe("DataTable smart range date", () => {
  const columns = [{ id: "name", header: "Nombre", accessorKey: "name" as const }];
  const data = [{ id: "1", name: "Pedido demo" }];

  it("renders the smart range date control from the toolbar", async () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="smart-range-date-test"
          data={data}
          columns={columns}
          rowKey="id"
          smartRangeDate={{
            fieldId: "createdAt",
            value: {
              field: "createdAt",
              operator: "inMonth",
              value: "2026-07",
            },
            operators: {
              range: "between",
              week: "inWeek",
              month: "inMonth",
            },
            onChange: vi.fn(),
            label: "Fecha creacion",
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.queryByRole("button", { name: "Mes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fecha creacion" })).toHaveTextContent(
      /julio 2026/,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fecha creacion" }));

    expect(await screen.findByText("Meses")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("prefers smartRangeDate over the legacy rangeDates control", () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="smart-range-date-precedence-test"
          data={data}
          columns={columns}
          rowKey="id"
          smartRangeDate={{
            fieldId: "createdAt",
            value: null,
            operators: {
              range: "between",
              week: "inWeek",
              month: "inMonth",
            },
            onChange: vi.fn(),
            label: "Fecha creacion",
          }}
          rangeDates={{
            startDate: new Date(2026, 6, 1),
            endDate: new Date(2026, 6, 10),
            onChange: vi.fn(),
            label: "Fecha legacy",
            name: "legacy-range",
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Fecha creacion" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fecha legacy" })).not.toBeInTheDocument();
  });
});

describe("DataTable range dates", () => {
  const columns = [{ id: "name", header: "Nombre", accessorKey: "name" as const }];
  const data = [{ id: "1", name: "Compra demo" }];

  it("renders quick range presets from the rangeDates toolbar control", async () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-presets-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: null,
            endDate: null,
            onChange: vi.fn(),
            label: "Fechas",
            name: "range-dates",
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechas" }));

    expect(await screen.findByRole("button", { name: "Ultimos 7 dias" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ultimos 90 dias" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desde inicio de mes hasta ahora" })).toBeInTheDocument();
  });

  it("uses one shared calendar navigation for both visible months", async () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-shared-navigation-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: new Date(2026, 6, 1),
            endDate: new Date(2026, 6, 7),
            onChange: vi.fn(),
            label: "Fechas",
            name: "range-dates-shared-navigation",
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechas" }));

    expect(await screen.findByText("Julio 2026")).toBeInTheDocument();
    expect(screen.getByText("Agosto 2026")).toBeInTheDocument();
    expect(document.querySelectorAll('button[aria-label="Mes anterior"]')).toHaveLength(1);
    expect(document.querySelectorAll('button[aria-label="Mes siguiente"]')).toHaveLength(1);
  });

  it("renders range options before the calendars", async () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-options-position-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: null,
            endDate: null,
            onChange: vi.fn(),
            label: "Fechas",
            name: "range-dates-options-position",
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechas" }));

    const option = await screen.findByRole("button", { name: "Hoy" });
    const calendarTitle = await screen.findByText("Julio 2026");

    expect(option.compareDocumentPosition(calendarTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("clears the selected range from the trigger clear action", async () => {
    const onChange = vi.fn();

    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-trigger-clear-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: new Date(2026, 6, 1),
            endDate: new Date(2026, 6, 7),
            onChange,
            label: "Fechas",
            name: "range-dates-trigger-clear",
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpiar Fechas" }));

    expect(onChange).toHaveBeenCalledWith({ startDate: null, endDate: null });
    expect(screen.queryByRole("dialog", { name: "Fechas: rango de fechas" })).not.toBeInTheDocument();
  });

  it("shows a single date when start and end are the same day", () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-same-day-label-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: new Date(2026, 6, 9),
            endDate: new Date(2026, 6, 9),
            onChange: vi.fn(),
            label: "Fechas",
            name: "range-dates-same-day-label",
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Fechas" })).toHaveTextContent("09/07/2026");
    expect(screen.getByRole("button", { name: "Fechas" })).not.toHaveTextContent(
      "09/07/2026 - 09/07/2026",
    );
  });

  it("does not apply range styling to adjacent-month days", async () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-adjacent-month-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: new Date(2026, 6, 30),
            endDate: new Date(2026, 7, 2),
            onChange: vi.fn(),
            label: "Fechas",
            name: "range-dates-adjacent-month",
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechas" }));

    const augustFirstButtons = await screen.findAllByRole("button", {
      name: "1 agosto 2026",
      hidden: true,
    });
    const adjacentAugustFirst = augustFirstButtons[0];

    expect(adjacentAugustFirst).not.toHaveClass("bg-primary/10");
  });

  it("previews a range when hovering before the selected start date", async () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-backward-preview-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: new Date(2026, 6, 10),
            endDate: null,
            onChange: vi.fn(),
            label: "Fechas",
            name: "range-dates-backward-preview",
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechas" }));
    const julyEight = await screen.findByRole("button", { name: "8 julio 2026" });

    fireEvent.mouseEnter(julyEight);

    expect(julyEight).toHaveClass("bg-primary/10");
  });

  it("renders the optional date field selector when rangeDates fields are configured", async () => {
    const onFieldChange = vi.fn();

    render(
      <TooltipProvider>
        <DataTable
          tableId="range-dates-field-test"
          data={data}
          columns={columns}
          rowKey="id"
          rangeDates={{
            startDate: null,
            endDate: null,
            onChange: vi.fn(),
            label: "Fechas",
            name: "range-dates-field",
            fields: [
              { value: "createdAt", label: "Fecha creacion" },
              { value: "deliveryDate", label: "Fecha entrega" },
            ],
            fieldValue: "createdAt",
            onFieldChange,
          }}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechas" }));

    const fieldSelector = await screen.findByRole("button", { name: "Campo fecha: Fecha creacion" });
    fireEvent.click(fieldSelector);
    fireEvent.mouseDown(await screen.findByRole("option", { name: "Fecha entrega" }));

    expect(onFieldChange).toHaveBeenCalledWith("deliveryDate");
  });
});

describe("DataTable copy columns", () => {
  const data = [{ id: "1", name: "Cliente demo" }];

  it("enables text selection without row click when column copy is true", () => {
    const onRowClick = vi.fn();

    render(
      <TooltipProvider>
        <DataTable
          tableId="copy-column-test"
          data={data}
          columns={[{ id: "name", header: "Nombre", accessorKey: "name", copy: true }]}
          rowKey="id"
          onRowClick={onRowClick}
        />
      </TooltipProvider>,
    );

    const cell = screen.getByText("Cliente demo").closest("td");

    expect(cell).toHaveClass("!select-text");
    expect(cell).toHaveClass("cursor-text");

    fireEvent.mouseDown(cell!);
    fireEvent.click(cell!);

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("keeps text selection disabled by default", () => {
    render(
      <TooltipProvider>
        <DataTable
          tableId="copy-column-default-test"
          data={data}
          columns={[{ id: "name", header: "Nombre", accessorKey: "name" }]}
          rowKey="id"
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("Cliente demo").closest("td")).not.toHaveClass("select-text");
  });
});
