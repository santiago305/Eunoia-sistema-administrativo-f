import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductCreateModal } from "./ProductCreateModal";

const { listSkusMock, listUnitsMock, showFeedbackMock } = vi.hoisted(() => ({
    listSkusMock: vi.fn(),
    listUnitsMock: vi.fn(),
    showFeedbackMock: vi.fn(),
}));

vi.mock("@/shared/services/skuService", () => ({
    listSkus: listSkusMock,
}));

vi.mock("@/shared/services/unitService", () => ({
    listUnits: listUnitsMock,
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
    useFeedbackToast: () => ({ showFeedback: showFeedbackMock, clearFeedback: vi.fn() }),
}));

vi.mock("@/shared/components/modales/Modal", () => ({
    Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("./ProductCreateModalSections", () => ({
    ProductDetailsSection: ({ onChangeFormField }: { onChangeFormField: (field: "name", value: string) => void }) => (
        <button type="button" onClick={() => onChangeFormField("name", "Producto editado")}>
            Cambiar nombre
        </button>
    ),
    ProductEquivalencesSection: () => null,
    ProductRecipesSection: ({
        onMaterialSearchChange,
        primaVariants,
    }: {
        onMaterialSearchChange: (query: string) => void;
        primaVariants: Array<{ productName: string }>;
    }) => (
        <div>
            <button type="button" onClick={() => onMaterialSearchChange("harina")}>Buscar harina</button>
            <button type="button" onClick={() => onMaterialSearchChange("harina integral")}>Buscar harina integral</button>
            <div>{primaVariants.map((variant) => variant.productName).join(",")}</div>
        </div>
    ),
}));

describe("ProductCreateModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listUnitsMock.mockResolvedValue([]);
        listSkusMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    });

    it("does not load material SKUs until the recipes tab is opened", async () => {
        render(
            <ProductCreateModal
                open
                productType="PRODUCT"
                onClose={vi.fn()}
            />,
        );

        await waitFor(() => expect(listUnitsMock).toHaveBeenCalledTimes(1));
        expect(listSkusMock).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Cambiar nombre" }));
        expect(listSkusMock).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Recetas" }));

        expect(listSkusMock).not.toHaveBeenCalled();
    });

    it("does not retry units after an error until the user requests it", async () => {
        listUnitsMock.mockRejectedValueOnce(new Error("network error")).mockResolvedValueOnce([]);

        render(
            <ProductCreateModal
                open
                productType="PRODUCT"
                onClose={vi.fn()}
            />,
        );

        await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledTimes(1));
        expect(listUnitsMock).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole("button", { name: "Cambiar nombre" }));
        expect(listUnitsMock).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole("button", { name: "Reintentar unidades" }));
        await waitFor(() => expect(listUnitsMock).toHaveBeenCalledTimes(2));
    });

    it("sends one request for the last material search text after the debounce", async () => {
        vi.useFakeTimers();
        render(<ProductCreateModal open productType="PRODUCT" onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole("button", { name: "Recetas" }));
        fireEvent.click(screen.getByRole("button", { name: "Buscar harina" }));
        fireEvent.click(screen.getByRole("button", { name: "Buscar harina integral" }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        expect(listSkusMock).toHaveBeenCalledTimes(1);
        expect(listSkusMock).toHaveBeenCalledWith(
            expect.objectContaining({ q: "harina integral", page: 1, limit: 20 }),
            expect.any(Object),
        );
        vi.useRealTimers();
    });

    it("debounces recipe material searches and keeps only the latest response", async () => {
        vi.useFakeTimers();
        let resolveFirstSearch: (value: unknown) => void;
        const firstSearch = new Promise((resolve) => {
            resolveFirstSearch = resolve;
        });
        listSkusMock.mockImplementationOnce(() => firstSearch).mockResolvedValueOnce({
            items: [{
                sku: { id: "material-2", name: "Harina integral", backendSku: "MAT-2", isActive: true },
                unit: { id: "unit-1", name: "Kilogramo", code: "kg" },
                attributes: [],
            }],
            total: 1,
        });

        render(<ProductCreateModal open productType="PRODUCT" onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole("button", { name: "Recetas" }));
        fireEvent.click(screen.getByRole("button", { name: "Buscar harina" }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        fireEvent.click(screen.getByRole("button", { name: "Buscar harina integral" }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        expect(listSkusMock).toHaveBeenCalledTimes(2);
        expect(listSkusMock).toHaveBeenLastCalledWith(
            expect.objectContaining({ q: "harina integral", page: 1, limit: 20 }),
            expect.any(Object),
        );

        await act(async () => {
            resolveFirstSearch!({
                items: [{
                    sku: { id: "material-1", name: "Harina antigua", backendSku: "MAT-1", isActive: true },
                    unit: { id: "unit-1", name: "Kilogramo", code: "kg" },
                    attributes: [],
                }],
                total: 1,
            });
        });

        expect(screen.getByText("Harina integral")).toBeInTheDocument();
        expect(screen.queryByText("Harina antigua")).not.toBeInTheDocument();
        vi.useRealTimers();
    });
});
