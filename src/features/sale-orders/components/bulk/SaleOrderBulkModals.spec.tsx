import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientType, type SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderBulkAssignModal } from "./SaleOrderBulkAssignModal";
import { SaleOrderBulkChangeStateModal } from "./SaleOrderBulkChangeStateModal";

const { listSaleOrderStatesMock, listWorkflowsMock, listAdvisersMock, listUsersMock } = vi.hoisted(() => ({
    listSaleOrderStatesMock: vi.fn(),
    listWorkflowsMock: vi.fn(),
    listAdvisersMock: vi.fn(),
    listUsersMock: vi.fn(),
}));

vi.mock("@/shared/components/modales/Modal", () => ({
    Modal: ({ open, title, description, children }: { open: boolean; title?: string; description?: string; children: React.ReactNode }) =>
        open ? (
            <section>
                {title ? <h1>{title}</h1> : null}
                {description ? <p>{description}</p> : null}
                {children}
            </section>
        ) : null,
}));

vi.mock("@/shared/components/components/SystemButton", () => ({
    SystemButton: ({
        children,
        leftIcon,
        rightIcon,
        tooltip,
        loading,
        ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        leftIcon?: React.ReactNode;
        rightIcon?: React.ReactNode;
        tooltip?: string;
        loading?: boolean;
    }) => (
        <button type="button" aria-label={!children ? tooltip : undefined} disabled={props.disabled || loading} {...props}>
            {leftIcon}
            {children}
            {rightIcon}
        </button>
    ),
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
    FloatingSelect: ({
        label,
        name,
        value,
        options,
        onChange,
        disabled,
    }: {
        label: string;
        name: string;
        value: string;
        options: Array<{ value: string; label: string }>;
        onChange: (value: string) => void;
        disabled?: boolean;
    }) => (
        <label>
            {label}
            <select aria-label={label} name={name} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
                <option value="">Selecciona</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    ),
}));

vi.mock("@/shared/components/components/date-picker/AnimatedDateRangePicker", () => ({
    AnimatedDateRangePicker: ({
        label,
        onChange,
    }: {
        label: string;
        onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
    }) => (
        <div>
            <button
                type="button"
                aria-label={label}
                onClick={() =>
                    onChange({
                        startDate: new Date(2026, 6, 1),
                        endDate: new Date(2026, 6, 31),
                    })
                }
            >
                {label}
            </button>
            <button
                type="button"
                aria-label={`Limpiar ${label}`}
                onClick={() => onChange({ startDate: null, endDate: null })}
            >
                Limpiar {label}
            </button>
        </div>
    ),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/hooks/useAuth", () => ({
    useAuth: () => ({ permissions: [] }),
}));

vi.mock("@/shared/services/workflowService", () => ({
    listSaleOrderStates: listSaleOrderStatesMock,
    listWorkflows: listWorkflowsMock,
}));

vi.mock("@/shared/services/adviserService", () => ({
    listAdvisers: listAdvisersMock,
    createAdviser: vi.fn(),
}));

vi.mock("@/shared/services/userService", () => ({
    listUsers: listUsersMock,
}));

function buildOrder(overrides: Partial<SaleOrder>): SaleOrder {
    return {
        id: "order-1",
        serie: "SO",
        correlative: 1,
        client: {
            id: "client-1",
            type: ClientType.NEW,
            docType: "DNI",
            fullName: "Cliente",
            docNumber: "12345678",
            mainPhone: "999999999",
            departmentId: "dep-1",
            provinceId: "prov-1",
            districtId: "dist-1",
            isActive: true,
        },
        warehouse: null,
        source: null,
        createdBy: null,
        scheduleDate: null,
        deliveryDate: null,
        workflowId: "workflow-1",
        currentStateId: "state-1",
        workflow: { id: "workflow-1", name: "Venta", description: null, isActive: true },
        currentState: {
            id: "state-1",
            name: "Nuevo",
            code: "NEW",
            color: "#64748b",
            isInitial: true,
            isFinal: false,
            isActive: true,
        },
        invoiceSend: false,
        subTotal: 100,
        deliveryCost: 0,
        total: 100,
        note: null,
        agencyDetail: null,
        isActive: true,
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: null,
        totalPaid: 0,
        pendingAmount: 100,
        paymentStatus: "PENDING",
        payments: [],
        items: [],
        ...overrides,
    };
}

