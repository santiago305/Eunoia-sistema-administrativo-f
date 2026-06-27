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
