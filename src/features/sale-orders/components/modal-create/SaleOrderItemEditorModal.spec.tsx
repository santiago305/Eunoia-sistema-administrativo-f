import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaleOrderItemEditorModal } from "@/features/sale-orders/components/modal-create/SaleOrderItemEditorModal";
import type { SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { getPackById, listPacks } from "@/shared/services/packService";

vi.mock("@/shared/services/packService", () => ({
    listPacks: vi.fn(async () => ({
        items: [
            {
                pack: {
                    packId: "pack-1",
                    description: "Pack X",
                },
            },
        ],
    })),
    getPackById: vi.fn(async () => ({ pack: { description: "Pack X" }, items: [] })),
}));

vi.mock("@/shared/services/skuService", () => ({
    listSkus: vi.fn(async () => ({
        items: [
            {
                sku: { id: "sku-1", name: "Producto 1", backendSku: "B1", customSku: null, price: 12.5 },
                attributes: [],
                unit: { id: "u1", name: "UND", code: "UND" },
            },
        ],
        total: 1,
        page: 1,
        limit: 10,
    })),
}));

describe("SaleOrderItemEditorModal - add catalog SKU", () => {
    it("debounces pack searches and only requests the latest query", async () => {
        vi.mocked(listPacks).mockClear();

        function Harness() {
            const [value, setValue] = useState<SaleOrderItemInput>({
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                    components: [],
                });

            return (
                <SaleOrderItemEditorModal
                    open
                    title="Editar"
                    value={value}
                    onChange={setValue}
                    onClose={() => {}}
                    onConfirm={() => {}}
                />
            );
        }

        render(<Harness />);

        const descriptionInput = screen.getByLabelText("Descripción");
        await waitFor(() => expect(listPacks).toHaveBeenCalled());
        vi.mocked(listPacks).mockClear();

        fireEvent.change(descriptionInput, { target: { value: "p" } });
        fireEvent.change(descriptionInput, { target: { value: "pa" } });
        fireEvent.change(descriptionInput, { target: { value: "pack" } });

        await waitFor(
            () => {
                expect(listPacks).toHaveBeenCalledTimes(1);
                expect(listPacks).toHaveBeenLastCalledWith(
                    expect.objectContaining({ q: "pack" }),
                );
            },
            { timeout: 1_000 },
        );
    });

    it("copies pack SKU images into generated components", async () => {
        const onChange = vi.fn();
        vi.mocked(getPackById).mockResolvedValueOnce({
            pack: {
                packId: { value: "pack-1" },
                description: "Pack X",
                total: 20,
                isActive: true,
            },
            items: [
                {
                    id: "pack-item-1",
                    skuId: "sku-1",
                    quantity: 1,
                    price: 20,
                    lineTotal: 20,
                    sku: {
                        id: "sku-1",
                        backendSku: "B1",
                        customSku: null,
                        name: "Producto 1",
                        barcode: null,
                        price: 20,
                        image: "/uploads/sku-1.webp",
                        isActive: true,
                        attributes: [],
                    },
                },
            ],
        });

        render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                    referencePackId: "pack-1",
                    components: [],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        await waitFor(() =>
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    basePrice: 20,
                    components: [
                        expect.objectContaining({
                            skuId: "sku-1",
                            skuImage: "/uploads/sku-1.webp",
                            basePrice: 20,
                        }),
                    ],
                }),
            ),
        );
    });

    it("shows the enriched SKU label when editing an existing component", async () => {
        render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Pack detalle",
                    quantity: 1,
                    unitPrice: 20,
                    total: 20,
                    referencePackId: "pack-1",
                    components: [
                        {
                            skuId: "sku-1",
                            sku: {
                                id: "sku-1",
                                backendSku: "10017",
                                customSku: "EVA01893",
                                name: "JABON AZUFRE",
                                barcode: null,
                                image: null,
                            },
                            attributes: [{ code: "variant", name: "Variante", value: "AZUFRE" }],
                            quantity: 1,
                            unitPrice: 20,
                            total: 20,
                        },
                    ],
                }}
                onChange={() => {}}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        expect(await screen.findByText("JABON AZUFRE AZUFRE -10017 (EVA01893)")).toBeInTheDocument();
        expect(screen.queryByText("sku-1")).not.toBeInTheDocument();
    });

    it("prefills unit price from sku.price and adds component row", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "X",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                    referencePackId: "pack-1",
                    components: [{ skuId: "existing", quantity: 1, unitPrice: 0, total: 0 }],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        await user.click(screen.getByTitle("Agregar SKU"));

        const dialog = screen.getByRole("dialog", { name: "Agregar SKU" });

        const selectTrigger = within(dialog).getByRole("button", { name: "Producto" });
        await user.click(selectTrigger);

        const option = await screen.findByRole("option", { name: /Producto 1/i });
        fireEvent.mouseDown(option);

        const priceInput = within(dialog).getByLabelText("Precio unit.") as HTMLInputElement;
        await waitFor(() => expect(priceInput.value).toContain("12.5"));
        fireEvent.change(priceInput, { target: { value: "9.9" } });

        await user.click(within(dialog).getByRole("button", { name: "Agregar" }));

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                components: expect.arrayContaining([
                    expect.objectContaining({
                        skuId: "sku-1",
                        basePrice: 12.5,
                        unitPrice: 9.9,
                    }),
                ]),
            }),
        );
    });

    it("updates an existing normalized component without duplicating it when changing its unit price", async () => {
        const onChange = vi.fn();

        vi.mocked(getPackById).mockResolvedValueOnce({
            pack: {
                packId: { value: "pack-1" },
                description: "Pack X",
                total: 20,
                isActive: true,
            },
            items: [
                {
                    id: "pack-item-1",
                    skuId: "sku-1",
                    quantity: 1,
                    price: 20,
                    lineTotal: 20,
                    sku: {
                        id: "sku-1",
                        backendSku: "B1",
                        customSku: null,
                        name: "Producto 1",
                        barcode: null,
                        price: 20,
                        image: null,
                        isActive: true,
                        attributes: [],
                    },
                },
            ],
        });

        const { container } = render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Pack detalle",
                    quantity: 1,
                    unitPrice: 20,
                    total: 20,
                    referencePackId: "pack-1",
                    components: [
                        {
                            sku: {
                                id: "sku-1",
                                backendSku: "B1",
                                customSku: null,
                                name: "Producto 1",
                                barcode: null,
                                image: null,
                            },
                            quantity: 1,
                            unitPrice: 20,
                            total: 20,
                            referencePackItemId: "pack-item-1",
                        },
                    ],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        await waitFor(() => expect(getPackById).toHaveBeenCalledWith("pack-1"));

        const priceInput = container.querySelector(
            'input[name="pack-sku-price-sku-1"]',
        ) as HTMLInputElement;

        fireEvent.change(priceInput, { target: { value: "30" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                unitPrice: 30,
                total: 30,
                components: [
                    expect.objectContaining({
                        skuId: "sku-1",
                        quantity: 1,
                        unitPrice: 30,
                        total: 30,
                    }),
                ],
            }),
        );
    });

    it("applies parent quantity to loaded pack components and redistributes the parent total", async () => {
        const onChange = vi.fn();

        vi.mocked(getPackById).mockResolvedValueOnce({
            pack: {
                packId: { value: "pack-1" },
                description: "Pack X",
                total: 20,
                isActive: true,
            },
            items: [
                {
                    id: "pack-item-1",
                    skuId: "sku-1",
                    quantity: 2,
                    price: 10,
                    lineTotal: 20,
                    sku: {
                        id: "sku-1",
                        backendSku: "B1",
                        customSku: null,
                        name: "Producto Pack",
                        barcode: null,
                        price: 10,
                        image: null,
                        isActive: true,
                        attributes: [],
                    },
                },
            ],
        });

        const { container } = render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Pack detalle",
                    quantity: 1,
                    unitPrice: 20,
                    total: 20,
                    referencePackId: "pack-1",
                    components: [
                        {
                            skuId: "sku-1",
                            quantity: 2,
                            unitPrice: 10,
                            total: 20,
                            referencePackItemId: "pack-item-1",
                        },
                    ],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        await screen.findByText("Producto Pack -B1,");

        const quantityInput = container.querySelector(
            'input[name="item-qty"]',
        ) as HTMLInputElement;

        fireEvent.change(quantityInput, { target: { value: "3" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                quantity: 3,
                unitPrice: 20,
                total: 60,
                components: [
                    expect.objectContaining({
                        skuId: "sku-1",
                        quantity: 3,
                        unitPrice: 20,
                        total: 60,
                    }),
                ],
            }),
        );
    });

    it("distributes parent total equally across components when their current totals are zero", async () => {
        const onChange = vi.fn();

        const { container } = render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Pack detalle",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                    referencePackId: "pack-1",
                    components: [
                        {
                            skuId: "sku-1",
                            skuLabel: "Producto 1",
                            quantity: 1,
                            unitPrice: 0,
                            total: 0,
                        },
                        {
                            skuId: "sku-2",
                            skuLabel: "Producto 2",
                            quantity: 3,
                            unitPrice: 0,
                            total: 0,
                        },
                    ],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        const totalInput = container.querySelector('input[name="item-total"]') as HTMLInputElement;

        fireEvent.change(totalInput, { target: { value: "40" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                unitPrice: 40,
                total: 40,
                components: [
                    expect.objectContaining({
                        skuId: "sku-1",
                        quantity: 1,
                        unitPrice: 20,
                        total: 20,
                    }),
                    expect.objectContaining({
                        skuId: "sku-2",
                        quantity: 3,
                        unitPrice: 6.67,
                        total: 20,
                    }),
                ],
            }),
        );
    });

    it("redistributes parent total equally instead of preserving previous totals", async () => {
        const onChange = vi.fn();

        const { container } = render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Pack detalle",
                    quantity: 1,
                    unitPrice: 100,
                    total: 100,
                    referencePackId: "pack-1",
                    components: [
                        {
                            skuId: "sku-1",
                            skuLabel: "Producto 1",
                            quantity: 1,
                            unitPrice: 80,
                            total: 80,
                        },
                        {
                            skuId: "sku-2",
                            skuLabel: "Producto 2",
                            quantity: 3,
                            unitPrice: 6.67,
                            total: 20,
                        },
                    ],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        const totalInput = container.querySelector('input[name="item-total"]') as HTMLInputElement;

        fireEvent.change(totalInput, { target: { value: "40" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                unitPrice: 40,
                total: 40,
                components: [
                    expect.objectContaining({
                        skuId: "sku-1",
                        quantity: 1,
                        unitPrice: 20,
                        total: 20,
                    }),
                    expect.objectContaining({
                        skuId: "sku-2",
                        quantity: 3,
                        unitPrice: 6.67,
                        total: 20,
                    }),
                ],
            }),
        );
    });

    it("distributes parent total from loaded pack rows when value components are still empty", async () => {
        const onChange = vi.fn();

        vi.mocked(getPackById).mockResolvedValueOnce({
            pack: {
                packId: { value: "pack-1" },
                description: "Pack X",
                total: 40,
                isActive: true,
            },
            items: [
                {
                    id: "pack-item-1",
                    skuId: "sku-1",
                    quantity: 1,
                    price: 20,
                    lineTotal: 20,
                    sku: {
                        id: "sku-1",
                        backendSku: "B1",
                        customSku: null,
                        name: "Producto 1",
                        barcode: null,
                        price: 20,
                        image: null,
                        isActive: true,
                        attributes: [],
                    },
                },
                {
                    id: "pack-item-2",
                    skuId: "sku-2",
                    quantity: 3,
                    price: 20,
                    lineTotal: 60,
                    sku: {
                        id: "sku-2",
                        backendSku: "B2",
                        customSku: null,
                        name: "Producto 2",
                        barcode: null,
                        price: 20,
                        image: null,
                        isActive: true,
                        attributes: [],
                    },
                },
            ],
        });

        const { container } = render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Pack detalle",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                    referencePackId: "pack-1",
                    components: [],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        await screen.findByText("Producto 1 -B1,");
        await screen.findByText("Producto 2 -B2,");

        const totalInput = container.querySelector('input[name="item-total"]') as HTMLInputElement;

        fireEvent.change(totalInput, { target: { value: "40" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                unitPrice: 40,
                total: 40,
                components: [
                    expect.objectContaining({
                        skuId: "sku-1",
                        quantity: 1,
                        unitPrice: 20,
                        total: 20,
                        referencePackItemId: "pack-item-1",
                    }),
                    expect.objectContaining({
                        skuId: "sku-2",
                        quantity: 3,
                        unitPrice: 6.67,
                        total: 20,
                        referencePackItemId: "pack-item-2",
                    }),
                ],
            }),
        );
    });

    it("distributes parent unit price changes equally across components", async () => {
        const onChange = vi.fn();

        const { container } = render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Pack detalle",
                    quantity: 2,
                    unitPrice: 0,
                    total: 0,
                    referencePackId: "pack-1",
                    components: [
                        {
                            skuId: "sku-1",
                            skuLabel: "Producto 1",
                            quantity: 2,
                            unitPrice: 0,
                            total: 0,
                        },
                        {
                            skuId: "sku-2",
                            skuLabel: "Producto 2",
                            quantity: 6,
                            unitPrice: 0,
                            total: 0,
                        },
                    ],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        const unitPriceInput = container.querySelector('input[name="item-unit-price"]') as HTMLInputElement;

        fireEvent.change(unitPriceInput, { target: { value: "20" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                unitPrice: 20,
                total: 40,
                components: [
                    expect.objectContaining({
                        skuId: "sku-1",
                        quantity: 2,
                        unitPrice: 10,
                        total: 20,
                    }),
                    expect.objectContaining({
                        skuId: "sku-2",
                        quantity: 6,
                        unitPrice: 3.33,
                        total: 20,
                    }),
                ],
            }),
        );
    });

    it("applies parent quantity to every component and redistributes the parent total", async () => {
        const onChange = vi.fn();

        const { container } = render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "Item manual",
                    quantity: 1,
                    unitPrice: 50,
                    total: 50,
                    components: [
                        {
                            skuId: "sku-1",
                            skuLabel: "Producto 1",
                            quantity: 1,
                            unitPrice: 10,
                            total: 10,
                        },
                        {
                            skuId: "sku-2",
                            skuLabel: "Producto 2",
                            quantity: 3,
                            unitPrice: 13.33,
                            total: 40,
                        },
                    ],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        const quantityInput = container.querySelector('input[name="item-qty"]') as HTMLInputElement;

        fireEvent.change(quantityInput, { target: { value: "5" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                quantity: 5,
                unitPrice: 50,
                total: 250,
                components: [
                    expect.objectContaining({
                        skuId: "sku-1",
                        quantity: 5,
                        unitPrice: 25,
                        total: 125,
                    }),
                    expect.objectContaining({
                        skuId: "sku-2",
                        quantity: 5,
                        unitPrice: 25,
                        total: 125,
                    }),
                ],
            }),
        );
    });

    it("uses typed description as manual text and selected suggestion as pack", async () => {
        const onChange = vi.fn();

        render(
            <SaleOrderItemEditorModal
                open
                title="Editar"
                value={{
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                    components: [],
                }}
                onChange={onChange}
                onClose={() => {}}
                onConfirm={() => {}}
            />,
        );

        const descriptionInput = screen.getByLabelText("Descripción");
        fireEvent.change(descriptionInput, { target: { value: "Manual" } });

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                description: "Manual",
                referencePackId: undefined,
            }),
        );

        const option = await screen.findByRole("option", { name: "Pack X" });
        fireEvent.mouseDown(option);

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                description: "Pack X",
                referencePackId: "pack-1",
                components: [],
                unitPrice: 0,
                total: 0,
            }),
        );
    });
});
