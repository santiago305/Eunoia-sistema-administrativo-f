import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SaleOrderInformationSection } from "./SaleOrderInformationSection";
import { buildEmptySaleOrderEditorForm, type SaleOrderEditorForm } from "./saleOrderEditorForm";

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({ permissions: [] }),
}));

vi.mock("@/shared/services/userService", () => ({
  listUsers: vi.fn(),
}));

vi.mock("@/shared/services/adviserService", () => ({
  createAdviser: vi.fn(),
}));

describe("SaleOrderInformationSection", () => {
  const baseForm = (): SaleOrderEditorForm => ({
    ...buildEmptySaleOrderEditorForm(),
    workflowId: "workflow-1",
    warehouseId: "warehouse-1",
    sourceId: "source-1",
    assignedBy: "adviser-1",
    advertisingCode: "FB-001",
    observation: "Prioridad alta",
  });

  it("renders editor metadata fields and hides adviser classification without permission", () => {
    render(
      <SaleOrderInformationSection
        form={baseForm()}
        setForm={vi.fn()}
        workflowOptions={[{ value: "workflow-1", label: "Abonado" }]}
        warehouseOptions={[{ value: "warehouse-1", label: "Principal" }]}
        sourceOptions={[{ value: "source-1", label: "Facebook" }]}
        adviserOptions={[{ id: "adviser-1", name: "Ana Asesora", email: "ana@example.com" }]}
        onAdviserCreated={vi.fn()}
      />,
    );

    expect(screen.getByText(/Informaci/)).toBeInTheDocument();
    expect(screen.getByLabelText(/C.digo publicitario/i)).toHaveValue("FB-001");
    expect(screen.getByLabelText(/Observaci/i)).toHaveValue("Prioridad alta");
    expect(screen.queryByRole("button", { name: "Clasificar usuario como asesor" })).not.toBeInTheDocument();
  });

  it("updates advertising code through the form state", () => {
    function Harness() {
      const [form, setForm] = useState(baseForm());

      return (
        <SaleOrderInformationSection
          form={form}
          setForm={setForm}
          workflowOptions={[]}
          warehouseOptions={[]}
          sourceOptions={[]}
          adviserOptions={[]}
          onAdviserCreated={vi.fn()}
        />
      );
    }

    render(<Harness />);
    fireEvent.change(screen.getByDisplayValue("FB-001"), {
      target: { value: "FB-999" },
    });

    expect(screen.getByDisplayValue("FB-999")).toBeInTheDocument();
  });
});
