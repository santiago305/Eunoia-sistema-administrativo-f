import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UbigeoSelectSection } from "./UbigeoSelectSection";
import type { UbigeoSelection } from "@/shared/types/ubigeo";

type SelectOption = { value: string; label: string };

const serviceMocks = vi.hoisted(() => ({
  listUbigeoDepartments: vi.fn(),
  listUbigeoProvinces: vi.fn(),
  listUbigeoDistricts: vi.fn(),
}));

vi.mock("@/shared/services/ubigeoService", () => serviceMocks);

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({
    label,
    value,
    options,
    onChange,
    disabled,
    error,
  }: {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string;
  }) => (
    <div>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" />
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <p>{error}</p> : null}
    </div>
  ),
}));

function UbigeoHarness({
  initialValue = {
    ubigeo: "",
    department: "",
    province: "",
    district: "",
  },
}: {
  initialValue?: UbigeoSelection;
}) {
  const [value, setValue] = useState<UbigeoSelection>(initialValue);

  return <UbigeoSelectSection value={value} onChange={setValue} />;
}

describe("UbigeoSelectSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.listUbigeoDepartments.mockResolvedValue([
      { id: "15", name: "Lima" },
      { id: "04", name: "Arequipa" },
    ]);
    serviceMocks.listUbigeoProvinces.mockImplementation(({ departmentId }) => Promise.resolve(
      departmentId === "15" ? [{ id: "1501", name: "Lima" }] : [{ id: "0401", name: "Arequipa" }],
    ));
    serviceMocks.listUbigeoDistricts.mockImplementation(({ provinceId }) => Promise.resolve(
      provinceId === "1501" ? [{ id: "150101", name: "Lima" }] : [{ id: "040101", name: "Arequipa" }],
    ));
  });

  it("carga la cascada por IDs y limpia provincia y distrito al cambiar de departamento", async () => {
    render(<UbigeoHarness />);

    const department = await screen.findByLabelText("Departamento");
    fireEvent.change(department, { target: { value: "15" } });
    await waitFor(() => expect(serviceMocks.listUbigeoProvinces).toHaveBeenCalledWith({ departmentId: "15" }));

    const province = screen.getByLabelText("Provincia");
    expect(province).toHaveTextContent("Lima");
    fireEvent.change(province, { target: { value: "1501" } });
    await waitFor(() => expect(serviceMocks.listUbigeoDistricts).toHaveBeenCalledWith({ provinceId: "1501" }));

    const district = screen.getByLabelText("Distrito");
    fireEvent.change(district, { target: { value: "150101" } });
    expect(district).toHaveValue("150101");

    fireEvent.change(department, { target: { value: "04" } });
    expect(province).toHaveValue("");
    expect(district).toHaveValue("");
    await waitFor(() => expect(serviceMocks.listUbigeoProvinces).toHaveBeenCalledWith({ departmentId: "04" }));
  });

  it("hidrata los selectores desde los nombres guardados cuando los IDs están vacíos", async () => {
    render(
      <UbigeoHarness
        initialValue={{
          ubigeo: "",
          department: "Lima",
          province: "Lima",
          district: "Lima",
          departmentId: "",
          provinceId: "",
          districtId: "",
        }}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText("Departamento")).toHaveValue("15"));
    await waitFor(() => expect(screen.getByLabelText("Provincia")).toHaveValue("1501"));
    await waitFor(() => expect(screen.getByLabelText("Distrito")).toHaveValue("150101"));
  });

  it("muestra el error de catálogo y deja el selector disponible para reintentar", async () => {
    serviceMocks.listUbigeoDepartments.mockRejectedValueOnce(new Error("Servicio de ubigeo no disponible"));

    render(<UbigeoHarness />);

    expect(await screen.findByText("Servicio de ubigeo no disponible")).toBeInTheDocument();
    expect(screen.getByLabelText("Departamento")).not.toBeDisabled();
  });
});
