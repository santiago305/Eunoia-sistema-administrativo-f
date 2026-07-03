import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowActionEditor } from "./WorkflowActionEditor";

const serviceMocks = vi.hoisted(() => ({
  listAllUbigeoProvinces: vi.fn(),
  listAllActiveWarehouses: vi.fn(),
}));

vi.mock("@/shared/services/ubigeoService", () => ({
  listAllUbigeoProvinces: serviceMocks.listAllUbigeoProvinces,
}));

vi.mock("@/shared/services/warehouseServices", () => ({
  listAllActiveWarehouses: serviceMocks.listAllActiveWarehouses,
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({ label, value, options, onChange }: any) => (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="" />
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
}));

vi.mock("@/shared/components/components/FloatingMultiSelect", () => ({
  FloatingMultiSelect: ({ label, name, options, onChange }: any) => (
    <div>
      <button type="button" onClick={() => onChange(options.map((option: any) => option.value))}>
        {label}
      </button>
      <div data-testid={`${name}-options`}>
        {options.map((option: any) => (
          <span key={option.value}>{option.label}</span>
        ))}
      </div>
    </div>
  ),
}));

describe("WorkflowActionEditor", () => {
  beforeEach(() => {
    serviceMocks.listAllUbigeoProvinces.mockResolvedValue([
      { id: "1501", name: "Lima" },
      { id: "0401", name: "Arequipa" },
    ]);
    serviceMocks.listAllActiveWarehouses.mockResolvedValue([
      { warehouseId: "warehouse-1", name: "Principal" },
    ]);
  });

  it("stores mode, provinces, and warehouse for province assignment", async () => {
    const onChange = vi.fn();
    const value = [{
      type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
      config: { mode: "INCLUDE", provinceIds: [], warehouseId: "" },
      position: 0,
    }] as any;

    render(
      <WorkflowActionEditor
        catalog={[{ type: "ASSIGN_WAREHOUSE_BY_PROVINCE", configSchema: {} }] as any}
        value={value}
        onChange={onChange}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Almacén")).toHaveTextContent("Principal"),
    );

    fireEvent.change(screen.getByLabelText("Modo"), { target: { value: "EXCLUDE" } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        config: { mode: "EXCLUDE", provinceIds: [], warehouseId: "" },
      }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Provincias" }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        config: { mode: "INCLUDE", provinceIds: ["0401", "1501"], warehouseId: "" },
      }),
    ]);

    fireEvent.change(screen.getByLabelText("Almacén"), { target: { value: "warehouse-1" } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        config: { mode: "INCLUDE", provinceIds: [], warehouseId: "warehouse-1" },
      }),
    ]);
  });

  it("keeps province options available when warehouses cannot be loaded", async () => {
    serviceMocks.listAllActiveWarehouses.mockRejectedValueOnce(new Error("forbidden"));
    const onChange = vi.fn();
    const value = [{
      type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
      config: { mode: "INCLUDE", provinceIds: [], warehouseId: "" },
      position: 0,
    }] as any;

    render(
      <WorkflowActionEditor
        catalog={[{ type: "ASSIGN_WAREHOUSE_BY_PROVINCE", configSchema: {} }] as any}
        value={value}
        onChange={onChange}
      />,
    );

    await waitFor(() => expect(serviceMocks.listAllActiveWarehouses).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Provincias" }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        config: { mode: "INCLUDE", provinceIds: ["0401", "1501"], warehouseId: "" },
      }),
    ]);
  });

  it("shows every selected province below the province multi-select and removes them from chips", async () => {
    const onChange = vi.fn();
    const value = [{
      type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
      config: { mode: "INCLUDE", provinceIds: ["1501", "0401", "9999"], warehouseId: "" },
      position: 0,
    }] as any;

    render(
      <WorkflowActionEditor
        catalog={[{ type: "ASSIGN_WAREHOUSE_BY_PROVINCE", configSchema: {} }] as any}
        value={value}
        onChange={onChange}
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Quitar Lima" })).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Quitar Arequipa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar 9999" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar Lima" }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        config: { mode: "INCLUDE", provinceIds: ["0401", "9999"], warehouseId: "" },
      }),
    ]);
  });

  it("hides provinces already assigned in sibling warehouse assignment actions", async () => {
    const value = [
      {
        type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
        config: { mode: "INCLUDE", provinceIds: ["1501"], warehouseId: "warehouse-1" },
        position: 0,
      },
      {
        type: "ASSIGN_WAREHOUSE_BY_PROVINCE",
        config: { mode: "INCLUDE", provinceIds: [], warehouseId: "" },
        position: 1,
      },
    ] as any;

    render(
      <WorkflowActionEditor
        catalog={[{ type: "ASSIGN_WAREHOUSE_BY_PROVINCE", configSchema: {} }] as any}
        value={value}
        onChange={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("action-provinces-0-options")).toHaveTextContent("Lima"),
    );

    expect(screen.getByTestId("action-provinces-0-options")).toHaveTextContent("Lima");
    expect(screen.getByTestId("action-provinces-0-options")).toHaveTextContent("Arequipa");
    expect(screen.getByTestId("action-provinces-1-options")).not.toHaveTextContent("Lima");
    expect(screen.getByTestId("action-provinces-1-options")).toHaveTextContent("Arequipa");
  });
});