describe("SaleOrderBulkChangeStateModal", () => {
    beforeEach(() => {
        listSaleOrderStatesMock.mockReset();
        listWorkflowsMock.mockReset();
    });

    it("uses all sale-order states for the selected-orders state filter", async () => {
        listSaleOrderStatesMock.mockResolvedValue([
            { id: "state-1", name: "Nuevo", color: "#64748b" },
            { id: "state-2", name: "Validado", color: "#22c55e" },
            { id: "state-3", name: "Despachado", color: "#0ea5e9" },
        ]);

        render(
            <SaleOrderBulkChangeStateModal
                open
                selectedOrders={[buildOrder({ id: "order-1", currentStateId: "state-1" })]}
                selectedOrderIds={["order-1"]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );

        await waitFor(() => expect(listSaleOrderStatesMock).toHaveBeenCalled());

        const currentStateFilter = screen.getByLabelText("Filtrar por estado");
        expect(currentStateFilter).toHaveTextContent("Despachado");
    });

    it("filters the selected-orders list by the order current state", async () => {
        listSaleOrderStatesMock.mockResolvedValue([
            { id: "state-1", name: "Nuevo", color: "#64748b" },
            { id: "state-2", name: "Validado", color: "#22c55e" },
        ]);

        render(
            <SaleOrderBulkChangeStateModal
                open
                selectedOrders={[
                    buildOrder({ id: "order-1", serie: "SO", correlative: 1, currentStateId: "state-1" }),
                    buildOrder({
                        id: "order-2",
                        serie: "SO",
                        correlative: 2,
                        currentStateId: "state-2",
                        currentState: { id: "state-2", name: "Validado", code: "OK", color: "#22c55e", isInitial: false, isFinal: false, isActive: true },
                    }),
                ]}
                selectedOrderIds={["order-1", "order-2"]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );

        await waitFor(() => expect(listSaleOrderStatesMock).toHaveBeenCalled());

        fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "Validado" } });

        expect(screen.queryByText("SO-1")).not.toBeInTheDocument();
        expect(screen.getByText("SO-2")).toBeInTheDocument();
    });

    it("filters by visible state name when multiple states share the same name", async () => {
        listSaleOrderStatesMock.mockResolvedValue([
            { id: "workflow-state-1", name: "Coordinado", color: "#64748b" },
            { id: "workflow-state-2", name: "Coordinado", color: "#22c55e" },
            { id: "workflow-state-3", name: "Despachado", color: "#0ea5e9" },
        ]);

        render(
            <SaleOrderBulkChangeStateModal
                open
                selectedOrders={[
                    buildOrder({
                        id: "order-1",
                        serie: "SO",
                        correlative: 1,
                        currentStateId: "workflow-state-1",
                        currentState: { id: "workflow-state-1", name: "Coordinado", code: "COORD", color: "#64748b", isInitial: false, isFinal: false, isActive: true },
                    }),
                    buildOrder({
                        id: "order-2",
                        serie: "SO",
                        correlative: 2,
                        currentStateId: "workflow-state-99",
                        currentState: { id: "workflow-state-99", name: "Coordinado", code: "COORD", color: "#22c55e", isInitial: false, isFinal: false, isActive: true },
                    }),
                    buildOrder({
                        id: "order-3",
                        serie: "SO",
                        correlative: 3,
                        currentStateId: "workflow-state-3",
                        currentState: { id: "workflow-state-3", name: "Despachado", code: "SENT", color: "#0ea5e9", isInitial: false, isFinal: false, isActive: true },
                    }),
                ]}
                selectedOrderIds={["order-1", "order-2", "order-3"]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );

        await waitFor(() => expect(listSaleOrderStatesMock).toHaveBeenCalled());

        const currentStateFilter = screen.getByLabelText("Filtrar por estado");
        fireEvent.change(currentStateFilter, { target: { value: "Coordinado" } });

        expect(currentStateFilter.querySelectorAll("option[value='Coordinado']")).toHaveLength(1);
        expect(screen.getByText("SO-1")).toBeInTheDocument();
        expect(screen.getByText("SO-2")).toBeInTheDocument();
        expect(screen.queryByText("SO-3")).not.toBeInTheDocument();
    });

    it("automatically loads up to 100 orders when state filters and date range are selected", async () => {
        listSaleOrderStatesMock.mockResolvedValue([
            { id: "state-1", name: "Nuevo", color: "#64748b" },
            { id: "state-2", name: "Validado", color: "#22c55e" },
        ]);
        const onLoadFilteredOrders = vi.fn().mockResolvedValue([
            buildOrder({ id: "order-2", serie: "SO", correlative: 2, currentStateId: "state-2" }),
        ]);

        render(
            <SaleOrderBulkChangeStateModal
                open
                selectedOrders={[buildOrder({ id: "order-1", currentStateId: "state-1" })]}
                selectedOrderIds={["order-1"]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                onLoadFilteredOrders={onLoadFilteredOrders}
            />,
        );

        await waitFor(() => expect(listSaleOrderStatesMock).toHaveBeenCalled());

        fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "Nuevo" } });
        fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "Validado" } });
        fireEvent.click(screen.getByRole("button", { name: "Rango de fechas" }));

        await waitFor(() =>
            expect(onLoadFilteredOrders).toHaveBeenCalledWith({
                page: 1,
                limit: 100,
                filters: [
                    { field: "saleOrderStateId", operator: "in", values: ["state-1", "state-2"] },
                    { field: "createdAt", operator: "between", range: { start: "2026-07-01", end: "2026-07-31" } },
                ],
            }),
        );
        expect(await screen.findByText("SO-2")).toBeInTheDocument();
        expect(screen.getAllByText("Nuevo").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Validado").length).toBeGreaterThan(0);
        expect(screen.queryByRole("button", { name: "Traer pedidos" })).not.toBeInTheDocument();
    });

    it("automatically loads up to 100 orders when workflow type and date range are selected", async () => {
        listSaleOrderStatesMock.mockResolvedValue([
            { id: "state-1", name: "Nuevo", color: "#64748b" },
        ]);
        listWorkflowsMock.mockResolvedValue([
            { id: "workflow-1", name: "Venta", description: null, isActive: true },
            { id: "workflow-2", name: "Renovacion", description: null, isActive: true },
        ]);
        const onLoadFilteredOrders = vi.fn().mockResolvedValue([
            buildOrder({
                id: "order-2",
                serie: "SO",
                correlative: 2,
                workflowId: "workflow-2",
                workflow: { id: "workflow-2", name: "Renovacion", description: null, isActive: true },
            }),
        ]);

        render(
            <SaleOrderBulkChangeStateModal
                open
                selectedOrders={[]}
                selectedOrderIds={[]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                onLoadFilteredOrders={onLoadFilteredOrders}
            />,
        );

        await waitFor(() => expect(listWorkflowsMock).toHaveBeenCalled());

        fireEvent.change(screen.getByLabelText("Filtrar por tipo"), { target: { value: "workflow-2" } });
        fireEvent.click(screen.getByRole("button", { name: "Rango de fechas" }));

        await waitFor(() =>
            expect(onLoadFilteredOrders).toHaveBeenCalledWith({
                page: 1,
                limit: 100,
                filters: [
                    { field: "workflowId", operator: "in", values: ["workflow-2"] },
                    { field: "createdAt", operator: "between", range: { start: "2026-07-01", end: "2026-07-31" } },
                ],
            }),
        );
        expect(await screen.findByText("SO-2")).toBeInTheDocument();
        expect(screen.getAllByText("Renovacion").length).toBeGreaterThan(0);
    });

    it("clears the list after a remote date-range search is cleared", async () => {
        listSaleOrderStatesMock.mockResolvedValue([
            { id: "state-1", name: "Nuevo", color: "#64748b" },
        ]);
        const onLoadFilteredOrders = vi.fn().mockResolvedValue([
            buildOrder({ id: "order-2", serie: "SO", correlative: 2, currentStateId: "state-1" }),
        ]);

        render(
            <SaleOrderBulkChangeStateModal
                open
                selectedOrders={[buildOrder({ id: "order-1", serie: "SO", correlative: 1, currentStateId: "state-1" })]}
                selectedOrderIds={["order-1"]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                onLoadFilteredOrders={onLoadFilteredOrders}
            />,
        );

        await waitFor(() => expect(listSaleOrderStatesMock).toHaveBeenCalled());
        fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "Nuevo" } });
        fireEvent.click(screen.getByRole("button", { name: "Rango de fechas" }));
        expect(await screen.findByText("SO-2")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Limpiar Rango de fechas" }));

        await waitFor(() => expect(screen.queryByText("SO-2")).not.toBeInTheDocument());
        expect(screen.queryByText("SO-1")).not.toBeInTheDocument();
    });
});

