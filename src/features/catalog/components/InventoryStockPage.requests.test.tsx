import { render, waitFor } from "@testing-library/react";
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
vi.mock("@/shared/components/table/DataTable", () => ({ DataTable: () => null }));
vi.mock("@/shared/components/table/search", () => ({ DataTableSearchBar: () => null, DataTableSearchChips: () => null }));
vi.mock("@/features/catalog/components/InventorySmartSearchPanel", () => ({ InventorySmartSearchPanel: () => null }));
vi.mock("@/features/catalog/components/InventoryForecastModal", () => ({ InventoryForecastModal: () => null }));
vi.mock("@/features/catalog/components/InventoryAlertSettingsModal", () => ({ InventoryAlertSettingsModal: () => null }));
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
});
