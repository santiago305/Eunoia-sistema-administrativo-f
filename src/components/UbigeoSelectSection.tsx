import { useEffect, useMemo, useRef, useState } from "react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import {
  listUbigeoDepartments,
  listUbigeoDistricts,
  listUbigeoProvinces,
} from "@/services/ubigeoService";
import type {
  UbigeoDepartment,
  UbigeoDistrict,
  UbigeoProvince,
  UbigeoSelection,
} from "@/types/ubigeo";

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

function normalizeName(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function findByName<T extends { name: string }>(items: T[], name?: string | null) {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  return items.find((item) => normalizeName(item.name) === normalized) ?? null;
}

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
  const [departments, setDepartments] = useState<UbigeoDepartment[]>([]);
  const [provinces, setProvinces] = useState<UbigeoProvince[]>([]);
  const [districts, setDistricts] = useState<UbigeoDistrict[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const hydratedDistrictRef = useRef("");

  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: department.id, label: department.name })),
    [departments],
  );

  const provinceOptions = useMemo(
    () => provinces.map((province) => ({ value: province.id, label: province.name })),
    [provinces],
  );

  const districtOptions = useMemo(
    () => districts.map((district) => ({ value: district.id, label: district.name })),
    [districts],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingDepartments(true);

    void (async () => {
      try {
        const items = await listUbigeoDepartments();
        if (!cancelled) {
          setDepartments(items);
        }
      } finally {
        if (!cancelled) {
          setLoadingDepartments(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const department = findByName(departments, value.department);
    const nextDepartmentId = department?.id ?? "";

    setIds((prev) => {
      if (prev.departmentId === nextDepartmentId) return prev;
      return {
        departmentId: nextDepartmentId,
        provinceId: nextDepartmentId === prev.departmentId ? prev.provinceId : "",
        districtId: nextDepartmentId === prev.departmentId ? prev.districtId : "",
      };
    });
  }, [departments, value.department]);

  useEffect(() => {
    if (!ids.departmentId) {
      setProvinces([]);
      setDistricts([]);
      setIds((prev) =>
        prev.provinceId || prev.districtId
          ? { ...prev, provinceId: "", districtId: "" }
          : prev,
      );
      return;
    }

    let cancelled = false;
    setLoadingProvinces(true);

    void (async () => {
      try {
        const items = await listUbigeoProvinces({ departmentId: ids.departmentId });
        if (!cancelled) {
          setProvinces(items);
        }
      } finally {
        if (!cancelled) {
          setLoadingProvinces(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ids.departmentId]);

  useEffect(() => {
    const province = findByName(provinces, value.province);
    const nextProvinceId = province?.id ?? "";

    setIds((prev) => {
      if (prev.provinceId === nextProvinceId) return prev;
      return {
        ...prev,
        provinceId: nextProvinceId,
        districtId: nextProvinceId === prev.provinceId ? prev.districtId : "",
      };
    });
  }, [provinces, value.province]);

  useEffect(() => {
    if (!ids.provinceId) {
      setDistricts([]);
      setIds((prev) => (prev.districtId ? { ...prev, districtId: "" } : prev));
      return;
    }

    let cancelled = false;
    setLoadingDistricts(true);

    void (async () => {
      try {
        const items = await listUbigeoDistricts({ provinceId: ids.provinceId });
        if (!cancelled) {
          setDistricts(items);
        }
      } finally {
        if (!cancelled) {
          setLoadingDistricts(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ids.provinceId]);

  useEffect(() => {
    const district = findByName(districts, value.district);
    const nextDistrictId = district?.id ?? "";

    setIds((prev) => {
      if (prev.districtId === nextDistrictId) return prev;
      return {
        ...prev,
        districtId: nextDistrictId,
      };
    });

    if (!district) {
      hydratedDistrictRef.current = "";
      return;
    }

    if (value.ubigeo === district.id || hydratedDistrictRef.current === district.id) {
      return;
    }

    hydratedDistrictRef.current = district.id;
    onChange({
      ubigeo: district.id,
      department: value.department,
      province: value.province,
      district: value.district,
    });
  }, [districts, onChange, value.department, value.district, value.province, value.ubigeo]);

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
              departments.find((department) => department.id === departmentId)?.name ?? "";

            hydratedDistrictRef.current = "";
            setIds({
              departmentId,
              provinceId: "",
              districtId: "",
            });
            setProvinces([]);
            setDistricts([]);

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
          disabled={disabled || loadingDepartments}
          className={className}
        />

        <FloatingSelect
          label="Provincia"
          name="province"
          value={ids.provinceId}
          onChange={(provinceId) => {
            const provinceName =
              provinces.find((province) => province.id === provinceId)?.name ?? "";

            hydratedDistrictRef.current = "";
            setIds((prev) => ({
              ...prev,
              provinceId,
              districtId: "",
            }));
            setDistricts([]);

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
          disabled={disabled || !ids.departmentId || loadingProvinces}
          className={className}
        />

        <FloatingSelect
          label="Distrito"
          name="district"
          value={ids.districtId}
          onChange={(districtId) => {
            const districtName =
              districts.find((district) => district.id === districtId)?.name ?? "";

            hydratedDistrictRef.current = districtId;
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
          disabled={disabled || !ids.provinceId || loadingDistricts}
          className={className}
        />

        {showUbigeoInput ? (
          <FloatingInput
            label="Ubigeo"
            name="ubigeo"
            value={value.ubigeo}
            readOnly={lockUbigeo}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, ubigeo: event.target.value })}
            error={errors?.ubigeo}
            className={className}
          />
        ) : null}
      </div>
    </section>
  );
}
