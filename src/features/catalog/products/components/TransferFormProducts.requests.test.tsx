import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import TransferFormProducts from "./TransferFormProducts";

const { listActiveMock, listSkusMock } = vi.hoisted(() => ({
  listActiveMock: vi.fn(),
  listSkusMock: vi.fn(),
}));

vi.mock("@/shared/services/skuService", () => ({ listSkus: listSkusMock }));
vi.mock("@/shared/services/warehouseServices", () => ({ listActive: listActiveMock }));
vi.mock("@/shared/services/documentSeriesService", () => ({ listDocumentSeries: vi.fn() }));
vi.mock("@/shared/services/documentService", () => ({ createTransfer: vi.fn(), getStockSku: vi.fn() }));
vi.mock("@/shared/services/userService", () => ({ findOwnUser: vi.fn().mockResolvedValue({ data: { name: "Usuario" } }) }));
vi.mock("@/shared/services/inventoryRealtimeService", () => ({ subscribeInventoryStockUpdated: vi.fn(() => vi.fn()) }));
vi.mock("@/shared/hooks/useAuth", () => ({ useAuth: () => ({ userId: "user-1" }) }));
vi.mock("@/shared/hooks/useFeedbackToast", () => ({ useFeedbackToast: () => ({ showFeedback: vi.fn(), clearFeedback: vi.fn() }) }));
vi.mock("@/shared/components/components/FloatingInput", () => ({ FloatingInput: () => null }));
vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({ name, onSearchChange }: { name: string; onSearchChange?: (value: string) => void }) =>
    onSearchChange ? <input aria-label={name} onChange={(event) => onSearchChange(event.target.value)} /> : null,
}));
vi.mock("@/shared/components/components/SystemButton", () => ({ SystemButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button> }));
vi.mock("@/shared/components/components/SectionHederForm", () => ({ SectionHeaderForm: () => null }));
vi.mock("@/shared/components/table/DataTable", () => ({ DataTable: () => null }));

describe("TransferFormProducts request budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listActiveMock.mockResolvedValue([]);
    listSkusMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
  });

  it.each([ProductTypes.PRODUCT, ProductTypes.MATERIAL])("does not search %s SKUs until the user types", async (type) => {
    render(<TransferFormProducts open type={type} />);

    await waitFor(() => expect(listActiveMock).toHaveBeenCalledTimes(1));
    expect(listSkusMock).not.toHaveBeenCalled();

    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("transfer-sku"), { target: { value: "harina" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(listSkusMock).toHaveBeenCalledTimes(1);
    expect(listSkusMock).toHaveBeenCalledWith(expect.objectContaining({ q: "harina", productType: type, limit: 10 }));
    vi.useRealTimers();
  });
});
