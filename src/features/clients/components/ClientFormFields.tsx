import { Pencil, Plus } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ClientDocTypeEnum,
  type ClientForm,
} from "@/features/clients/types/client";
import { CLIENT_TYPE_OPTIONS } from "@/features/clients/constants/clientType";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import {
  FloatingSuggestInput,
  type FloatingSuggestOption,
} from "@/shared/components/components/FloatingSuggestInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";

const docTypeOptions: Array<{ value: ClientForm["docType"]; label: string }> = [
  { value: "DNI", label: "DNI" },
  { value: "CE", label: "CE" },
  { value: "RUC", label: "RUC" },
  { value: "NONE", label: "SIN DEFINIR" },
];

type Props = {
  form: ClientForm;
  setForm: Dispatch<SetStateAction<ClientForm>>;
  departmentOptions: Array<{ value: string; label: string }>;
  provinceOptions: Array<{ value: string; label: string }>;
  districtOptions: Array<{ value: string; label: string }>;
  onDepartmentChange: (departmentId: string) => void;
  onProvinceChange: (provinceId: string) => void;
  onDistrictChange: (districtId: string) => void;
  disabled?: boolean;
  fieldStyle?: CSSProperties;
  showTelephoneField?: boolean;
  fullNameOptions?: FloatingSuggestOption[];
  onFullNameOptionSelect?: (option: FloatingSuggestOption) => void;
  onFullNameTextChange?: (value: string) => void;
};

const inputClassName = "h-9 text-xs";
const createTelephoneOption = {
  value: "__create_phone__",
  label: "Crear teléfono",
};

type ClientTelephone = NonNullable<ClientForm["telephonesReplace"]>[number];

const isUsableTelephone = (telephone: ClientTelephone) =>
  Boolean(telephone.id || telephone.number?.trim());

