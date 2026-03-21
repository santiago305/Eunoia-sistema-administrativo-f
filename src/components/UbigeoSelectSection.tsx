import { useEffect, useMemo, useState } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { ubigeoPeru } from "@/data/ubigeoPeru";

export type UbigeoDepartment = { id: string; name: string };
export type UbigeoProvince = { id: string; name: string; departmentId: string };
export type UbigeoDistrict = {
  id: string;
  name: string;
  provinceId: string;
  departmentId: string;
};

export type UbigeoData = {
  departments: UbigeoDepartment[];
  provinces: UbigeoProvince[];
  districts: UbigeoDistrict[];
};

export type UbigeoSelection = {
  ubigeo: string;
  department: string;
  province: string;
  district: string;
};

type Props = {
  value: UbigeoSelection;
  onChange: (next: UbigeoSelection) => void;
  disabled?: boolean;
  showUbigeoInput?: boolean;
  lockUbigeo?: boolean;
  className?: string;
  textSize?: string;
  errors?: {
    department?: string;
    province?: string;
    district?: string;
    ubigeo?: string;
  };
};

export function UbigeoSelectSection({
  value,
  onChange,
  disabled = false,
  showUbigeoInput = false,
  lockUbigeo = true,
  className = "",
  errors,
}: Props) {
  const [ids, setIds] = useState({
    departmentId: "",
    provinceId: "",
    districtId: "",
  });

  const departmentOptions = useMemo(
    () => ubigeoPeru.departments.map((d) => ({ value: d.id, label: d.name })),
    []
  );

  const provinceOptions = useMemo(
    () =>
      ubigeoPeru.provinces
        .filter((p) => p.departmentId === ids.departmentId)
        .map((p) => ({ value: p.id, label: p.name })),
    [ids.departmentId]
  );

  const districtOptions = useMemo(
    () =>
      ubigeoPeru.districts
        .filter((d) => d.provinceId === ids.provinceId)
        .map((d) => ({ value: d.id, label: d.name })),
    [ids.provinceId]
  );

  useEffect(() => {
    const normalizedDepartment = value.department.trim();
    const normalizedProvince = value.province.trim();
    const normalizedDistrict = value.district.trim();
    const normalizedUbigeo = value.ubigeo.trim();

    if (normalizedUbigeo) {
      const district = ubigeoPeru.districts.find((d) => d.id === normalizedUbigeo);

      if (district) {
        setIds({
          departmentId: district.departmentId,
          provinceId: district.provinceId,
          districtId: district.id,
        });

        if (!normalizedDistrict || !normalizedProvince || !normalizedDepartment) {
          onChange({
            ubigeo: district.id,
            department:
              ubigeoPeru.departments.find((d) => d.id === district.departmentId)?.name ?? "",
            province:
              ubigeoPeru.provinces.find((p) => p.id === district.provinceId)?.name ?? "",
            district: district.name,
          });
        }

        return;
      }
    }

    const departmentId =
      ubigeoPeru.departments.find(
        (d) => d.name.toLowerCase() === normalizedDepartment.toLowerCase()
      )?.id ?? "";

    const provinceId =
      ubigeoPeru.provinces.find(
        (p) =>
          p.name.toLowerCase() === normalizedProvince.toLowerCase() &&
          (!departmentId || p.departmentId === departmentId)
      )?.id ?? "";

    const districtId =
      ubigeoPeru.districts.find(
        (d) =>
          d.name.toLowerCase() === normalizedDistrict.toLowerCase() &&
          (!provinceId || d.provinceId === provinceId)
      )?.id ?? "";

    setIds({
      departmentId,
      provinceId,
      districtId,
    });
  }, [value.department, value.province, value.district, value.ubigeo, onChange]);

  return (
    <section className="space-y-3">
      <div
        className={`grid grid-cols-1 gap-4 ${
          showUbigeoInput ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        <FloatingSelect
          label="Departamento"
          name="department"
          value={ids.departmentId}
          onChange={(departmentId) => {
            const departmentName =
              ubigeoPeru.departments.find((d) => d.id === departmentId)?.name ?? "";

            setIds({
              departmentId,
              provinceId: "",
              districtId: "",
            });

            onChange({
              ubigeo: "",
              department: departmentName,
              province: "",
              district: "",
            });
          }}
          options={departmentOptions}
          searchable
          searchPlaceholder="Buscar departamento..."
          emptyMessage="Sin departamentos"
          error={errors?.department}
          disabled={disabled}
          className={className}
        />

        <FloatingSelect
          label="Provincia"
          name="province"
          value={ids.provinceId}
          onChange={(provinceId) => {
            const provinceName =
              ubigeoPeru.provinces.find((p) => p.id === provinceId)?.name ?? "";

            setIds((prev) => ({
              ...prev,
              provinceId,
              districtId: "",
            }));

            onChange({
              ubigeo: "",
              department: value.department,
              province: provinceName,
              district: "",
            });
          }}
          options={provinceOptions}
          searchable
          searchPlaceholder="Buscar provincia..."
          emptyMessage="Sin provincias"
          error={errors?.province}
          disabled={disabled || !ids.departmentId}
          className={className}
        />

        <FloatingSelect
          label="Distrito"
          name="district"
          value={ids.districtId}
          onChange={(districtId) => {
            const districtName =
              ubigeoPeru.districts.find((d) => d.id === districtId)?.name ?? "";

            setIds((prev) => ({
              ...prev,
              districtId,
            }));

            onChange({
              ubigeo: districtId,
              department: value.department,
              province: value.province,
              district: districtName,
            });
          }}
          options={districtOptions}
          searchable
          searchPlaceholder="Buscar distrito..."
          emptyMessage="Sin distritos"
          error={errors?.district}
          disabled={disabled || !ids.provinceId}
          className={className}
        />

        {showUbigeoInput && (
          <FloatingInput
            label="Ubigeo"
            name="ubigeo"
            value={value.ubigeo}
            readOnly={lockUbigeo}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, ubigeo: e.target.value })}
            error={errors?.ubigeo}
            className={className}
          />
        )}
      </div>
    </section>
  );
}