import { useRef, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CreateSaleOrderDto } from "@/features/sale-orders/types/saleOrder";
import {
  SaleOrderItemsSection,
  type SaleOrderItemsSectionHandle,
} from "./SaleOrderItemsSection";
import { getSku } from "@/shared/services/skuService";

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: () => <div data-testid="items-table" />,
}));

vi.mock(
  "@/features/sale-orders/components/modal-create/SaleOrderItemEditorModal",
  () => ({
    SaleOrderItemEditorModal: ({
      open,
      title,
    }: {
      open: boolean;
      title: string;
    }) =>
      open ? <div role="dialog" aria-label={title} /> : null,
  }),
);

vi.mock("@/shared/services/skuService", () => ({
  getSku: vi.fn(),
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

type ItemsForm = Pick<
  CreateSaleOrderDto,
  "items" | "deliveryCost" | "discount" | "warehouseId"
>;

function ItemsHarness() {
  const [form, setForm] = useState<ItemsForm>({
    items: [],
    deliveryCost: 12,
    discount: 5,
    warehouseId: "",
  });
  const actionsRef = useRef<SaleOrderItemsSectionHandle>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => actionsRef.current?.openCreate()}
      >
        Abrir pack externo
      </button>
      <button
        type="button"
        onClick={() => actionsRef.current?.openTariff()}
      >
        Abrir tarifa externa
      </button>
      <button
        type="button"
        onClick={() => actionsRef.current?.openDiscount()}
      >
        Abrir descuento externo
      </button>
      <SaleOrderItemsSection
        ref={actionsRef}
        form={form}
        setForm={setForm}
        showActions={false}
      />
    </>
  );
}

describe("SaleOrderItemsSection external actions", () => {
  it("renders standardized details for pack items only", () => {
    const form: ItemsForm = {
      items: [
        {
          description: "Pack verano",
          referencePackId: "pack-1",
          quantity: 1,
          unitPrice: 30,
          total: 30,
          components: [
            {
              skuId: "sku-1",
              skuLabel: "Polo azul",
              quantity: 2,
              unitPrice: 15,
              total: 30,
            },
          ],
        },
        {
          description: "Producto individual",
          quantity: 1,
          unitPrice: 10,
          total: 10,
          components: [],
        },
      ],
      deliveryCost: 0,
      discount: 0,
      warehouseId: "",
    };

    render(
      <SaleOrderItemsSection
        form={form}
        setForm={vi.fn()}
        showActions={false}
      />,
    );

    expect(screen.getByText("Polo azul")).toBeInTheDocument();
    expect(
      screen.getAllByRole("columnheader", { name: "Producto" }),
    ).not.toHaveLength(0);
  });

  it("opens the SKU image preview from a component row", async () => {
    const user = userEvent.setup();
    const form: ItemsForm = {
      items: [
        {
          description: "Pack verano",
          referencePackId: "pack-1",
          quantity: 1,
          unitPrice: 30,
          total: 30,
          components: [
            {
              skuId: "sku-1",
              skuLabel: "Polo azul",
              skuImage: "/uploads/sku-1.webp",
              quantity: 2,
              unitPrice: 15,
              total: 30,
            },
          ],
        },
      ],
      deliveryCost: 0,
      discount: 0,
      warehouseId: "",
    };

    render(
      <SaleOrderItemsSection
        form={form}
        setForm={vi.fn()}
        showActions={false}
      />,
    );

    await user.click(screen.getByText("Polo azul"));

    const image = screen.getByAltText("Imagen del SKU 1") as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain("/uploads/sku-1.webp");
  });

  it("loads the SKU image before previewing a component row without cached image", async () => {
    const user = userEvent.setup();
    vi.mocked(getSku).mockResolvedValueOnce({
      sku: { image: "/uploads/fetched-sku.webp" },
    } as never);
    const form: ItemsForm = {
      items: [
        {
          description: "Pack verano",
          referencePackId: "pack-1",
          quantity: 1,
          unitPrice: 30,
          total: 30,
          components: [
            {
              skuId: "sku-1",
              skuLabel: "Polo azul",
              quantity: 2,
              unitPrice: 15,
              total: 30,
            },
          ],
        },
      ],
      deliveryCost: 0,
      discount: 0,
      warehouseId: "",
    };

    render(
      <SaleOrderItemsSection
        form={form}
        setForm={vi.fn()}
        showActions={false}
      />,
    );

    await user.click(screen.getByText("Polo azul"));

    await waitFor(() => expect(getSku).toHaveBeenCalledWith("sku-1"));
    const image = await screen.findByAltText("Imagen del SKU 1") as HTMLImageElement;
    expect(image.src).toContain("/uploads/fetched-sku.webp");
  });

  it("hides its internal actions and exposes every modal command", async () => {
    const user = userEvent.setup();
    render(<ItemsHarness />);

    expect(
      screen.queryByRole("button", { name: "Agregar Pack" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tarifa" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Abrir pack externo" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Agregar Producto" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Abrir tarifa externa" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Tarifa de envío" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Abrir descuento externo" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Descuento" }),
    ).toBeInTheDocument();
  });
});
