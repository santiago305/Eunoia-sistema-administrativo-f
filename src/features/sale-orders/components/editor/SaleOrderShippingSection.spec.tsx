import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderShippingSection } from "./SaleOrderShippingSection";
import { buildEmptySaleOrderEditorForm } from "./saleOrderEditorForm";

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

function ShippingHarness() {
  const [form, setForm] = useState(() => ({
    ...buildEmptySaleOrderEditorForm(),
    scheduleDate: "2026-07-04",
    sendDate: "2026-07-05",
    deliveryDate: "",
  }));

  return (
    <>
      <SaleOrderShippingSection
        form={form}
        setForm={setForm}
        subsidiaryOptions={[]}
      />
      <output data-testid="shipping-state">
        {JSON.stringify({
          scheduleDate: form.scheduleDate,
          sendDate: form.sendDate,
          deliveryDate: form.deliveryDate,
        })}
      </output>
    </>
  );
}

describe("SaleOrderShippingSection date pickers", () => {
  it("maps every shipping date between form strings and date pickers", async () => {
    const user = userEvent.setup();
    const { container } = render(<ShippingHarness />);

    expect(screen.getByText("Fecha agenda:2026-07-04")).toBeInTheDocument();
    expect(screen.getByText("Fecha de envío:2026-07-05")).toBeInTheDocument();
    expect(screen.getByText("Fecha entrega:empty")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "select-sale-order-delivery-date",
      }),
    );
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"deliveryDate":"2026-07-09"',
    );

    await user.click(
      screen.getByRole("button", {
        name: "clear-sale-order-schedule-date",
      }),
    );
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"scheduleDate":""',
    );
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });
});
