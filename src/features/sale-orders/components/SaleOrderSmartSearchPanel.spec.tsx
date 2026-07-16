import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderSmartSearchPanel } from "./SaleOrderSmartSearchPanel";
import { SaleOrderSearchFields, SaleOrderSearchOperators } from "../utils/saleOrderSmartSearch";

const smartSearchPanelMock = vi.fn();

vi.mock("@/shared/components/table/search", async () => {
  const actual = await vi.importActual<typeof import("@/shared/components/table/search")>(
    "@/shared/components/table/search",
  );
  return {
    ...actual,
    SmartSearchPanel: (props: Record<string, unknown>) => {
      smartSearchPanelMock(props);
      return <div data-testid="smart-search-panel">{String(props.fieldsSectionTitle)}</div>;
    },
  };
});

describe("SaleOrderSmartSearchPanel", () => {
  it("configures the shared smart-search panel with sale-order helpers", () => {
    const snapshot = {
      q: "",
      filters: [
        {
          field: SaleOrderSearchFields.CREATED_AT,
          operator: SaleOrderSearchOperators.BETWEEN,
          range: { start: "2026-07-01", end: "2026-07-15" },
        },
      ],
    };

    render(
      <SaleOrderSmartSearchPanel
        columns={[{ id: SaleOrderSearchFields.CREATED_AT, label: "Fecha creacion", kind: "date", operators: [] }]}
        snapshot={snapshot}
        onApplySnapshot={vi.fn()}
        onApplyRule={vi.fn()}
        onRemoveRule={vi.fn()}
      />,
    );

    expect(screen.getByTestId("smart-search-panel")).toHaveTextContent("Filtros");
    expect(smartSearchPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldsSectionTitle: "Filtros",
        initialVisibleFields: 4,
        snapshot,
      }),
    );
  });
});
