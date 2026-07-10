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

vi.mock("@/shared/components/components/FloatingSuggestInput", () => ({
  FloatingSuggestInput: ({
    label,
    value,
    onChange,
    onOptionSelect,
    options,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onOptionSelect?: (option: { value: string; label: string }) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div>
      <label htmlFor="agency-suggest">{label}</label>
      <input
        id="agency-suggest"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onOptionSelect?.(option)}
        >
          select-{option.label}
        </button>
      ))}
    </div>
  ),
}));

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
        subsidiaryOptions={[
          {
            value: "subsidiary-1",
            label: "Olva Miraflores",
            address: "Av. Larco 123",
            cost: 14,
          },
        ]}
      />
      <output data-testid="shipping-state">
        {JSON.stringify({
          scheduleDate: form.scheduleDate,
          sendDate: form.sendDate,
          deliveryDate: form.deliveryDate,
          agencyDetail: form.agencyDetail,
          sendAddress: form.sendAddress,
          deliveryCost: form.deliveryCost,
        })}
      </output>
    </>
  );
}

describe("SaleOrderShippingSection date pickers", () => {
  it("maps send date between form strings and the date picker", async () => {
    const user = userEvent.setup();
    const { container } = render(<ShippingHarness />);

    expect(screen.getByText("Fecha de envío:2026-07-05")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "select-sale-order-send-date",
      }),
    );
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"sendDate":"2026-07-09"',
    );

    await user.click(
      screen.getByRole("button", {
        name: "clear-sale-order-send-date",
      }),
    );
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"sendDate":""',
    );
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });
});

describe("SaleOrderShippingSection agency detail", () => {
  it("accepts free text and fills shipping fields from a selected subsidiary", async () => {
    const user = userEvent.setup();
    render(<ShippingHarness />);

    await user.type(screen.getByLabelText("Agencia/Dirección"), "Agencia personalizada");
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"agencyDetail":"Agencia personalizada"',
    );

    await user.click(screen.getByRole("button", { name: "select-Olva Miraflores" }));
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"agencyDetail":"Olva Miraflores"',
    );
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"sendAddress":"Av. Larco 123"',
    );
    expect(screen.getByTestId("shipping-state")).toHaveTextContent(
      '"deliveryCost":14',
    );
  });
});

