import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderEditor } from "./SaleOrderEditor";
import type { SaleOrderEditorForm } from "./saleOrderEditorForm";
import type {
  SaleOrder,
  SaleOrderPackMatchResponse,
} from "../../types/saleOrder";

const {
  getSaleOrderEditorCatalogsMock,
  matchSaleOrderProductPackMock,
  saveSaleOrderWithClientMock,
  listClientsMock,
  listActiveWarehousesMock,
  listSubsidiariesMock,
  listSourcesMock,
  listWorkflowsMock,
  listAdvisersMock,
  getPaymentMethodsByCompanyMock,
  listCompanyPaymentAccountsByCompanyMock,
  sileoErrorMock,
  sileoSuccessMock,
} = vi.hoisted(() => ({
  getSaleOrderEditorCatalogsMock: vi.fn(),
  matchSaleOrderProductPackMock: vi.fn(),
  saveSaleOrderWithClientMock: vi.fn(),
  listClientsMock: vi.fn(),
  listActiveWarehousesMock: vi.fn(),
  listSubsidiariesMock: vi.fn(),
  listSourcesMock: vi.fn(),
  listWorkflowsMock: vi.fn(),
  listAdvisersMock: vi.fn(),
  getPaymentMethodsByCompanyMock: vi.fn(),
  listCompanyPaymentAccountsByCompanyMock: vi.fn(),
  sileoErrorMock: vi.fn(),
  sileoSuccessMock: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: {
    error: sileoErrorMock,
    success: sileoSuccessMock,
  },
}));

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  getSaleOrderEditorCatalogs: getSaleOrderEditorCatalogsMock,
  matchSaleOrderProductPack: matchSaleOrderProductPackMock,
  saveSaleOrderWithClient: saveSaleOrderWithClientMock,
}));

vi.mock("@/shared/services/clientService", () => ({
  getClientById: vi.fn(),
  listClients: listClientsMock,
}));

vi.mock("@/shared/services/warehouseServices", () => ({
  listActiveWarehouses: listActiveWarehousesMock,
}));

vi.mock("@/shared/services/agencyService", () => ({
  listSubsidiaries: listSubsidiariesMock,
}));

vi.mock("@/shared/services/sourceService", () => ({
  listSources: listSourcesMock,
}));

vi.mock("@/shared/services/workflowService", () => ({
  listWorkflows: listWorkflowsMock,
}));

vi.mock("@/shared/services/adviserService", () => ({
  listAdvisers: listAdvisersMock,
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getPaymentMethodsByCompany: getPaymentMethodsByCompanyMock,
}));

vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  listCompanyPaymentAccountsByCompany: listCompanyPaymentAccountsByCompanyMock,
}));

vi.mock("../modal-create/SaleOrderItemsSection", () => ({
  SaleOrderItemsSection: ({
    form,
    setForm,
  }: {
    form: SaleOrderEditorForm;
    setForm: Dispatch<SetStateAction<SaleOrderEditorForm>>;
  }) => (
    <div data-testid="items-section">
      items:{form.items.length}
      {form.items.map((item, index) => (
        <output key={index} data-testid={`sale-order-item-${index}`}>
          {[
            `description:${item.description}`,
            `pack:${item.referencePackId ?? "none"}`,
            `component:${item.components?.[0]?.referencePackItemId ?? "none"}`,
            `sku:${item.components?.[0]?.skuId ?? ""}`,
            `components:${item.components?.length ?? 0}`,
          ].join("|")}
        </output>
      ))}
      <button
        type="button"
        onClick={() =>
          setForm((current) => ({
            ...current,
            items: current.items.map((item, index) =>
              index === 0
                ? {
                    ...item,
                    quantity: Number(item.quantity) + 1,
                    total: (Number(item.quantity) + 1) * Number(item.unitPrice),
                  }
                : item,
            ),
          }))
        }
      >
        aumentar primera cantidad
      </button>
      <button
        type="button"
        onClick={() =>
          setForm((current) => ({
            ...current,
            items: current.items.map((item, index) =>
              index === 0
                ? {
                    ...item,
                    description: "Pack reconocido",
                    referencePackId: "pack-1",
                    packNameSnapshot: "Pack reconocido",
                    components: (item.components ?? []).map((component) => ({
                      ...component,
                      referencePackItemId: "pack-item-1",
                    })),
                  }
                : item,
            ),
          }))
        }
      >
        reconocer primer pack
      </button>
    </div>
  ),
}));

