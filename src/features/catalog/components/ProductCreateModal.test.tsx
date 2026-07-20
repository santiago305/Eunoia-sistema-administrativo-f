import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductCreateModal } from "./ProductCreateModal";

const { createBaseProductMock, createProductSkuMock, listProductEquivalencesMock, listSkusMock, listUnitsMock, showFeedbackMock } = vi.hoisted(() => ({
    createBaseProductMock: vi.fn(),
    createProductSkuMock: vi.fn(),
    listProductEquivalencesMock: vi.fn(),
    listSkusMock: vi.fn(),
    listUnitsMock: vi.fn(),
    showFeedbackMock: vi.fn(),
}));

vi.mock("@/shared/services/productService", () => ({
    createBaseProduct: createBaseProductMock,
    createProductSku: createProductSkuMock,
}));

vi.mock("@/shared/services/equivalenceService", () => ({
    createProductEquivalence: vi.fn(),
    deleteProductEquivalence: vi.fn(),
    listProductEquivalences: listProductEquivalencesMock,
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
    ProductDetailsSection: ({
        onChangeFormField,
        onChangeSkuRow,
        skuRows,
    }: {
        onChangeFormField: (field: "name", value: string) => void;
        onChangeSkuRow: (id: string, field: "name", value: string) => void;
        skuRows: Array<{ id: string }>;
    }) => (
        <div>
            <button type="button" onClick={() => onChangeFormField("name", "Producto editado")}>
                Cambiar nombre
            </button>
            <button
                type="button"
                onClick={() => {
                    onChangeFormField("name", "Producto nuevo");
                    onChangeSkuRow(skuRows[0].id, "name", "SKU nuevo");
                }}
            >
                Preparar producto
            </button>
        </div>
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
        listProductEquivalencesMock.mockResolvedValue([]);
        createBaseProductMock.mockResolvedValue({ id: "product-1", name: "Producto nuevo", type: "PRODUCT" });
        createProductSkuMock.mockResolvedValue({
            sku: { id: "sku-1", productId: "product-1", backendSku: "SKU-1", name: "Producto nuevo" },
            attributes: [],
        });
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

    it("refreshes the catalog once only after the product and its SKUs are created", async () => {
        let resolveSku: (value: unknown) => void;
        createProductSkuMock.mockImplementationOnce(() => new Promise((resolve) => {
            resolveSku = resolve;
        }));
        const onSaved = vi.fn();

        render(<ProductCreateModal open productType="PRODUCT" onClose={vi.fn()} onSaved={onSaved} />);
        await waitFor(() => expect(listUnitsMock).toHaveBeenCalledTimes(1));
        fireEvent.click(screen.getByRole("button", { name: "Preparar producto" }));
        fireEvent.click(screen.getByRole("button", { name: "Guardar producto y SKUs" }));

        await waitFor(() => expect(createBaseProductMock).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(createProductSkuMock).toHaveBeenCalledTimes(1));
        expect(onSaved).not.toHaveBeenCalled();

        await act(async () => {
            resolveSku!({
                sku: { id: "sku-1", productId: "product-1", backendSku: "SKU-1", name: "Producto nuevo" },
                attributes: [],
            });
        });

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });

    it("keeps only failed artifacts pending without recreating the product", async () => {
        createProductSkuMock.mockRejectedValueOnce(new Error("sku error")).mockResolvedValueOnce({
            sku: { id: "sku-1", productId: "product-1", backendSku: "SKU-1", name: "Producto nuevo" },
            attributes: [],
        });
        const onSaved = vi.fn();

        render(<ProductCreateModal open productType="PRODUCT" onClose={vi.fn()} onSaved={onSaved} />);
        await waitFor(() => expect(listUnitsMock).toHaveBeenCalledTimes(1));
        fireEvent.click(screen.getByRole("button", { name: "Preparar producto" }));
        fireEvent.click(screen.getByRole("button", { name: "Guardar producto y SKUs" }));

        await waitFor(() => expect(createProductSkuMock).toHaveBeenCalledTimes(1));
        expect(createBaseProductMock).toHaveBeenCalledTimes(1);
        expect(onSaved).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Reintentar pendientes" }));

        await waitFor(() => expect(createProductSkuMock).toHaveBeenCalledTimes(2));
        expect(createBaseProductMock).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });
});
