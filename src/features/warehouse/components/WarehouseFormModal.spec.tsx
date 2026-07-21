import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WarehouseFormModal } from "./WarehouseFormModal";

const { createWarehouse, sileoSuccess } = vi.hoisted(() => ({
  createWarehouse: vi.fn(),
  sileoSuccess: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: { success: sileoSuccess },
}));

vi.mock("@/shared/services/warehouseServices", () => ({
  createWarehouse,
  getWarehouseById: vi.fn(),
  updateWarehouse: vi.fn(),
  updateWarehouseActive: vi.fn(),
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/components/UbigeoSelectSection", () => ({
  UbigeoSelectSection: ({
    value,
    onChange,
  }: {
    value: { district?: string; districtId?: string };
    onChange: (value: Record<string, string>) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => onChange({
          department: "Lima",
          province: "Lima",
          district: "Miraflores",
          departmentId: "15",
          provinceId: "1501",
          districtId: "150122",
          ubigeo: "150122",
        })}
      >
        Seleccionar distrito
      </button>
      <output data-testid="selected-district">{`${value.districtId}:${value.district}`}</output>
    </>
  ),
}));

describe("WarehouseFormModal", () => {
  it("preserva el ID y el nombre al seleccionar un distrito nuevo", () => {
    render(
      <WarehouseFormModal
        open
        mode="create"
        onClose={vi.fn()}
        primaryColor="#000"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar distrito" }));

    expect(screen.getByTestId("selected-district")).toHaveTextContent("150122:Miraflores");
  });

  it("notifica al crear un almacén", async () => {
    createWarehouse.mockResolvedValueOnce({});
    const onClose = vi.fn();

    render(
      <WarehouseFormModal
        open
        mode="create"
        onClose={onClose}
        primaryColor="#000"
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Almacén central" } });
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar distrito" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await vi.waitFor(() => expect(sileoSuccess).toHaveBeenCalledWith({ title: "Almacén creado" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