vi.mock("./SaleOrderDirectSkuSelect", () => ({
  SaleOrderDirectSkuSelect: ({
    disabled,
    onAddItem,
  }: {
    disabled: boolean;
    onAddItem: (item: SaleOrderEditorForm["items"][number]) => void;
  }) => (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onAddItem({
            quantity: 1,
            basePrice: 12.5,
            unitPrice: 12.5,
            total: 12.5,
            description: "JABON AZUFRE AZUFRE -10017 (EVA01893)",
            referencePackId: undefined,
            components: [
              {
                skuId: "sku-1",
                skuLabel: "JABON AZUFRE AZUFRE -10017 (EVA01893)",
                skuCode: "10017",
                skuImage: "/uploads/sku.webp",
                quantity: 1,
                basePrice: 12.5,
                unitPrice: 12.5,
                total: 12.5,
                referencePackItemId: undefined,
              },
            ],
          })
        }
      >
        Producto directo
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onAddItem({
            quantity: 2,
            basePrice: 7.25,
            unitPrice: 7.25,
            total: 14.5,
            description: "CREMA FACIAL -10018",
            referencePackId: undefined,
            components: [
              {
                skuId: "sku-2",
                skuLabel: "CREMA FACIAL -10018",
                skuCode: "10018",
                quantity: 2,
                basePrice: 7.25,
                unitPrice: 7.25,
                total: 14.5,
                referencePackItemId: undefined,
              },
            ],
          })
        }
      >
        Producto directo alterno
      </button>
    </>
  ),
}));

vi.mock("./SaleOrderClientSection", () => ({
  SaleOrderClientSection: ({
    clientOptions,
    onSearchClients,
  }: {
    clientOptions: Array<{ label: string }>;
    onSearchClients?: (query: string) => void | Promise<void>;
  }) => (
    <div data-testid="client-section">
      {clientOptions.map((option) => option.label).join(",")}
      <button type="button" onClick={() => void onSearchClients?.("ana")}>
        buscar cliente
      </button>
    </div>
  ),
}));

vi.mock("./SaleOrderInformationSection", () => ({
  SaleOrderInformationSection: ({
    setForm,
    workflowOptions,
    warehouseOptions,
    sourceOptions,
    adviserOptions,
  }: {
    setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
    workflowOptions: Array<{ label: string }>;
    warehouseOptions: Array<{ label: string }>;
    sourceOptions: Array<{ label: string }>;
    adviserOptions: Array<{ name: string }>;
  }) => (
    <div data-testid="information-section">
      {[...workflowOptions, ...warehouseOptions, ...sourceOptions].map((option) => option.label).join(",")}
      {adviserOptions.map((option) => option.name).join(",")}
      <button
        type="button"
        onClick={() => {
          const shippingPhoto = new File(["shipping"], "shipping.webp", {
            type: "image/webp",
          });
          const paymentPhoto = new File(["payment"], "payment.webp", {
            type: "image/webp",
          });
          setForm((current) => ({
            ...current,
            workflowId: "workflow-1",
            warehouseId: "warehouse-1",
            sourceId: "source-1",
            assignedBy: "adviser-1",
            agencyDetail: "Olva Miraflores",
            deliveryCost: 12,
            discount: 2,
            note: "Cliente pide empaque simple",
            advertisingCode: "FB-123",
            observation: "Llamar antes de enviar",
            sendDate: "2026-07-15",
            sendCode: "TRACK-1",
            sendAddress: "Av. 1",
            clientData: {
              ...current.clientData,
              fullName: "Ana Perez",
              docType: "DNI",
              docNumber: "12345678",
              departmentId: "15",
              provinceId: "1501",
              districtId: "150101",
              telephonesReplace: [
                { number: "999999999", isMain: true, isActive: true },
              ],
            },
            items: [
              {
                description: "Pack prueba",
                quantity: 1,
                unitPrice: 50,
                total: 50,
                components: [],
              },
            ],
            payments: [
              {
                clientKey: "payment-1",
                bankAccountId: "account-1",
                method: "EFECTIVO",
                amount: 20,
                date: "2026-07-15",
                operationNumber: "OP-1",
                note: "Adelanto",
                photo: paymentPhoto,
              },
            ],
            shippingPhoto,
          }));
        }}
      >
        preparar pedido valido
      </button>
    </div>
  ),
}));

