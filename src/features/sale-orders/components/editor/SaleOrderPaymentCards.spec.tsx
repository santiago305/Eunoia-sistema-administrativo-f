import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderPaymentCards } from "./SaleOrderPaymentCards";
import {
  buildEmptySaleOrderEditorForm,
  type SaleOrderEditorForm,
} from "./saleOrderEditorForm";

const { sileoError, permissions, getRevisions, getRevisionContent } = vi.hoisted(() => ({
  sileoError: vi.fn(),
  permissions: ["*"],
  getRevisions: vi.fn().mockResolvedValue([]),
  getRevisionContent: vi.fn(),
}));

const paymentMethodId = "11111111-1111-4111-8111-111111111111";
const paymentAccountId = "22222222-2222-4222-8222-222222222222";

vi.mock("sileo", () => ({
  sileo: {
    error: sileoError,
  },
}));

vi.mock("@/shared/hooks/usePermissions", () => ({ usePermissions: () => ({
  can: (permission: string) => permissions.includes("*") || permissions.includes(permission),
  canAll: (required: string[]) => required.every((permission) => permissions.includes("*") || permissions.includes(permission)),
  canAny: (required: string[]) => required.some((permission) => permissions.includes("*") || permissions.includes(permission)),
}) }));

vi.mock("@/shared/services/incomeService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/services/incomeService")>()),
  getIncomeEvidenceRevisions: getRevisions,
  getIncomeEvidenceRevisionContent: getRevisionContent,
}));

vi.mock("../useSaleOrderPaymentOptions", () => ({
  filterSaleOrderBankAccountOptions: (accounts: unknown[]) => accounts,
  useSaleOrderPaymentOptions: () => ({
    methodOptions: [{ value: "11111111-1111-4111-8111-111111111111", label: "EFECTIVO" }],
    bankAccountOptions: [{ value: "22222222-2222-4222-8222-222222222222", label: "BCP 123" }],
  }),
}));

vi.mock(
  "@/shared/components/components/date-picker/FloatingDatePicker",
  () => ({
    FloatingDatePicker: ({
      label,
      name,
      value,
      onChange,
    }: {
      label: string;
      name: string;
      value?: Date | null;
      onChange: (date: Date | null) => void;
    }) => (
      <div>
        <span>
          {label}:{value
            ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
            : "empty"}
        </span>
        <button
          type="button"
          onClick={() => onChange(new Date(2026, 6, 9))}
        >
          select-{name}
        </button>
        <button type="button" onClick={() => onChange(null)}>
          clear-{name}
        </button>
      </div>
    ),
  }),
);

function PaymentHarness({ persistedPayment = false, persistedStatus = "PENDING_CONFIRMATION" }: { persistedPayment?: boolean; persistedStatus?: SaleOrderEditorForm["payments"][number]["status"] | null }) {
  const [form, setForm] = useState<SaleOrderEditorForm>(() => ({
    ...buildEmptySaleOrderEditorForm(),
    items: [
      {
        total: 100,
      } as SaleOrderEditorForm["items"][number],
    ],
    payments: [
      {
        ...(persistedPayment ? { id: "income-1", version: 1, ...(persistedStatus ? { status: persistedStatus } : {}) } : {}),
        clientKey: "payment-1",
        bankAccountId: paymentAccountId,
        companyPaymentAccountId: paymentAccountId,
        paymentMethodId,
        method: "EFECTIVO",
        amount: 10,
        date: "2026-07-06",
        photo: null,
      },
    ],
  }));

  return (
    <>
      <SaleOrderPaymentCards form={form} setForm={setForm} />
      <output data-testid="payment-state">
        {JSON.stringify(form.payments)}
      </output>
    </>
  );
}

