import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryMovementsPage } from "./InventoryMovementsPage";

const { clearFeedbackMock, getInventoryLedgerMovementsMock, listSkusMock, showFeedbackMock } = vi.hoisted(() => ({
  clearFeedbackMock: vi.fn(),
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
vi.mock("@/shared/components/table/DataTable", () => ({ DataTable: () => null }));
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
});