vi.mock("./SaleOrderShippingSection", () => ({
  SaleOrderShippingSection: ({
    subsidiaryOptions,
    onSearchSubsidiaries,
  }: {
    subsidiaryOptions: Array<{ label: string }>;
    onSearchSubsidiaries?: (query: string) => void | Promise<void>;
  }) => (
    <div data-testid="shipping-section">
      {subsidiaryOptions.map((option) => option.label).join(",")}
      <button type="button" onClick={() => void onSearchSubsidiaries?.("olva")}>
        buscar sucursal
      </button>
    </div>
  ),
}));

vi.mock("./SaleOrderPaymentCards", () => ({
  SaleOrderPaymentCards: ({
    methodOptions = [],
    bankAccountOptions = [],
  }: {
    methodOptions?: Array<{ label: string }>;
    bankAccountOptions?: Array<{ label: string }>;
  }) => (
    <div data-testid="payment-cards">
      {methodOptions.map((option) => option.label).join(",")}
      {bankAccountOptions.map((option) => option.label).join(",")}
    </div>
  ),
}));

const noopCancel = () => undefined;
const noopSaved = () => undefined;

const uniquePackMatch: SaleOrderPackMatchResponse = {
  status: "UNIQUE",
  composition: [
    { skuId: "sku-1", quantity: 1 },
    { skuId: "sku-2", quantity: 2 },
  ],
  matches: [{ id: "pack-1", description: "Pack Facial", total: 30 }],
  pack: {
    id: "pack-1",
    description: "Pack Facial",
    total: 30,
    components: [
      {
        id: "pack-item-1",
        skuId: "sku-1",
        quantity: 1,
        price: 15,
        lineTotal: 15,
      },
      {
        id: "pack-item-2",
        skuId: "sku-2",
        quantity: 2,
        price: 7.5,
        lineTotal: 15,
      },
    ],
  },
};

