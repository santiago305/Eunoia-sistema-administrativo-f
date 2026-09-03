import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryMovementsPage } from "./InventoryMovementsPage";

const {
  alertModalPropsMock,
  clearFeedbackMock,
  dataTablePropsMock,
  exportInventoryLedgerExcelMock,
  exportPopoverPropsMock,
  getInventoryLedgerExportColumnsMock,
  getInventoryLedgerExportPresetsMock,
  getInventoryLedgerMovementsMock,
  listSkusMock,
  permissionState,
  showFeedbackMock,
} = vi.hoisted(() => ({
  alertModalPropsMock: vi.fn(),
  clearFeedbackMock: vi.fn(),
  dataTablePropsMock: vi.fn(),
  exportInventoryLedgerExcelMock: vi.fn(),
  exportPopoverPropsMock: vi.fn(),
  getInventoryLedgerExportColumnsMock: vi.fn(),
  getInventoryLedgerExportPresetsMock: vi.fn(),
  getInventoryLedgerMovementsMock: vi.fn(),
  listSkusMock: vi.fn(),
  permissionState: { export: false },
  showFeedbackMock: vi.fn(),
}));

vi.mock("@/shared/services/kardexService", () => ({
  getInventoryLedgerMovements: getInventoryLedgerMovementsMock,
  getInventoryLedgerSearchState: vi.fn().mockResolvedValue({ catalogs: {}, recent: [], saved: [] }),
  getInventoryLedgerExportColumns: getInventoryLedgerExportColumnsMock,
  getInventoryLedgerExportPresets: getInventoryLedgerExportPresetsMock,
  deleteInventoryLedgerExportPreset: vi.fn(),
  deleteInventoryLedgerSearchMetric: vi.fn(),
  exportInventoryLedgerExcel: exportInventoryLedgerExcelMock,
  saveInventoryLedgerExportPreset: vi.fn(),
  saveInventoryLedgerSearchMetric: vi.fn(),
}));
vi.mock("@/shared/services/skuService", () => ({ listSkus: listSkusMock }));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: showFeedbackMock, clearFeedback: clearFeedbackMock }),
}));
vi.mock("@/shared/hooks/usePermissions", () => ({ usePermissions: () => ({ can: vi.fn() }) }));
vi.mock("@/features/catalog/utils/catalogPermissions", () => ({ getInventoryMovementPermissions: () => ({ export: permissionState.export }) }));
vi.mock("react-router-dom", () => ({ useSearchParams: () => [new URLSearchParams()] }));
vi.mock("@/shared/layouts/PageShell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/components/components/PageTitle", () => ({ PageTitle: () => null }));
vi.mock("@/shared/components/components/PageActionsRow", () => ({ PageActionsRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/components/components/ExportPopover", () => ({
  ExportPopover: (props: unknown) => {
    exportPopoverPropsMock(props);
    return null;
  },
}));
vi.mock("@/shared/components/components/AlertModal", () => ({
  AlertModal: (props: unknown) => {
    alertModalPropsMock(props);
    return null;
  },
}));
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
    permissionState.export = false;
    getInventoryLedgerMovementsMock.mockResolvedValue({ items: [], total: 0 });
    getInventoryLedgerExportColumnsMock.mockResolvedValue([]);
    getInventoryLedgerExportPresetsMock.mockResolvedValue([]);
    exportInventoryLedgerExcelMock.mockResolvedValue({
      blob: new Blob(["excel"]),
      filename: "movimientos.xlsx",
    });
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
          effectiveDate: "2026-08-18",
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
      expect(props.columns.map((column) => column.id)).toContain("effectiveDate");
      expect(props.columns.map((column) => column.id)).not.toContain("documentNumber");
      expect(props.data[0]).toMatchObject({
        origin: "Pedido PE-001",
        effectiveDate: "2026-08-18",
        effectiveDateLabel: "18/08/2026",
      });
      expect(props.data[0]).not.toHaveProperty("documentNumber");
    });
  });

  it("exports every movement from the date range selected in the table", async () => {
    permissionState.export = true;
    getInventoryLedgerExportColumnsMock.mockResolvedValue([
      { key: "createdAt", label: "Fecha" },
    ]);

    render(<InventoryMovementsPage config={{ productType: "PRODUCT", pageTitle: "Movimientos", headingTitle: "Movimientos", itemLabel: "Producto", tableId: "movements", searchName: "movements", dateRangeName: "range" }} />);

    await waitFor(() => expect(exportPopoverPropsMock).toHaveBeenCalled());
    const tableProps = dataTablePropsMock.mock.calls.at(-1)?.[0] as {
      rangeDates: {
        onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
      };
    };

    act(() => {
      tableProps.rangeDates.onChange({
        startDate: new Date(2026, 7, 1),
        endDate: new Date(2026, 7, 31),
      });
    });

    await waitFor(() => {
      const props = exportPopoverPropsMock.mock.calls.at(-1)?.[0] as {
        onExport: (columns: Array<{ key: string; label: string }>) => Promise<void>;
      };
      expect(props).toBeDefined();
    });

    const exportProps = exportPopoverPropsMock.mock.calls.at(-1)?.[0] as {
      onExport: (columns: Array<{ key: string; label: string }>) => Promise<void>;
    };
    await act(async () => {
      await exportProps.onExport([{ key: "createdAt", label: "Fecha" }]);
    });

    expect(exportInventoryLedgerExcelMock).toHaveBeenCalledWith(expect.objectContaining({
      from: "2026-08-01",
      to: "2026-08-31",
    }));
  });

  it("warns before exporting the complete history without a date range", async () => {
    permissionState.export = true;
    getInventoryLedgerExportColumnsMock.mockResolvedValue([
      { key: "createdAt", label: "Fecha" },
    ]);

    render(<InventoryMovementsPage config={{ productType: "PRODUCT", pageTitle: "Movimientos", headingTitle: "Movimientos", itemLabel: "Producto", tableId: "movements", searchName: "movements", dateRangeName: "range" }} />);

    await waitFor(() => expect(exportPopoverPropsMock).toHaveBeenCalled());
    const exportProps = exportPopoverPropsMock.mock.calls.at(-1)?.[0] as {
      onExport: (columns: Array<{ key: string; label: string }>) => Promise<void>;
    };

    await act(async () => {
      await exportProps.onExport([{ key: "createdAt", label: "Fecha" }]);
    });

    expect(exportInventoryLedgerExcelMock).not.toHaveBeenCalled();
    const alertProps = alertModalPropsMock.mock.calls.at(-1)?.[0] as {
      open: boolean;
      confirmText: string;
      cancelText: string;
      onConfirm: () => void;
    };
    expect(alertProps).toMatchObject({
      open: true,
      confirmText: "Exportar todo",
      cancelText: "Elegir fechas",
    });

    await act(async () => {
      alertProps.onConfirm();
    });

    await waitFor(() => expect(exportInventoryLedgerExcelMock).toHaveBeenCalledWith(expect.objectContaining({
      from: undefined,
      to: undefined,
    })));
  });
});