export function ClientFormFields({
  form,
  setForm,
  departmentOptions,
  provinceOptions,
  districtOptions,
  onDepartmentChange,
  onProvinceChange,
  onDistrictChange,
  disabled = false,
  fieldStyle,
  showTelephoneField = false,
  fullNameOptions,
  onFullNameOptionSelect,
  onFullNameTextChange,
}: Props) {
  const [selectedTelephoneIndex, setSelectedTelephoneIndex] = useState("");
  const [telephoneModalMode, setTelephoneModalMode] = useState<
    "create" | "edit" | null
  >(null);
  const [telephoneDraft, setTelephoneDraft] = useState({
    number: "",
    isMain: false,
  });

  const updateField = <K extends keyof ClientForm>(
    field: K,
    value: ClientForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const sharedInputProps = {
    disabled,
    className: inputClassName,
    style: fieldStyle,
  };
  const isDocTypeNone = form.docType === ClientDocTypeEnum.NONE;
  const telephones = useMemo(
    () => form.telephonesReplace ?? [],
    [form.telephonesReplace],
  );
  const telephoneOptions = useMemo(() => {
    const options = telephones
      .map((telephone, index) => ({ telephone, index }))
      .filter(({ telephone }) => isUsableTelephone(telephone))
      .map(({ telephone, index }) => {
        const label = telephone.number?.trim() || `Teléfono ${index + 1}`;
        return {
          value: String(index),
          label: telephone.isMain ? `★ ${label}` : label,
        };
      });

    return options.length > 0 ? options : [createTelephoneOption];
  }, [telephones]);
  const hasUsableTelephones =
    telephoneOptions[0]?.value !== createTelephoneOption.value;
  const selectedTelephone =
    hasUsableTelephones &&
    selectedTelephoneIndex !== "" &&
    selectedTelephoneIndex !== createTelephoneOption.value
      ? telephones[Number(selectedTelephoneIndex)]
      : undefined;

  useEffect(() => {
    if (!showTelephoneField) return;

    if (!hasUsableTelephones) {
      if (selectedTelephoneIndex !== createTelephoneOption.value) {
        setSelectedTelephoneIndex(createTelephoneOption.value);
      }
      return;
    }

    const selectedIndex = Number(selectedTelephoneIndex);
    if (
      selectedTelephoneIndex === "" ||
      Number.isNaN(selectedIndex) ||
      !telephones[selectedIndex] ||
      !isUsableTelephone(telephones[selectedIndex])
    ) {
      setSelectedTelephoneIndex(telephoneOptions[0]?.value ?? "");
    }
  }, [
    hasUsableTelephones,
    selectedTelephoneIndex,
    showTelephoneField,
    telephoneOptions,
    telephones,
  ]);

  const openTelephoneModal = (mode: "create" | "edit") => {
    if (mode === "edit" && !selectedTelephone) return;

    setTelephoneDraft(
      mode === "edit" && selectedTelephone
        ? {
            number: selectedTelephone.number ?? "",
            isMain: Boolean(selectedTelephone.isMain),
          }
        : {
            number: "",
            isMain: !hasUsableTelephones,
          },
    );
    setTelephoneModalMode(mode);
  };

  const saveTelephone = () => {
    setForm((current) => {
      const currentTelephones = current.telephonesReplace ?? [];
      const selectedIndex = Number(selectedTelephoneIndex);
      const currentUsableTelephones = currentTelephones.filter((telephone) =>
        isUsableTelephone(telephone),
      );
      const shouldBeMain =
        telephoneDraft.isMain || currentUsableTelephones.length === 0;

      if (telephoneModalMode === "create") {
        const nextTelephones = shouldBeMain
          ? currentUsableTelephones.map((telephone) => ({
              ...telephone,
              isMain: false,
            }))
          : currentUsableTelephones;

        setSelectedTelephoneIndex(String(nextTelephones.length));
        return {
          ...current,
          telephonesReplace: [
            ...nextTelephones,
            {
              number: telephoneDraft.number,
              isMain: shouldBeMain,
            },
          ],
        };
      }

      if (
        telephoneModalMode !== "edit" ||
        Number.isNaN(selectedIndex) ||
        !currentTelephones[selectedIndex]
      ) {
        return current;
      }

      const currentTelephone = currentTelephones[selectedIndex];
      const nextIsMain = currentTelephone.isMain
        ? true
        : telephoneDraft.isMain;

      return {
        ...current,
        telephonesReplace: currentTelephones.map((telephone, index) =>
          index === selectedIndex
            ? {
                ...telephone,
                number: telephoneDraft.number,
                isMain: nextIsMain,
              }
            : {
                ...telephone,
                isMain: nextIsMain ? false : telephone.isMain,
              },
        ),
      };
    });
    setTelephoneModalMode(null);
  };

  return (
    <div className="space-y-4">
      <div
        className={`mt-2 grid grid-cols-1 gap-3 ${
          isDocTypeNone ? "md:grid-cols-2" : "md:grid-cols-3"
        }`}
      >
        <FloatingSelect
          label="Tipo de cliente"
          name="client-type"
          value={form.type}
          options={CLIENT_TYPE_OPTIONS}
          onChange={(value) => updateField("type", value as ClientForm["type"])}
          disabled={disabled}
          className={inputClassName}
        />

        <FloatingSelect
          label="Tipo de documento"
          name="client-doc-type"
          value={form.docType}
          options={docTypeOptions}
          onChange={(value) => {
            const nextDocType = value as ClientForm["docType"];

            setForm((prev) => ({
              ...prev,
              docType: nextDocType,
              ...(nextDocType === "NONE"
                ? { docNumber: "" }
                : { reference: "" }),
            }));
          }}
          disabled={disabled}
          className={inputClassName}
        />

        {!isDocTypeNone ? (
          <FloatingInput
            label="Número de documento"
            name="client-doc-number"
            value={form.docNumber}
            onChange={(event) => updateField("docNumber", event.target.value)}
            {...sharedInputProps}
          />
        ) : null}
      </div>
      <div className={`mt-2 grid grid-cols-1 gap-3 ${fullNameOptions ? "md:grid-cols-2" : ""}`}>
        {fullNameOptions ? (
          <FloatingSuggestInput
            label="Nombre completo"
            name="client-full-name"
            value={form.fullName}
            options={fullNameOptions}
            onChange={(value) => {
              onFullNameTextChange?.(value);
              updateField("fullName", value);
            }}
            onOptionSelect={onFullNameOptionSelect}
            disabled={disabled}
            className={inputClassName}
            searchPlaceholder="Buscar por nombre o documento"
            emptyMessage="Sin clientes"
          />
        ) : (
          <FloatingInput
            label="Nombre completo"
            name="client-full-name"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            {...sharedInputProps}
          />
        )}
        {showTelephoneField ? (
          <div className="rounded-lg bg-background/70">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
              <FloatingSelect
                label="Teléfono"
                name="client-phone-selected"
                value={selectedTelephoneIndex}
                options={telephoneOptions}
                onChange={setSelectedTelephoneIndex}
                emptyMessage="Sin teléfonos"
                disabled={disabled || !hasUsableTelephones}
                className={inputClassName}
              />
              <SystemButton
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                title="Editar teléfono"
                aria-label="Editar teléfono"
                disabled={disabled || !selectedTelephone}
                onClick={() => openTelephoneModal("edit")}
              >
                <Pencil className="h-4 w-4" />
              </SystemButton>
              <SystemButton
                type="button"
                size="icon"
                className="h-9 w-9"
                title="Añadir teléfono"
                aria-label="Añadir teléfono"
                disabled={disabled}
                onClick={() => openTelephoneModal("create")}
              >
                <Plus className="h-4 w-4" />
              </SystemButton>
            </div>

            <Modal
              open={Boolean(telephoneModalMode)}
              onClose={() => setTelephoneModalMode(null)}
              title={
                telephoneModalMode === "edit"
                  ? "Editar teléfono"
                  : "Añadir teléfono"
              }
              className="w-full max-w-md"
              footer={
                <div className="flex justify-end gap-2">
                  <SystemButton
                    type="button"
                    variant="outline"
                    onClick={() => setTelephoneModalMode(null)}
                  >
                    Cancelar
                  </SystemButton>
                  <SystemButton type="button" onClick={saveTelephone}>
                    Guardar
                  </SystemButton>
                </div>
              }
            >
              <div className="space-y-3">
                <FloatingInput
                  label="Teléfono"
                  name="client-phone-draft"
                  value={telephoneDraft.number}
                  onChange={(event) =>
                    setTelephoneDraft((current) => ({
                      ...current,
                      number: event.target.value,
                    }))
                  }
                />
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs">
                  <input
                    type="checkbox"
                    checked={telephoneDraft.isMain}
                    disabled={
                      telephoneModalMode === "edit" &&
                      Boolean(selectedTelephone?.isMain)
                    }
                    onChange={(event) =>
                      setTelephoneDraft((current) => ({
                        ...current,
                        isMain: event.target.checked,
                      }))
                    }
                  />
                  Principal
                </label>
              </div>
            </Modal>
          </div>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
        <FloatingSelect
          label="Departamento"
          name="client-department"
          value={form.departmentId}
          options={departmentOptions}
          onChange={onDepartmentChange}
          disabled={disabled}
          className={inputClassName}
          searchable
          searchPlaceholder="Buscar departamento..."
          emptyMessage="Sin departamentos"
        />
        <FloatingSelect
          label="Provincia"
          name="client-province"
          value={form.provinceId}
          options={provinceOptions}
          onChange={onProvinceChange}
          disabled={disabled || !form.departmentId}
          className={inputClassName}
          searchable
          searchPlaceholder="Buscar provincia..."
          emptyMessage="Sin provincias"
        />
        <FloatingSelect
          label="Distrito"
          name="client-district"
          value={form.districtId}
          options={districtOptions}
          onChange={onDistrictChange}
          disabled={disabled || !form.provinceId}
          className={inputClassName}
          searchable
          searchPlaceholder="Buscar distrito..."
          emptyMessage="Sin distritos"
        />
      </div>
      <div className={`mt-2 grid grid-cols-1 gap-3 ${fullNameOptions ? "md:grid-cols-2" : ""}`}>
        <FloatingInput
          label="Dirección"
          name="client-address"
          value={form.address}
          onChange={(event) => updateField("address", event.target.value)}
          {...sharedInputProps}
        />
        <FloatingInput
          label="Referencia"
          name="client-reference"
          value={form.reference}
          onChange={(event) => updateField("reference", event.target.value)}
          {...sharedInputProps}
        />
      </div>

      
    </div>
  );
}