describe("SaleOrderBulkAssignModal", () => {
    beforeEach(() => {
        listAdvisersMock.mockReset();
        listUsersMock.mockReset();
        listAdvisersMock.mockResolvedValue([
            { id: "adviser-1", name: "Asesor Uno", email: "asesor1@test.com" },
            { id: "adviser-2", name: "Asesor Dos", email: "asesor2@test.com" },
        ]);
        listUsersMock.mockResolvedValue({
            items: [
                { id: "creator-1", name: "Creador Uno", email: "creador1@test.com" },
                { id: "creator-2", name: "Creador Dos", email: "creador2@test.com" },
            ],
        });
    });

    it("filters selected orders by creator and adviser without showing order state", async () => {
        const onSubmit = vi.fn();
        const orders = [
            buildOrder({
                id: "order-1",
                serie: "SO",
                correlative: 1,
                createdBy: { id: "creator-1", name: "Creador Uno", email: "creador1@test.com" },
                assignedBy: { id: "adviser-1", name: "Asesor Uno", email: "asesor1@test.com" },
                currentState: { id: "state-1", name: "Nuevo", code: "NEW", color: "#64748b", isInitial: true, isFinal: false, isActive: true },
            }),
            buildOrder({
                id: "order-2",
                serie: "SO",
                correlative: 2,
                createdBy: { id: "creator-2", name: "Creador Dos", email: "creador2@test.com" },
                assignedBy: { id: "adviser-2", name: "Asesor Dos", email: "asesor2@test.com" },
                currentState: { id: "state-2", name: "Despachado", code: "SENT", color: "#0ea5e9", isInitial: false, isFinal: false, isActive: true },
            }),
        ];

        render(
            <SaleOrderBulkAssignModal
                open
                selectedOrders={orders}
                selectedOrderIds={["order-1", "order-2"]}
                onClose={vi.fn()}
                onSubmit={onSubmit}
            />,
        );

        await waitFor(() => expect(listUsersMock).toHaveBeenCalledWith({ status: "active", page: 1 }));
        expect(screen.queryByText("Estado: Nuevo")).not.toBeInTheDocument();
        expect(screen.queryByText("Estado: Despachado")).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Creado por"), { target: { value: "creator-2" } });
        fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "adviser-2" } });
        fireEvent.change(screen.getByLabelText("Asesor"), { target: { value: "adviser-1" } });
        fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

        expect(onSubmit).toHaveBeenCalledWith({ assignedBy: "adviser-1", saleOrderIds: ["order-2"] });
    });

    it("supports filtering assigned orders by any adviser", async () => {
        const onSubmit = vi.fn();
        const orders = [
            buildOrder({
                id: "order-1",
                serie: "SO",
                correlative: 1,
                assignedBy: null,
            }),
            buildOrder({
                id: "order-2",
                serie: "SO",
                correlative: 2,
                assignedBy: { id: "adviser-2", name: "Asesor Dos", email: "asesor2@test.com" },
            }),
        ];

        render(
            <SaleOrderBulkAssignModal
                open
                selectedOrders={orders}
                selectedOrderIds={["order-1", "order-2"]}
                onClose={vi.fn()}
                onSubmit={onSubmit}
            />,
        );

        await waitFor(() => expect(listAdvisersMock).toHaveBeenCalled());
        const assignedToFilter = screen.getByLabelText("Asignado a");
        expect(assignedToFilter).toHaveTextContent("Con asesor");

        fireEvent.change(assignedToFilter, { target: { value: "__assigned__" } });
        fireEvent.change(screen.getByLabelText("Asesor"), { target: { value: "adviser-1" } });
        fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

        expect(screen.queryByText("SO-1")).not.toBeInTheDocument();
        expect(screen.getByText("SO-2")).toBeInTheDocument();
        expect(onSubmit).toHaveBeenCalledWith({ assignedBy: "adviser-1", saleOrderIds: ["order-2"] });
    });

    it("automatically loads up to 100 orders with multiple creator and assignee filters plus date range", async () => {
        const onLoadFilteredOrders = vi.fn().mockResolvedValue([
            buildOrder({
                id: "order-3",
                serie: "SO",
                correlative: 3,
                createdBy: { id: "creator-1", name: "Creador Uno", email: "creador1@test.com" },
                assignedBy: { id: "adviser-2", name: "Asesor Dos", email: "asesor2@test.com" },
            }),
        ]);

        render(
            <SaleOrderBulkAssignModal
                open
                selectedOrders={[]}
                selectedOrderIds={[]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                onLoadFilteredOrders={onLoadFilteredOrders}
            />,
        );

        await waitFor(() => expect(listUsersMock).toHaveBeenCalledWith({ status: "active", page: 1 }));

        fireEvent.change(screen.getByLabelText("Creado por"), { target: { value: "creator-1" } });
        fireEvent.change(screen.getByLabelText("Creado por"), { target: { value: "creator-2" } });
        fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "adviser-2" } });
        fireEvent.click(screen.getByRole("button", { name: "Rango de fechas" }));

        await waitFor(() =>
            expect(onLoadFilteredOrders).toHaveBeenCalledWith({
                page: 1,
                limit: 100,
                filters: [
                    { field: "createdBy", operator: "in", values: ["creator-1", "creator-2"] },
                    { field: "assignedBy", operator: "in", values: ["adviser-2"] },
                    { field: "createdAt", operator: "between", range: { start: "2026-07-01", end: "2026-07-31" } },
                ],
            }),
        );
        expect(await screen.findByText("SO-3")).toBeInTheDocument();
        expect(screen.getAllByText("Creador Uno (creador1@test.com)").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Creador Dos (creador2@test.com)").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Asesor Dos (asesor2@test.com)").length).toBeGreaterThan(0);
        expect(screen.queryByRole("button", { name: "Traer pedidos" })).not.toBeInTheDocument();
    });

    it("does not send local sentinel filters as remote UUID filters", async () => {
        const onLoadFilteredOrders = vi.fn().mockResolvedValue([]);

        render(
            <SaleOrderBulkAssignModal
                open
                selectedOrders={[]}
                selectedOrderIds={[]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                onLoadFilteredOrders={onLoadFilteredOrders}
            />,
        );

        await waitFor(() => expect(listUsersMock).toHaveBeenCalledWith({ status: "active", page: 1 }));

        fireEvent.change(screen.getByLabelText("Creado por"), { target: { value: "__none__" } });
        fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "__none__" } });
        fireEvent.change(screen.getByLabelText("Asignado a"), { target: { value: "__assigned__" } });
        fireEvent.click(screen.getByRole("button", { name: "Rango de fechas" }));

        await waitFor(() =>
            expect(onLoadFilteredOrders).toHaveBeenCalledWith({
                page: 1,
                limit: 100,
                filters: [
                    { field: "createdAt", operator: "between", range: { start: "2026-07-01", end: "2026-07-31" } },
                ],
            }),
        );
    });

    it("clears the list after a remote date-range search is cleared", async () => {
        const onLoadFilteredOrders = vi.fn().mockResolvedValue([
            buildOrder({
                id: "order-2",
                serie: "SO",
                correlative: 2,
                createdBy: { id: "creator-1", name: "Creador Uno", email: "creador1@test.com" },
                assignedBy: { id: "adviser-2", name: "Asesor Dos", email: "asesor2@test.com" },
            }),
        ]);

        render(
            <SaleOrderBulkAssignModal
                open
                selectedOrders={[buildOrder({ id: "order-1", serie: "SO", correlative: 1, createdBy: { id: "creator-1", name: "Creador Uno", email: "creador1@test.com" } })]}
                selectedOrderIds={["order-1"]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                onLoadFilteredOrders={onLoadFilteredOrders}
            />,
        );

        await waitFor(() => expect(listUsersMock).toHaveBeenCalledWith({ status: "active", page: 1 }));
        fireEvent.change(screen.getByLabelText("Creado por"), { target: { value: "creator-1" } });
        fireEvent.click(screen.getByRole("button", { name: "Rango de fechas" }));
        expect(await screen.findByText("SO-2")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Limpiar Rango de fechas" }));

        await waitFor(() => expect(screen.queryByText("SO-2")).not.toBeInTheDocument());
        expect(screen.queryByText("SO-1")).not.toBeInTheDocument();
    });
});
