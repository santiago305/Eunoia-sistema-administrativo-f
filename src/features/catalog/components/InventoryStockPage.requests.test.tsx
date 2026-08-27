import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DataTableColumn } from "@/shared/components/table/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryStockPage } from "./InventoryStockPage";

const { listInventoryMock, listSkusMock } = vi.hoisted(() => ({
  listInventoryMock: vi.fn(),
  listSkusMock: vi.fn(),
}));

vi.mock("@/shared/services/inventoryService", () => ({
  listInventory: listInventoryMock,
  getInventorySearchState: vi.fn().mockResolvedValue({ catalogs: {}, recent: [], saved: [] }),
  getInventoryExportColumns: vi.fn(),
  getInventoryExportPresets: vi.fn(),
  getSkuStockSnapshots: vi.fn(),
  deleteInventoryExportPreset: vi.fn(),
  deleteInventorySearchMetric: vi.fn(),
  exportInventoryExcel: vi.fn(),
  saveInventoryExportPreset: vi.fn(),
  saveInventorySearchMetric: vi.fn(),
}));
vi.mock("@/shared/services/skuService", () => ({ listSkus: listSkusMock }));
vi.mock("@/shared/services/warehouseServices", () => ({ listActive: vi.fn().mockResolvedValue([]) }));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback: vi.fn() }) }));
vi.mock("@/shared/hooks/useCompany", () => ({ useCompany: () => ({ hasCompany: true }) }));
vi.mock("@/shared/hooks/usePermissions", () => ({ usePermissions: () => ({ can: vi.fn() }) }));
vi.mock("@/features/catalog/utils/catalogPermissions", () => ({
  getInventoryPermissions: () => ({ export: false, realtime: false }),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("framer-motion", () => ({ useReducedMotion: () => true }));
vi.mock("@/shared/layouts/PageShell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/components/components/PageTitle", () => ({ PageTitle: () => null }));
vi.mock("@/shared/components/components/PageActionsRow", () => ({ PageActionsRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: ({ data, rowKey, columns }: { data: Array<Record<string, unknown>>; rowKey: (row: Record<string, unknown>, index: number) => string; columns: DataTableColumn<Record<string, unknown>>[] }) => (
    <div data-testid="inventory-table">
      {data.map((row, index) => (
        <div key={rowKey(row, index)} data-testid="inventory-row">
          {columns.find((column) => column.id === "reserved")?.cell?.(row, index)}
        </div>
      ))}
    </div>
  ),
}));
vi.mock("@/shared/components/table/search", () => ({ DataTableSearchBar: () => null, DataTableSearchChips: () => null }));
vi.mock("@/features/catalog/components/InventorySmartSearchPanel", () => ({ InventorySmartSearchPanel: () => null }));
vi.mock("@/features/catalog/components/InventoryForecastModal", () => ({ InventoryForecastModal: () => null }));
vi.mock("@/features/catalog/components/InventoryAlertSettingsModal", () => ({ InventoryAlertSettingsModal: () => null }));
vi.mock("@/features/catalog/components/InventoryReservationsModal", () => ({
  InventoryReservationsModal: ({ open, target }: { open: boolean; target: { itemName?: string } | null }) =>
    open ? <div data-testid="reservation-details-modal">{target?.itemName}</div> : null,
}));
vi.mock("@/shared/components/components/ActionsPopover", () => ({ ActionsPopover: () => null }));

describe("InventoryStockPage request budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listInventoryMock.mockResolvedValue({ items: [], total: 0, page: 1 });
  });

  it("loads stock once on mount without preloading SKUs", async () => {
    render(<InventoryStockPage config={{ productType: "PRODUCT", pageTitle: "Stock", headingTitle: "Stock", itemLabel: "Producto", tableId: "stock", searchLabel: "Buscar", searchName: "stock", routes: { kardex: "/k", transfer: "/t", adjustments: "/a" } }} />);

    await waitFor(() => expect(listInventoryMock).toHaveBeenCalledTimes(1));
    expect(listSkusMock).not.toHaveBeenCalled();
  });

  it("ignores incomplete inventory rows instead of crashing the table", async () => {
    listInventoryMock.mockResolvedValueOnce({
      items: [
        { stockItemId: "orphan", sku: null, warehouseId: "warehouse-1" },
        {
          stockItemId: "stock-1",
          sku: { sku: { id: "sku-1", name: "Producto" }, attributes: [] },
          warehouseId: "warehouse-1",
          warehouseName: "Central",
          onHand: 10,
          reserved: 0,
          available: 10,
        },
      ],
      total: 2,
      page: 1,
    });

    const { findAllByTestId } = render(<InventoryStockPage config={{ productType: "PRODUCT", pageTitle: "Stock", headingTitle: "Stock", itemLabel: "Producto", tableId: "stock", searchLabel: "Buscar", searchName: "stock", routes: { kardex: "/k", transfer: "/t", adjustments: "/a" } }} />);

    await expect(findAllByTestId("inventory-row")).resolves.toHaveLength(1);
  });

  it("opens reservation details from the reserved quantity", async () => {
    listInventoryMock.mockResolvedValueOnce({
      items: [
        {
          stockItemId: "stock-1",
          sku: { sku: { id: "sku-1", name: "Producto reservado" }, attributes: [] },
          warehouseId: "warehouse-1",
          warehouseName: "Central",
          onHand: 10,
          reserved: 3,
          available: 7,
        },
      ],
      total: 1,
      page: 1,
    });

    render(<InventoryStockPage config={{ productType: "PRODUCT", pageTitle: "Stock", headingTitle: "Stock", itemLabel: "Producto", tableId: "stock", searchLabel: "Buscar", searchName: "stock", routes: { kardex: "/k", transfer: "/t", adjustments: "/a" } }} />);

    const reservedButton = await screen.findByRole("button", { name: /ver detalle de 3 reservados/i });
    fireEvent.click(reservedButton);

    expect(screen.getByTestId("reservation-details-modal")).toHaveTextContent("Producto reservado");
  });
});
