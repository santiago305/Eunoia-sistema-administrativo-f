import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryMovementsPage } from "./InventoryMovementsPage";

const { clearFeedbackMock, dataTablePropsMock, getInventoryLedgerMovementsMock, listSkusMock, showFeedbackMock } = vi.hoisted(() => ({
  clearFeedbackMock: vi.fn(),
  dataTablePropsMock: vi.fn(),
  getInventoryLedgerMovementsMock: vi.fn(),
  listSkusMock: vi.fn(),
  showFeedbackMock: vi.fn(),
}));

vi.mock("@/shared/services/kardexService", () => ({
  getInventoryLedgerMovements: getInventoryLedgerMovementsMock,
  getInventoryLedgerSearchState: vi.fn().mockResolvedValue({ catalogs: {}, recent: [], saved: [] }),
  getInventoryLedgerExportColumns: vi.fn(),
  getInventoryLedgerExportPresets: vi.fn(),
  deleteInventoryLedgerExportPreset: vi.fn(),
  deleteInventoryLedgerSearchMetric: vi.fn(),
  exportInventoryLedgerExcel: vi.fn(),
  saveInventoryLedgerExportPreset: vi.fn(),
  saveInventoryLedgerSearchMetric: vi.fn(),
}));
vi.mock("@/shared/services/skuService", () => ({ listSkus: listSkusMock }));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: showFeedbackMock, clearFeedback: clearFeedbackMock }),
}));
vi.mock("@/shared/hooks/usePermissions", () => ({ usePermissions: () => ({ can: vi.fn() }) }));
vi.mock("@/features/catalog/utils/catalogPermissions", () => ({ getInventoryMovementPermissions: () => ({ export: false }) }));
vi.mock("react-router-dom", () => ({ useSearchParams: () => [new URLSearchParams()] }));
vi.mock("@/shared/layouts/PageShell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/components/components/PageTitle", () => ({ PageTitle: () => null }));
vi.mock("@/shared/components/components/PageActionsRow", () => ({ PageActionsRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: (props: unknown) => {
    dataTablePropsMock(props);
    return null;
  },
}));
vi.mock("@/shared/components/table/search", () => ({ DataTableSearchBar: () => null, DataTableSearchChips: () => null }));
vi.mock("@/features/catalog/components/InventoryLedgerSmartSearchPanel", () => ({ InventoryLedgerSmartSearchPanel: () => null }));

describe("InventoryMovementsPage request budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInventoryLedgerMovementsMock.mockResolvedValue({ items: [], total: 0 });
  });

  it("loads movements once on mount without preloading SKUs", async () => {
    render(<InventoryMovementsPage config={{ productType: "PRODUCT", pageTitle: "Movimientos", headingTitle: "Movimientos", itemLabel: "Producto", tableId: "movements", searchName: "movements", dateRangeName: "range" }} />);

    await waitFor(() => expect(getInventoryLedgerMovementsMock).toHaveBeenCalledTimes(1));
    expect(listSkusMock).not.toHaveBeenCalled();
  });

  it("shows the origin column without the provisional documentNumber field", async () => {
    getInventoryLedgerMovementsMock.mockResolvedValue({
      items: [
        {
          id: "movement-1",
          createdAt: "2026-08-22T12:00:00.000Z",
          originLabel: "Pedido PE-001",
          quantity: 2,
          direction: "OUT",
          warehouseId: "warehouse-1",
          warehouseName: "Principal",
          sku: {
            id: "sku-1",
            productId: "product-1",
            backendSku: "SKU-1",
            customSku: null,
            name: "Producto",
            attributes: [],
          },
          product: { id: "product-1", name: "Producto", type: "PRODUCT", baseUnitId: null },
          baseUnit: null,
          user: null,
        },
      ],
      total: 1,
    });

    render(<InventoryMovementsPage config={{ productType: "PRODUCT", pageTitle: "Movimientos", headingTitle: "Movimientos", itemLabel: "Producto", tableId: "movements", searchName: "movements", dateRangeName: "range" }} />);

    await waitFor(() => {
      const props = dataTablePropsMock.mock.calls.at(-1)?.[0] as {
        columns: Array<{ id: string }>;
        data: Array<Record<string, unknown>>;
      };
      expect(props.columns.map((column) => column.id)).toContain("origin");
      expect(props.columns.map((column) => column.id)).not.toContain("documentNumber");
      expect(props.data[0]).toMatchObject({ origin: "Pedido PE-001" });
      expect(props.data[0]).not.toHaveProperty("documentNumber");
    });
  });
});
