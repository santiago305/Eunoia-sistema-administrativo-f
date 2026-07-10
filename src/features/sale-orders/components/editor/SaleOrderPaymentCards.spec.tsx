import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderPaymentCards } from "./SaleOrderPaymentCards";
import {
  buildEmptySaleOrderEditorForm,
  type SaleOrderEditorForm,
} from "./saleOrderEditorForm";

const { sileoError } = vi.hoisted(() => ({
  sileoError: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: {
    error: sileoError,
  },
}));

vi.mock("../useSaleOrderPaymentOptions", () => ({
  useSaleOrderPaymentOptions: () => ({
    methodOptions: [{ value: "EFECTIVO", label: "EFECTIVO" }],
    bankAccountOptions: [{ value: "account-1", label: "BCP 123" }],
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

function PaymentHarness() {
  const [form, setForm] = useState<SaleOrderEditorForm>(() => ({
    ...buildEmptySaleOrderEditorForm(),
    items: [
      {
        total: 100,
      } as SaleOrderEditorForm["items"][number],
    ],
    payments: [
      {
        clientKey: "payment-1",
        bankAccountId: "account-1",
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
      screen.getByRole("dialog", { name: "Detalle de pago" }),
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
        screen.queryByRole("dialog", { name: "Detalle de pago" }),
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
});
