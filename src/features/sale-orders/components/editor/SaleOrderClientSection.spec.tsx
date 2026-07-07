import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderClientSection } from "./SaleOrderClientSection";
import {
  buildEmptySaleOrderEditorForm,
  type SaleOrderEditorForm,
} from "./saleOrderEditorForm";

vi.mock("@/shared/hooks/useUbigeoCatalog", () => ({
  useUbigeoCatalog: () => ({
    catalog: { departments: [], provinces: [], districts: [] },
  }),
}));

vi.mock("@/features/clients/components/ClientFormFields", () => ({
  ClientFormFields: ({ onFullNameTextChange, setForm }: any) => (
    <button
      type="button"
      onClick={() => {
        onFullNameTextChange?.("Ana Maria");
        setForm((current: any) => ({ ...current, fullName: "Ana Maria" }));
      }}
    >
      change-client-name
    </button>
  ),
}));

function Harness() {
  const initial = buildEmptySaleOrderEditorForm();
  initial.clientMode = "update";
  initial.selectedClientId = "client-1";
  initial.clientData = {
    ...initial.clientData,
    fullName: "Ana Perez",
    departmentId: "15",
    provinceId: "1501",
    districtId: "150101",
  };

  const [form, setForm] = useState<SaleOrderEditorForm>(initial);

  return (
    <>
      <SaleOrderClientSection
        form={form}
        setForm={setForm}
        clientOptions={[]}
        onSelectClient={vi.fn()}
      />
      <output data-testid="client-mode">{form.clientMode}</output>
      <output data-testid="selected-client">{form.selectedClientId}</output>
      <output data-testid="full-name">{form.clientData.fullName}</output>
    </>
  );
}

describe("SaleOrderClientSection", () => {
  it("keeps update mode when editing the name of the current sale-order client", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "change-client-name" }));

    expect(screen.getByTestId("client-mode")).toHaveTextContent("update");
    expect(screen.getByTestId("selected-client")).toHaveTextContent("client-1");
    expect(screen.getByTestId("full-name")).toHaveTextContent("Ana Maria");
  });
});
