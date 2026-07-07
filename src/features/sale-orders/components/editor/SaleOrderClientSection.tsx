import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { ClientForm } from "@/features/clients/types/client";
import { ClientFormFields } from "@/features/clients/components/ClientFormFields";
import type { FloatingSuggestOption } from "@/shared/components/components/FloatingSuggestInput";
import { useUbigeoCatalog } from "@/shared/hooks/useUbigeoCatalog";
import type {
  SaleOrderEditorForm,
  SaleOrderEditorTelephone,
} from "./saleOrderEditorForm";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";

type Props = {
  form: SaleOrderEditorForm;
  setForm: Dispatch<SetStateAction<SaleOrderEditorForm>>;
  clientOptions: FloatingSuggestOption[];
  onSelectClient: (clientId: string) => void;
  loading?: boolean;
};

export function SaleOrderClientSection({
  form,
  setForm,
  clientOptions,
  onSelectClient,
  loading = false,
}: Props) {
  const { catalog } = useUbigeoCatalog(true);
  const departments = catalog?.departments ?? [];
  const provinces = catalog?.provinces ?? [];
  const districts = catalog?.districts ?? [];
  const departmentOptions = departments.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const provinceOptions = provinces
    .filter((item) => item.departmentId === form.clientData.departmentId)
    .map((item) => ({ value: item.id, label: item.name }));
  const districtOptions = districts
    .filter((item) => item.provinceId === form.clientData.provinceId)
    .map((item) => ({ value: item.id, label: item.name }));
  const clientForm = useMemo<ClientForm>(
    () => ({ ...form.clientData }),
    [form.clientData],
  );
  const normalizeTelephones = (
    telephones: ClientForm["telephonesReplace"],
  ): SaleOrderEditorTelephone[] =>
    (telephones ?? [])
      .map((telephone) => ({
        id: telephone.id,
        number: telephone.number ?? "",
        isMain: Boolean(telephone.isMain),
        isActive: true,
      }))
      .filter((telephone) => telephone.number || telephone.id);
  const setClientForm: Dispatch<SetStateAction<ClientForm>> = (next) => {
    setForm((current) => {
      const value =
        typeof next === "function"
          ? next({ ...current.clientData })
          : next;
      return {
        ...current,
        clientData: {
          ...current.clientData,
          ...value,
          telephonesReplace:
            value.telephonesReplace !== undefined
              ? normalizeTelephones(value.telephonesReplace)
              : current.clientData.telephonesReplace,
        },
      };
    });
  };

  return (
    <SaleOrderEditorSection title="Cliente">
      <ClientFormFields
        form={clientForm}
        setForm={setClientForm}
        departmentOptions={departmentOptions}
        provinceOptions={provinceOptions}
        districtOptions={districtOptions}
        onDepartmentChange={(departmentId) =>
          setForm((current) => ({
            ...current,
            clientData: {
              ...current.clientData,
              departmentId,
              provinceId: "",
              districtId: "",
            },
          }))
        }
        onProvinceChange={(provinceId) =>
          setForm((current) => ({
            ...current,
            clientData: {
              ...current.clientData,
              provinceId,
              districtId: "",
            },
          }))
        }
        onDistrictChange={(districtId) =>
          setForm((current) => ({
            ...current,
            clientData: { ...current.clientData, districtId },
          }))
        }
        disabled={loading}
        showTelephoneField
        fullNameOptions={clientOptions}
        onFullNameTextChange={() =>
          setForm((current) => {
            if (current.clientMode === "update" && current.selectedClientId) {
              return current;
            }

            return {
              ...current,
              clientMode: "create",
              selectedClientId: "",
            };
          })
        }
        onFullNameOptionSelect={(option) => onSelectClient(option.value)}
      />
    </SaleOrderEditorSection>
  );
}
