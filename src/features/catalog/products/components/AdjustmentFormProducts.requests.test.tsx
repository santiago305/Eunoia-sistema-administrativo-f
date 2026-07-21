import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";
import AdjustmentFormProducts from "./AdjustmentFormProducts";

const { clearFeedbackMock, listActiveMock, listSkusMock, showFeedbackMock } = vi.hoisted(() => ({
  clearFeedbackMock: vi.fn(),
  listActiveMock: vi.fn(),
  listSkusMock: vi.fn(),
  showFeedbackMock: vi.fn(),
}));

vi.mock("@/shared/services/skuService", () => ({ listSkus: listSkusMock }));
vi.mock("@/shared/services/warehouseServices", () => ({ listActive: listActiveMock }));
vi.mock("@/shared/services/documentSeriesService", () => ({ listDocumentSeries: vi.fn() }));
vi.mock("@/shared/services/documentService", () => ({ createInventoryMovement: vi.fn(), getStockSku: vi.fn() }));
vi.mock("@/shared/services/userService", () => ({ findOwnUser: vi.fn().mockResolvedValue({ data: { name: "Usuario" } }) }));
vi.mock("@/shared/services/inventoryRealtimeService", () => ({ subscribeInventoryStockUpdated: vi.fn(() => vi.fn()) }));
vi.mock("@/shared/hooks/useAuth", () => ({ useAuth: () => ({ userId: "user-1" }) }));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: showFeedbackMock, clearFeedback: clearFeedbackMock }),
}));
vi.mock("@/shared/components/components/FloatingInput", () => ({ FloatingInput: () => null }));
vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({ name, onSearchChange }: { name: string; onSearchChange?: (value: string) => void }) =>
    onSearchChange ? <input aria-label={name} onChange={(event) => onSearchChange(event.target.value)} /> : null,
}));
vi.mock("@/shared/components/components/SectionHederForm", () => ({ SectionHeaderForm: () => null }));
vi.mock("@/shared/components/modales/Modal", () => ({ Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/components/components/SystemButton", () => ({ SystemButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button> }));
vi.mock("@/shared/components/table/DataTable", () => ({ DataTable: () => null }));

describe("AdjustmentFormProducts request budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listActiveMock.mockResolvedValue([]);
    listSkusMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
  });

  it.each([InventoryDocumentProductType.PRODUCT, InventoryDocumentProductType.MATERIAL])("does not search %s SKUs until the user types", async (type) => {
    render(<AdjustmentFormProducts open type={type} />);

    await waitFor(() => expect(listActiveMock).toHaveBeenCalledTimes(1));
    expect(listSkusMock).not.toHaveBeenCalled();

    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("adjustment-sku"), { target: { value: "harina" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(listSkusMock).toHaveBeenCalledTimes(1);
    expect(listSkusMock).toHaveBeenCalledWith(expect.objectContaining({ q: "harina", productType: type, limit: 10 }));
    vi.useRealTimers();
  });
});