describe("SaleOrderPaymentCards", () => {
  it("shows evidence history only when financial read, audit, evidence and scope permissions are present", async () => {
    permissions.splice(0, permissions.length, "income.read", "income.audit.view", "payments.view_evidence", "income.view_own");
    getRevisions.mockResolvedValueOnce([]);
    const { unmount } = render(<PaymentHarness persistedPayment />);
    await userEvent.setup().click(screen.getByRole("button", { name: /2026-07-06.*S\/\s?10\.00/i }));
    await waitFor(() => expect(getRevisions).toHaveBeenCalledWith("income-1", 50));
    expect(screen.getByText("Historial de evidencias")).toBeInTheDocument();
    unmount();

    permissions.splice(0, permissions.length, "income.read", "payments.view_evidence", "income.view_own");
    getRevisions.mockClear();
    render(<PaymentHarness persistedPayment />);
    await userEvent.setup().click(screen.getByRole("button", { name: /2026-07-06.*S\/\s?10\.00/i }));
    expect(screen.queryByText("Historial de evidencias")).not.toBeInTheDocument();
    expect(getRevisions).not.toHaveBeenCalled();
    permissions.splice(0, permissions.length, "*");
  });

  it("keeps a persisted pending income in history and directs cancellation to Ingresos", () => {
    render(<PaymentHarness persistedPayment />);

    expect(screen.getByText("Por confirmar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar" })).not.toBeInTheDocument();
  });

  it("fails closed for a persisted payment without a known lifecycle state", async () => {
    const user = userEvent.setup();
    getRevisions.mockResolvedValue([]);
    render(<PaymentHarness persistedPayment persistedStatus={null} />);

    expect(screen.getByText("Estado desconocido")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /2026-07-06.*S\/\s?10\.00/i }));
    expect(screen.getByRole("dialog", { name: "Detalle del ingreso (estado desconocido)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toHaveAttribute("readonly", "");
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Subir imagen")).not.toBeInTheDocument();
  });

  it("keeps legacy VOIDED visible as unknown, read-only, and reserved against new payments", async () => {
    const user = userEvent.setup();
    getRevisions.mockResolvedValue([]);
    render(<PaymentHarness persistedPayment persistedStatus="VOIDED" />);

    expect(screen.getByText("Estado desconocido")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /2026-07-06.*S\/\s?10\.00/i }));
    expect(screen.getByRole("dialog", { name: "Detalle del ingreso (estado desconocido)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toHaveAttribute("readonly", "");
    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    await user.click(screen.getByRole("button", { name: "Agregar Pago" }));
    expect(screen.getByLabelText("Monto")).toHaveValue(90);
  });

  it("creates and edits payments through a modal with all payment fields", async () => {
    const user = userEvent.setup();
    render(<PaymentHarness />);

    expect(screen.queryByText("Metodo")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /2026-07-06.*S\/\s?10\.00/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /2026-07-06.*S\/\s?10\.00/i }),
    );
    expect(
      screen.getByRole("dialog", { name: "Modificar pago" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toHaveValue(10);
    expect(screen.getByLabelText("Operacion")).toBeInTheDocument();
    expect(screen.getByLabelText("Subir imagen")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "select-payment-date-payment-1",
      }),
    );
    await user.clear(screen.getByLabelText("Monto"));
    await user.type(screen.getByLabelText("Monto"), "25.5");
    await user.click(screen.getByRole("button", { name: "Guardar pago" }));

    expect(screen.getByTestId("payment-state")).toHaveTextContent(
      '"date":"2026-07-09"',
    );
    expect(screen.getByTestId("payment-state")).toHaveTextContent(
      '"amount":25.5',
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Modificar pago" }),
      ).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Agregar Pago" }));
    expect(
      screen.getByRole("dialog", { name: "Agregar pago" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toHaveValue(74.5);
  });

  it("warns when required payment fields are missing", async () => {
    const user = userEvent.setup();
    render(<PaymentHarness />);

    await user.click(screen.getByRole("button", { name: "Agregar Pago" }));
    await user.click(screen.getByRole("button", { name: "Guardar pago" }));

    expect(sileoError).toHaveBeenCalledWith({
      title: "Completa monto, metodo, fecha y cuenta para guardar el pago.",
    });
    expect(screen.getByRole("dialog", { name: "Agregar pago" })).toBeInTheDocument();
    const payments = JSON.parse(
      screen.getByTestId("payment-state").textContent ?? "[]",
    ) as Array<{ amount: number }>;
    expect(payments).toHaveLength(1);
  });

  it("blocks saving a payment greater than the pending balance", async () => {
    const user = userEvent.setup();
    render(<PaymentHarness />);

    await user.click(
      screen.getByRole("button", { name: /2026-07-06.*S\/\s?10\.00/i }),
    );
    await user.clear(screen.getByLabelText("Monto"));
    await user.type(screen.getByLabelText("Monto"), "150");
    await user.click(screen.getByRole("button", { name: "Guardar pago" }));

    expect(sileoError).toHaveBeenCalledWith({
      title: "El monto no puede superar el saldo disponible de S/ 100.00.",
    });
    expect(screen.getByText(/El monto no puede superar el saldo disponible/)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Modificar pago" })).toBeInTheDocument();
    expect(screen.getByTestId("payment-state")).toHaveTextContent('"amount":10');
  });
});
