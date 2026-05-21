import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { Client, ClientForm } from "@/features/clients/types/client";
import { ClientFormFields } from "./ClientFormFields";
import { getUbigeoCatalog, type UbigeoCatalog } from "@/shared/services/ubigeoCatalogService";
import { listClientTelephones } from "@/shared/services/clientService";
import { ClientTelephonesEditor, type TelephoneEditorRow } from "./ClientTelephonesEditor";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  client?: Client | null;
  onClose: () => void;
  onSubmit: (form: ClientForm) => void;
  primaryColor?: string;
  loading?: boolean;
};

const DEFAULT_FORM: ClientForm = {
  type: "UNDEFINED",
  fullName: "",
  docType: "DNI",
  docNumber: "",
  departmentId: "",
  provinceId: "",
  districtId: "",
  address: "",
  reference: "",
  isActive: true,
};

export function ClientFormModal({
  open,
  mode,
  client,
  onClose,
  onSubmit,
  primaryColor = "hsl(var(--primary))",
  loading = false,
}: Props) {
  const [form, setForm] = useState<ClientForm>(DEFAULT_FORM);
  const [ubigeoCatalog, setUbigeoCatalog] = useState<UbigeoCatalog | null>(null);
  const [telephones, setTelephones] = useState<TelephoneEditorRow[]>([]);
  const [phonesLoading, setPhonesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && client) {
      setForm({
        type: client.type,
        fullName: client.fullName,
        docType: client.docType,
        docNumber: client.docNumber,
        departmentId: client.departmentId,
        provinceId: client.provinceId,
        districtId: client.districtId,
        address: client.address ?? "",
        reference: client.reference ?? "",
        isActive: client.isActive,
      });
      return;
    }

    setForm(DEFAULT_FORM);
  }, [client, mode, open]);

  useEffect(() => {
    if (!open) return;

    if (mode !== "edit" || !client?.id) {
      setTelephones([]);
      return;
    }

    let cancelled = false;
    setPhonesLoading(true);

    void (async () => {
      try {
        const data = await listClientTelephones(client.id);
        if (cancelled) return;
        const safe = data ?? [];
        setTelephones(
          safe.map((tel) => ({
            id: tel.id,
            serverId: tel.id,
            number: tel.number,
            isActive: tel.isActive,
            isMain: tel.isMain,
          })),
        );
      } catch {
        if (!cancelled) {
          setTelephones([]);
        }
      } finally {
        if (!cancelled) setPhonesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client?.id, mode, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      try {
        const catalog = await getUbigeoCatalog();
        if (!cancelled) setUbigeoCatalog(catalog);
      } catch {
        if (!cancelled) setUbigeoCatalog({ departments: [], provinces: [], districts: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const canSave = useMemo(
    () =>
      Boolean(
        form.fullName.trim() &&
          (form.docType === "NONE" ? form.reference.trim() : form.docNumber.trim()) &&
          form.departmentId.trim() &&
          form.provinceId.trim() &&
          form.districtId.trim(),
      ),
    [form.departmentId, form.districtId, form.docNumber, form.docType, form.fullName, form.provinceId, form.reference],
  );

  const canSaveAll = canSave && !phonesLoading;

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

  const districtsByDepartmentId = useMemo(() => {
    const map: Record<string, Array<{ id: string; name: string; provinceId: string; departmentId: string }>> = {};
    for (const district of districts) {
      map[district.departmentId] = map[district.departmentId] ?? [];
      map[district.departmentId]!.push(district);
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
    const filtered = form.provinceId
      ? districtsByProvinceId[form.provinceId] ?? []
      : form.departmentId
        ? districtsByDepartmentId[form.departmentId] ?? []
        : [];
    return filtered.map((dist) => ({
      value: dist.id,
      label: `${dist.name}`,
    }));
  }, [districtsByDepartmentId, districtsByProvinceId, form.departmentId, form.provinceId]);

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

  return (
    <Modal
      open={open}
      title={mode === "edit" ? "Detalle de cliente" : "Nuevo cliente"}
      onClose={onClose}
      className="w-[560px] max-h-[640px]"
    >
      <ClientFormFields
        form={form}
        setForm={setForm}
        departmentOptions={departmentOptions}
        provinceOptions={provinceOptions}
        districtOptions={districtOptions}
        onDepartmentChange={handleDepartmentChange}
        onProvinceChange={handleProvinceChange}
        onDistrictChange={handleDistrictChange}
        primaryColor={primaryColor}
        disabled={loading}
        fieldStyle={fieldStyle}
      />

      <ClientTelephonesEditor
        rows={telephones}
        setRows={setTelephones}
        primaryColor={primaryColor}
        disabled={loading}
        loading={phonesLoading}
      />

      <div className="mt-2 flex justify-end gap-2">
        <SystemButton variant="outline" size="md" onClick={onClose} disabled={loading}>
          Cancelar
        </SystemButton>

        <SystemButton
          size="md"
          style={saveButtonStyle}
          disabled={!canSaveAll || loading}
          onClick={() => {
            const telephonesPatch = telephones
              .map((row) => ({
                number: row.number.trim(),
                isMain: row.isMain,
                isActive: row.isActive,
            }))
            .filter((row) => row.number);

          onSubmit({
            ...form,
            telephonesPatch: telephonesPatch.length ? telephonesPatch : undefined,
          });
        }}>
          {mode === "edit" ? "Guardar cambios" : "Guardar"}
        </SystemButton>
      </div>
    </Modal>
  );
}
