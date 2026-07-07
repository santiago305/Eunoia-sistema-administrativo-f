import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderPaymentCards } from "./SaleOrderPaymentCards";
import {
  buildEmptySaleOrderEditorForm,
  type SaleOrderEditorForm,
} from "./saleOrderEditorForm";

vi.mock("../useSaleOrderPaymentOptions", () => ({
  useSaleOrderPaymentOptions: () => ({
    methodOptions: [],
    bankAccountOptions: [],
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
  it("maps each payment date between the form string and date picker", async () => {
    const user = userEvent.setup();
    const { container } = render(<PaymentHarness />);

    expect(screen.getByText("Fecha:2026-07-06")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "select-payment-date-payment-1",
      }),
    );
    expect(screen.getByTestId("payment-state")).toHaveTextContent(
      '"date":"2026-07-09"',
    );

    await user.click(
      screen.getByRole("button", {
        name: "clear-payment-date-payment-1",
      }),
    );
    expect(screen.getByTestId("payment-state")).toHaveTextContent(
      '"date":""',
    );
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });

  it("uses the pending order balance for a new payment", async () => {
    const user = userEvent.setup();
    render(<PaymentHarness />);

    await user.click(screen.getByRole("button", { name: "Añadir" }));

    const payments = JSON.parse(
      screen.getByTestId("payment-state").textContent ?? "[]",
    ) as Array<{ amount: number }>;
    expect(payments).toHaveLength(2);
    expect(payments[1]?.amount).toBe(90);
  });
});