describe("SaleOrderEditor catalog loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    matchSaleOrderProductPackMock.mockImplementation(
      async (composition: SaleOrderPackMatchResponse["composition"]) => ({
        status: "NONE",
        composition,
        matches: [],
      }),
    );
    getSaleOrderEditorCatalogsMock.mockResolvedValue({
      clients: [{ id: "client-initial", fullName: "Cliente Inicial", docNumber: "87654321" }],
      warehouses: [{ warehouseId: "warehouse-1", name: "Principal" }],
      subsidiaries: [{ id: "subsidiary-initial", alias: "Sucursal Inicial", address: "Av. 2", basePrice: 10 }],
      sources: [{ id: "source-1", name: "Facebook" }],
      workflows: [{ id: "workflow-1", name: "Venta", isActive: true }],
      advisers: [{ id: "adviser-1", name: "Ana", email: "ana@example.com" }],
      paymentMethods: [{ companyMethodId: "cm-1", methodId: "method-1", name: "EFECTIVO", isActive: true }],
      companyPaymentAccounts: [
        {
          id: "account-1",
          companyId: "company-1",
          type: "CASH",
          name: "Caja principal",
          currency: "PEN",
          isActive: true,
          isDefault: true,
        },
      ],
    });
    listClientsMock.mockResolvedValue({
      items: [
        {
          id: "client-1",
          fullName: "Cliente Uno",
          docNumber: "12345678",
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    });
    listSubsidiariesMock.mockResolvedValue([
      {
        id: "subsidiary-1",
        alias: "Olva",
        address: "Av. 1",
        basePrice: 12,
      },
    ]);
  });

  function EditorHarness({
    onSaved = noopSaved,
  }: {
    onSaved?: (saleOrderId: string) => void | Promise<void>;
  }) {
    const [footer, setFooter] = useState<ReactNode | null>(null);

    return (
      <>
        <SaleOrderEditor
          mode="create"
          order={null}
          onCancel={noopCancel}
          onSaved={onSaved}
          onFooterChange={setFooter}
        />
        <div data-testid="editor-footer">{footer}</div>
      </>
    );
  }

  it("loads initial client and subsidiary suggestions, then searches remotely", async () => {
    render(
      <SaleOrderEditor
        mode="create"
        order={null}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await waitFor(() => expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"));

    expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledTimes(1);
    expect(listClientsMock).not.toHaveBeenCalled();
    expect(listActiveWarehousesMock).not.toHaveBeenCalled();
    expect(listSubsidiariesMock).not.toHaveBeenCalled();
    expect(listSourcesMock).not.toHaveBeenCalled();
    expect(listWorkflowsMock).not.toHaveBeenCalled();
    expect(listAdvisersMock).not.toHaveBeenCalled();
    expect(getPaymentMethodsByCompanyMock).not.toHaveBeenCalled();
    expect(listCompanyPaymentAccountsByCompanyMock).not.toHaveBeenCalled();

    expect(screen.getByTestId("client-section")).toHaveTextContent("Cliente Inicial");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Venta");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Principal");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Facebook");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Ana");
    expect(screen.getByTestId("shipping-section")).toHaveTextContent("Sucursal Inicial");
    expect(screen.getByTestId("payment-cards")).toHaveTextContent("EFECTIVO");
    expect(screen.getByTestId("payment-cards")).toHaveTextContent("Caja principal");

    fireEvent.click(screen.getByRole("button", { name: "buscar cliente" }));

    await waitFor(() =>
      expect(listClientsMock).toHaveBeenCalledWith({
        page: 1,
        limit: 25,
        q: "ana",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("client-section")).toHaveTextContent("Cliente Uno"),
    );

    fireEvent.click(screen.getByRole("button", { name: "buscar sucursal" }));

    await waitFor(() =>
      expect(listSubsidiariesMock).toHaveBeenCalledWith({
        isActive: true,
        q: "olva",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("shipping-section")).toHaveTextContent("Olva"),
    );
  });

  it("keeps create save disabled until the minimum required form is complete", async () => {
    render(<EditorHarness />);

    await waitFor(() => expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"));

    const saveButton = screen.getByRole("button", { name: "Crear pedido" });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute("title", "Selecciona el tipo de pedido.");
    expect(saveSaleOrderWithClientMock).not.toHaveBeenCalled();
  });

  it("enables updating an existing order after increasing an item quantity", async () => {
    const existingOrder = {
      id: "order-edit-1",
      workflow: { id: "workflow-1", name: "Venta" },
      warehouse: { id: "warehouse-1", name: "Principal" },
      client: {
        id: "client-1",
        type: "NEW",
        fullName: "Ana Perez",
        docType: "DNI",
        docNumber: "12345678",
        departmentId: "15",
        provinceId: "1501",
        districtId: "150101",
        isActive: true,
        telephones: [],
      },
      items: [
        {
          id: "item-1",
          description: "Producto individual",
          quantity: 1,
          unitPrice: 20,
          total: 20,
          components: [],
        },
      ],
      supplies: [],
      payments: [],
      attachments: [],
      editPolicy: {
        stockStatus: "NONE",
        productsEditable: true,
        warehouseEditable: true,
        isFinal: false,
        reason: null,
      },
    } as unknown as SaleOrder;

    function EditHarness() {
      const [footer, setFooter] = useState<ReactNode | null>(null);
      const [dirty, setDirty] = useState(false);

      return (
        <>
          <SaleOrderEditor
            mode="edit"
            order={existingOrder}
            onCancel={noopCancel}
            onSaved={noopSaved}
            onDirtyChange={setDirty}
            onFooterChange={setFooter}
          />
          <output data-testid="edit-dirty">{dirty ? "dirty" : "clean"}</output>
          <div data-testid="edit-footer">{footer}</div>
        </>
      );
    }

    render(<EditHarness />);

    const updateButton = await screen.findByRole("button", {
      name: "Actualizar pedido",
    });
    await waitFor(() => {
      expect(updateButton).toBeDisabled();
      expect(updateButton).toHaveAttribute(
        "title",
        "Modifica algún dato del pedido para actualizarlo.",
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: "aumentar primera cantidad" }),
    );

    await waitFor(() => {
      expect(updateButton).not.toBeDisabled();
      expect(screen.getByTestId("edit-dirty")).toHaveTextContent("dirty");
    });
  });

  it("allows correcting products and packs in a finalized consumed order", async () => {
    const finalizedOrder = {
      id: "order-final-1",
      workflow: { id: "workflow-1", name: "ABONADO CE" },
      warehouse: { id: "warehouse-1", name: "Principal" },
      client: {
        id: "client-1",
        type: "NEW",
        fullName: "Ana Perez",
        docType: "DNI",
        docNumber: "12345678",
        departmentId: "15",
        provinceId: "1501",
        districtId: "150101",
        isActive: true,
        telephones: [],
      },
      items: [
        {
          id: "item-1",
          description: "Producto individual",
          quantity: 1,
          unitPrice: 20,
          total: 20,
          components: [],
        },
      ],
      supplies: [],
      payments: [{ id: "payment-1", method: "EFECTIVO", amount: 20 }],
      attachments: [],
      editPolicy: {
        stockStatus: "CONSUMED",
        productsEditable: true,
        warehouseEditable: false,
        isFinal: true,
        reason: "Pedido finalizado · Stock consumido",
      },
    } as unknown as SaleOrder;

    function FinalizedHarness() {
      const [footer, setFooter] = useState<ReactNode | null>(null);
      return (
        <>
          <SaleOrderEditor
            mode="edit"
            order={finalizedOrder}
            onCancel={noopCancel}
            onSaved={noopSaved}
            onFooterChange={setFooter}
          />
          <div>{footer}</div>
        </>
      );
    }

    render(<FinalizedHarness />);

    expect(
      await screen.findByText(/Edición de corrección:/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Producto directo" }),
    ).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Agregar Pack" })).not.toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "aumentar primera cantidad" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Actualizar pedido" }),
      ).not.toBeDisabled(),
    );
  });

  it("saves a recognized pack in a legacy imported order without workflow", async () => {
    saveSaleOrderWithClientMock.mockResolvedValue({
      orderId: "legacy-order-1",
      serie: "PE",
      correlative: 28,
    });
    const legacyOrder = {
      id: "legacy-order-1",
      workflow: null,
      workflowId: null,
      client: {
        id: "client-1",
        type: "NEW",
        fullName: "Cliente importado",
        docType: "NONE",
        docNumber: "",
        departmentId: "15",
        provinceId: "1501",
        districtId: "150101",
        isActive: true,
        telephones: [],
      },
      items: [
        {
          id: "unknown-item-1",
          description: "Pack desconocido",
          quantity: 1,
          unitPrice: 20,
          total: 20,
          components: [
            {
              id: "component-1",
              skuId: "sku-1",
              quantity: 1,
              unitPrice: 20,
              total: 20,
            },
          ],
        },
      ],
      supplies: [],
      payments: [],
      attachments: [],
      editPolicy: {
        stockStatus: "NONE",
        productsEditable: true,
        warehouseEditable: true,
        isFinal: false,
        reason: null,
      },
    } as unknown as SaleOrder;

    function LegacyEditHarness() {
      const [footer, setFooter] = useState<ReactNode | null>(null);
      return (
        <>
          <SaleOrderEditor
            mode="edit"
            order={legacyOrder}
            onCancel={noopCancel}
            onSaved={noopSaved}
            onFooterChange={setFooter}
          />
          <div>{footer}</div>
        </>
      );
    }

    render(<LegacyEditHarness />);
    const updateButton = await screen.findByRole("button", {
      name: "Actualizar pedido",
    });
    expect(updateButton).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "reconocer primer pack" }),
    );
    await waitFor(() => expect(updateButton).not.toBeDisabled());
    fireEvent.click(updateButton);

    await waitFor(() =>
      expect(saveSaleOrderWithClientMock).toHaveBeenCalledTimes(1),
    );
    const [payload, , editingId] = saveSaleOrderWithClientMock.mock.calls[0];
    expect(editingId).toBe("legacy-order-1");
    expect(payload.workflowId).toBeUndefined();
    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        referencePackId: "pack-1",
        packNameSnapshot: "Pack reconocido",
      }),
    );
  });

  it("saves a complete create form with shipping and payment photos", async () => {
    saveSaleOrderWithClientMock.mockResolvedValue({
      orderId: "order-99",
      serie: "SO",
      correlative: 99,
    });
    const onSaved = vi.fn();

    render(<EditorHarness onSaved={onSaved} />);

    await waitFor(() => expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"));
    fireEvent.click(screen.getByRole("button", { name: "preparar pedido valido" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Crear pedido" })).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));

    await waitFor(() => expect(saveSaleOrderWithClientMock).toHaveBeenCalledTimes(1));
    const [payload, files, editingId] = saveSaleOrderWithClientMock.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        workflowId: "workflow-1",
        warehouseId: "warehouse-1",
        sourceId: "source-1",
        agencyDetail: "Olva Miraflores",
        deliveryCost: 12,
        discount: 2,
        advertisingCode: "FB-123",
        sendCode: "TRACK-1",
        client: expect.objectContaining({
          mode: "create",
          data: expect.objectContaining({
            fullName: "Ana Perez",
            docNumber: "12345678",
            departmentId: "15",
            provinceId: "1501",
            districtId: "150101",
          }),
        }),
        items: [
          expect.objectContaining({
            description: "Pack prueba",
            quantity: 1,
            unitPrice: 50,
            total: 50,
          }),
        ],
        payments: [
          expect.objectContaining({
            clientKey: "payment-1",
            bankAccountId: "account-1",
            method: "EFECTIVO",
            amount: 20,
            date: "2026-07-15",
            operationNumber: "OP-1",
          }),
        ],
      }),
    );
    expect(files.shippingPhoto).toBeInstanceOf(File);
    expect(files.shippingPhoto?.name).toBe("shipping.webp");
    expect(files.paymentPhotos).toBeInstanceOf(Map);
    expect(files.paymentPhotos.get("payment-1")?.name).toBe("payment.webp");
    expect(editingId).toBeNull();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("order-99"));
  });

  it("adds a direct SKU item from the Packs header without pack references", async () => {
    render(<EditorHarness />);

    await waitFor(() =>
      expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Producto directo" }));

    expect(screen.getByTestId("items-section")).toHaveTextContent("items:1");
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "description:JABON AZUFRE AZUFRE -10017 (EVA01893)",
    );
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "pack:none",
    );
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "component:none",
    );
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "sku:sku-1",
    );
    expect(matchSaleOrderProductPackMock).not.toHaveBeenCalled();
  });

  it("groups independent products when a unique pack is completed", async () => {
    matchSaleOrderProductPackMock.mockResolvedValue(uniquePackMatch);
    render(<EditorHarness />);

    await waitFor(() =>
      expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Producto directo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Producto directo alterno" }),
    );

    await waitFor(() =>
      expect(matchSaleOrderProductPackMock).toHaveBeenCalledWith([
        { skuId: "sku-1", quantity: 1 },
        { skuId: "sku-2", quantity: 2 },
      ]),
    );
    await waitFor(() =>
      expect(screen.getByTestId("items-section")).toHaveTextContent("items:1"),
    );
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "description:Pack Facial",
    );
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "pack:pack-1",
    );
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "component:pack-item-1",
    );
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "components:2",
    );
    expect(sileoSuccessMock).toHaveBeenCalledWith({
      title: "Los productos se agruparon como Pack Facial.",
    });
  });

  it("keeps manually added products independent when no pack matches", async () => {
    render(<EditorHarness />);

    await waitFor(() =>
      expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Producto directo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Producto directo alterno" }),
    );

    await waitFor(() =>
      expect(matchSaleOrderProductPackMock).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByTestId("items-section")).toHaveTextContent("items:2");
    expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
      "pack:none",
    );
    expect(screen.getByTestId("sale-order-item-1")).toHaveTextContent(
      "pack:none",
    );
    expect(sileoErrorMock).not.toHaveBeenCalled();
  });

  it("keeps products independent and informs when matching is ambiguous", async () => {
    matchSaleOrderProductPackMock.mockResolvedValue({
      status: "AMBIGUOUS",
      composition: uniquePackMatch.composition,
      matches: [
        { id: "pack-1", description: "Pack Facial", total: 30 },
        { id: "pack-2", description: "Pack Facial 2", total: 30 },
      ],
    });
    render(<EditorHarness />);

    await waitFor(() =>
      expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Producto directo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Producto directo alterno" }),
    );

    await waitFor(() =>
      expect(sileoErrorMock).toHaveBeenCalledWith({
        title:
          "Hay varios packs con esta composición. Los productos permanecen independientes; selecciona el pack manualmente.",
      }),
    );
    expect(screen.getByTestId("items-section")).toHaveTextContent("items:2");
  });

  it("blocks repeated product additions while pack matching is pending", async () => {
    let resolveMatch!: (value: SaleOrderPackMatchResponse) => void;
    matchSaleOrderProductPackMock.mockImplementation(
      () =>
        new Promise<SaleOrderPackMatchResponse>((resolve) => {
          resolveMatch = resolve;
        }),
    );
    render(<EditorHarness />);

    await waitFor(() =>
      expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Producto directo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Producto directo alterno" }),
    );

    await waitFor(() =>
      expect(matchSaleOrderProductPackMock).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByRole("button", { name: "Producto directo" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Producto directo alterno" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Agregar Pack" })).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Producto directo alterno" }),
    );
    expect(matchSaleOrderProductPackMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("items-section")).toHaveTextContent("items:2");

    await act(async () => {
      resolveMatch({
        status: "NONE",
        composition: uniquePackMatch.composition,
        matches: [],
      });
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Producto directo" }),
      ).not.toBeDisabled(),
    );
  });

  it("groups products in an existing editable order", async () => {
    matchSaleOrderProductPackMock.mockResolvedValue(uniquePackMatch);
    const existingOrder = {
      id: "order-1",
      items: [
        {
          id: "item-1",
          quantity: 1,
          basePrice: 12.5,
          unitPrice: 12.5,
          total: 12.5,
          description: "JABON AZUFRE",
          components: [
            {
              id: "component-1",
              skuId: "sku-1",
              quantity: 1,
              basePrice: 12.5,
              unitPrice: 12.5,
              total: 12.5,
            },
          ],
        },
      ],
      payments: [],
      supplies: [],
      attachments: [],
      createdAt: "2026-08-10T10:00:00.000Z",
      editPolicy: {
        stockStatus: "NONE",
        productsEditable: true,
        warehouseEditable: true,
        isFinal: false,
        reason: null,
      },
    } as unknown as SaleOrder;

    render(
      <SaleOrderEditor
        mode="edit"
        order={existingOrder}
        onCancel={noopCancel}
        onSaved={noopSaved}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("items-section")).toHaveTextContent("items:1"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Producto directo alterno" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("sale-order-item-0")).toHaveTextContent(
        "pack:pack-1",
      ),
    );
    expect(screen.getByTestId("items-section")).toHaveTextContent("items:1");
  });
});
