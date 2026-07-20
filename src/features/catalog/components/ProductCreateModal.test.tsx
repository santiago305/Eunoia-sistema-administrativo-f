import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    ProductRecipesSection: () => <div>Formulario de recetas</div>,
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

        await waitFor(() => expect(listSkusMock).toHaveBeenCalledTimes(1));
        expect(listSkusMock).toHaveBeenCalledWith({
            productType: "MATERIAL",
            isActive: true,
            page: 1,
            limit: 200,
        });
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
});
