import { useEffect, useMemo, useRef, useState } from "react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import {
  listUbigeoDepartments,
  listUbigeoDistricts,
  listUbigeoProvinces,
} from "@/shared/services/ubigeoService";
import type {
  UbigeoDepartment,
  UbigeoDistrict,
  UbigeoProvince,
  UbigeoSelection,
} from "@/shared/types/ubigeo";

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

function getCatalogErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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
  const [catalogErrors, setCatalogErrors] = useState({
    department: "",
    province: "",
    district: "",
  });
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
          setCatalogErrors((previous) => ({ ...previous, department: "" }));
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogErrors((previous) => ({
            ...previous,
            department: getCatalogErrorMessage(error, "No se pudieron cargar los departamentos."),
          }));
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
    const nextDepartmentId = value.departmentId ?? department?.id ?? "";

    setIds((prev) => {
      if (prev.departmentId === nextDepartmentId) return prev;
      return {
        departmentId: nextDepartmentId,
        provinceId: nextDepartmentId === prev.departmentId ? prev.provinceId : "",
        districtId: nextDepartmentId === prev.departmentId ? prev.districtId : "",
      };
    });
  }, [departments, value.department, value.departmentId]);

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
          setCatalogErrors((previous) => ({ ...previous, province: "" }));
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogErrors((previous) => ({
            ...previous,
            province: getCatalogErrorMessage(error, "No se pudieron cargar las provincias."),
          }));
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
    const nextProvinceId = value.provinceId ?? province?.id ?? "";

    setIds((prev) => {
      if (prev.provinceId === nextProvinceId) return prev;
      return {
        ...prev,
        provinceId: nextProvinceId,
        districtId: nextProvinceId === prev.provinceId ? prev.districtId : "",
      };
    });
  }, [provinces, value.province, value.provinceId]);

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
          setCatalogErrors((previous) => ({ ...previous, district: "" }));
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogErrors((previous) => ({
            ...previous,
            district: getCatalogErrorMessage(error, "No se pudieron cargar los distritos."),
          }));
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
    const nextDistrictId = value.districtId ?? value.ubigeo ?? district?.id ?? "";
    const nextDistrict = districts.find((item) => item.id === nextDistrictId) ?? district ?? null;

    setIds((prev) => {
      if (prev.districtId === nextDistrictId) return prev;
      return {
        ...prev,
        districtId: nextDistrictId,
      };
    });

    if (!nextDistrict) {
      hydratedDistrictRef.current = "";
      return;
    }

    if (value.ubigeo === nextDistrict.id || hydratedDistrictRef.current === nextDistrict.id) {
      return;
    }

    hydratedDistrictRef.current = nextDistrict.id;
    onChange({
      ubigeo: nextDistrict.id,
      department: value.department,
      province: value.province,
      district: value.district ?? nextDistrict.name,
      departmentId: ids.departmentId,
      provinceId: ids.provinceId,
      districtId: nextDistrict.id,
    });
  }, [
    districts,
    ids.departmentId,
    ids.provinceId,
    onChange,
    value.department,
    value.district,
    value.districtId,
    value.province,
    value.ubigeo,
  ]);

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
            setCatalogErrors((previous) => ({ ...previous, province: "", district: "" }));

            onChange({
              ubigeo: "",
              department: departmentName,
              province: "",
              district: "",
              departmentId,
              provinceId: "",
              districtId: "",
            });
          }}
          options={departmentOptions}
          searchable
          searchPlaceholder="Buscar departamento..."
          emptyMessage="Sin departamentos"
          error={errors?.department ?? catalogErrors.department}
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
            setCatalogErrors((previous) => ({ ...previous, district: "" }));

            onChange({
              ubigeo: "",
              department: value.department,
              province: provinceName,
              district: "",
              departmentId: ids.departmentId,
              provinceId,
              districtId: "",
            });
          }}
          options={provinceOptions}
          searchable
          searchPlaceholder="Buscar provincia..."
          emptyMessage="Sin provincias"
          error={errors?.province ?? catalogErrors.province}
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
              departmentId: ids.departmentId,
              provinceId: ids.provinceId,
              districtId,
            });
          }}
          options={districtOptions}
          searchable
          searchPlaceholder="Buscar distrito..."
          emptyMessage="Sin distritos"
          error={errors?.district ?? catalogErrors.district}
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
