import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { Agency, AgencyForm } from "@/features/agencies/types/agency";
import { AgencyFormFields } from "./AgencyFormFields";
import { useUbigeoCatalog } from "@/shared/hooks/useUbigeoCatalog";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  agency?: Agency | null;
  onClose: () => void;
  onSubmit: (form: AgencyForm) => void;
  primaryColor?: string;
  loading?: boolean;
};

const DEFAULT_FORM: AgencyForm = {
  name: "",
  reference: "",
  address: "",
  departmentId: "",
  provinceId: "",
  districtId: "",
  isActive: true,
};

export function AgencyFormModal({
  open,
  mode,
  agency,
  onClose,
  onSubmit,
  primaryColor = "hsl(var(--primary))",
  loading = false,
}: Props) {
  const [form, setForm] = useState<AgencyForm>(DEFAULT_FORM);
  const { catalog: ubigeoCatalog } = useUbigeoCatalog(open);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && agency) {
      setForm({
        name: agency.name ?? "",
        reference: agency.reference ?? "",
        address: agency.address ?? "",
        departmentId: agency.departmentId ?? "",
        provinceId: agency.provinceId ?? "",
        districtId: agency.districtId ?? "",
        isActive: agency.isActive,
      });
      return;
    }

    setForm(DEFAULT_FORM);
  }, [agency, mode, open]);

  const canSave = useMemo(
    () =>
      Boolean(
        form.name.trim() &&
          form.departmentId.trim() &&
          form.provinceId.trim() &&
          form.districtId.trim(),
      ),
    [ form.name, form.departmentId, form.provinceId, form.districtId ],
  );

  const fieldStyle: CSSProperties = {
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  const saveButtonStyle: CSSProperties = {
    backgroundColor: primaryColor,
    borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
    "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
  } as CSSProperties;

  const departments = ubigeoCatalog?.departments ?? [];
  const provinces = ubigeoCatalog?.provinces ?? [];
  const districts = ubigeoCatalog?.districts ?? [];

  const provincesById = useMemo(() => {
    const map: Record<string, { id: string; name: string; departmentId: string }> = {};
    for (const province of provinces) map[province.id] = province;
    return map;
  }, [provinces]);

  const districtsById = useMemo(() => {
    const map: Record<string, { id: string; name: string; provinceId: string; departmentId: string }> = {};
    for (const district of districts) map[district.id] = district;
    return map;
  }, [districts]);

  const provincesByDepartmentId = useMemo(() => {
    const map: Record<string, Array<{ id: string; name: string; departmentId: string }>> = {};
    for (const province of provinces) {
      map[province.departmentId] = map[province.departmentId] ?? [];
      map[province.departmentId]!.push(province);
    }
    return map;
  }, [provinces]);

  const districtsByProvinceId = useMemo(() => {
    const map: Record<string, Array<{ id: string; name: string; provinceId: string; departmentId: string }>> = {};
    for (const district of districts) {
      map[district.provinceId] = map[district.provinceId] ?? [];
      map[district.provinceId]!.push(district);
    }
    return map;
  }, [districts]);

  const departmentOptions = useMemo(
    () =>
      departments.map((dep) => ({
        value: dep.id,
        label: `${dep.name}`,
      })),
    [departments],
  );

  const provinceOptions = useMemo(() => {
    const filtered = form.departmentId ? provincesByDepartmentId[form.departmentId] ?? [] : [];
    return filtered.map((prov) => ({
      value: prov.id,
      label: `${prov.name}`,
    }));
  }, [form.departmentId, provincesByDepartmentId]);

  const districtOptions = useMemo(() => {
    const filtered = form.provinceId ? districtsByProvinceId[form.provinceId] ?? [] : [];
    return filtered.map((dist) => ({
      value: dist.id,
      label: `${dist.name}`,
    }));
  }, [districtsByProvinceId, form.provinceId]);

  const handleDepartmentChange = (departmentId: string) => {
    setForm((prev) => ({
      ...prev,
      departmentId,
      provinceId: "",
      districtId: "",
    }));
  };

  const handleProvinceChange = (provinceId: string) => {
    const province = provincesById[provinceId];
    setForm((prev) => ({
      ...prev,
      departmentId: province?.departmentId ?? prev.departmentId,
      provinceId,
      districtId: "",
    }));
  };

  const handleDistrictChange = (districtId: string) => {
    const district = districtsById[districtId];
    setForm((prev) => ({
      ...prev,
      departmentId: district?.departmentId ?? prev.departmentId,
      provinceId: district?.provinceId ?? prev.provinceId,
      districtId,
    }));
  };

  if (!open) return null;

  const title = mode === "edit" ? "Editar agencia" : "Nueva agencia";

  return (
    <Modal open={open} title={title} onClose={onClose} className="w-[560px] max-h-[600px]">
      <AgencyFormFields
        form={form}
        setForm={setForm}
        departmentOptions={departmentOptions}
        provinceOptions={provinceOptions}
        districtOptions={districtOptions}
        onDepartmentChange={handleDepartmentChange}
        onProvinceChange={handleProvinceChange}
        onDistrictChange={handleDistrictChange}
        disabled={loading}
        fieldStyle={fieldStyle}
      />

      <div className="mt-2 flex justify-end gap-2">
        <SystemButton variant="outline" size="md" onClick={onClose} disabled={loading}>
          Cancelar
        </SystemButton>

        <SystemButton
          size="md"
          style={saveButtonStyle}
          disabled={!canSave || loading}
          loading={loading}
          onClick={() => {
            if (!canSave || loading) return;
            onSubmit(form);
          }}
        >
          Guardar
        </SystemButton>
      </div>
    </Modal>
  );
}

