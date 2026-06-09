import { useEffect, useMemo, type CSSProperties } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Trash2 } from "lucide-react";

import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { UbigeoSelectSection } from "@/shared/components/components/UbigeoSelectSection";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { UbigeoSelection } from "@/shared/types/ubigeo";
import type { Agency, AgencyForm } from "@/features/agencies/types/agency";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  agency?: Agency | null;
  onClose: () => void;
  onSubmit: (form: AgencyForm) => void;
  primaryColor?: string;
  loading?: boolean;
};

const DEFAULT_SUBSIDIARY = {
  alias: "",
  departmentId: "",
  provinceId: "",
  districtId: "",
  address: "",
  basePrice: 0,
  note: "",
  isActive: true,
};

const DEFAULT_FORM: AgencyForm = {
  name: "",
  isActive: true,
  subsidiaries: [DEFAULT_SUBSIDIARY],
};

function mapAgencyToForm(agency?: Agency | null): AgencyForm {
  if (!agency) return DEFAULT_FORM;

  return {
    name: agency.name ?? "",
    isActive: agency.isActive,
    subsidiaries: agency.subsidiaries?.length
      ? agency.subsidiaries.map((subsidiary) => ({
          id: subsidiary.id,
          alias: subsidiary.alias ?? "",
          departmentId: subsidiary.departmentId ?? "",
          provinceId: subsidiary.provinceId ?? "",
          districtId: subsidiary.districtId ?? "",
          address: subsidiary.address ?? "",
          basePrice: subsidiary.basePrice ?? 0,
          note: subsidiary.note ?? "",
          isActive: agency.isActive ? subsidiary.isActive : false,
        }))
      : [DEFAULT_SUBSIDIARY],
  };
}

export function AgencyFormModal({
  open,
  mode,
  agency,
  onClose,
  onSubmit,
  primaryColor = "hsl(var(--primary))",
  loading = false,
}: Props) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<AgencyForm>({
    defaultValues: DEFAULT_FORM,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subsidiaries",
  });
  const rows = useMemo(
    () => fields.map((field, index) => ({ ...field, rowId: field.id, index })),
    [fields],
  );
  const agencyIsActive = watch("isActive");

  const setAgencyActive = (isActive: boolean) => {
    setValue("isActive", isActive, { shouldDirty: true, shouldValidate: true });

    fields.forEach((_, index) => {
      setValue(`subsidiaries.${index}.isActive`, isActive, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  };

  useEffect(() => {
    if (!open) return;
    reset(mode === "edit" ? mapAgencyToForm(agency) : DEFAULT_FORM);
  }, [agency, mode, open, reset]);

  const saveButtonStyle = useMemo(
    () =>
      ({
        backgroundColor: primaryColor,
        borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
        "--tw-ring-color": `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
      }) as CSSProperties,
    [primaryColor],
  );

  const title = mode === "edit" ? "Editar agencia" : "Nueva agencia";

  const columns = useMemo<DataTableColumn<(typeof rows)[number]>[]>(
    () => [
      {
        id: "alias",
        header: "Alias",
        cell: (row) => (
          <FloatingInput
            label="Alias"
            className="h-9 text-xs"
            value={watch(`subsidiaries.${row.index}.alias`) ?? ""}
            disabled={loading || isSubmitting}
            {...register(`subsidiaries.${row.index}.alias`, { required: true })}
          />
        ),
      },
      {
        id: "ubigeo",
        header: "Ubigeo",
        className: "min-w-[390px]",
        cell: (row) => {
          const subsidiary = watch(`subsidiaries.${row.index}`);
          const ubigeoValue: UbigeoSelection = {
            departmentId: subsidiary?.departmentId ?? "",
            provinceId: subsidiary?.provinceId ?? "",
            districtId: subsidiary?.districtId ?? "",
          };

          return (
            <UbigeoSelectSection
              value={ubigeoValue}
              onChange={(next) => {
                setValue(`subsidiaries.${row.index}.departmentId`, next.departmentId ?? "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue(`subsidiaries.${row.index}.provinceId`, next.provinceId ?? "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue(`subsidiaries.${row.index}.districtId`, next.districtId ?? "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              className="h-9 text-xs"
            />
          );
        },
      },
      {
        id: "address",
        header: "Dirección",
        cell: (row) => (
          <FloatingInput
            label="Dirección"
            className="h-9 text-xs"
            value={watch(`subsidiaries.${row.index}.address`) ?? ""}
            disabled={loading || isSubmitting}
            {...register(`subsidiaries.${row.index}.address`)}
          />
        ),
      },
      {
        id: "price",
        header: "Precio",
        className: "w-[120px]",
        cell: (row) => (
          <FloatingInput
            label="Precio"
            type="number"
            min={0}
            step="0.01"
            className="h-9 text-xs"
            value={String(watch(`subsidiaries.${row.index}.basePrice`))}
            disabled={loading || isSubmitting}
            {...register(`subsidiaries.${row.index}.basePrice`, {
              valueAsNumber: true,
              min: 0,
            })}
          />
        ),
      },
      {
        id: "active",
        header: "Activa",
        cell: (row) => (
          <div className="flex justify-center">
            <Checkbox
              checked={watch(`subsidiaries.${row.index}.isActive`)}
              disabled={loading || isSubmitting || !agencyIsActive}
              onCheckedChange={(checked) => {
                setValue(`subsidiaries.${row.index}.isActive`, checked === true, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
          </div>
        ),
      },
      {
        id: "remove",
        header: "Acción",
        cell: (row) => (
          <div className="flex justify-center">
            <button
              type="button"
              disabled={loading || isSubmitting || fields.length <= 1}
              onClick={() => remove(row.index)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [agencyIsActive, fields.length, isSubmitting, loading, register, remove, setValue, watch],
  );

  if (!open) return null;

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      className="w-[1100px] max-h-[85vh]"
    >
      <form
        onSubmit={handleSubmit((form) => onSubmit(form))}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <FloatingInput
            label="Nombre"
            className="h-12 text-xs"
            disabled={loading || isSubmitting}
            value={watch("name")}
            {...register("name", { required: true })}
          />

          <label className="flex items-center gap-2 rounded-md border px-3 text-xs text-black/70">
            <Checkbox
              checked={agencyIsActive}
              disabled={loading || isSubmitting}
              onCheckedChange={(checked) => setAgencyActive(checked === true)}
            />
            Agencia activa
          </label>
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-black/50">
              Sucursales
            </h3>

            <SystemButton
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || isSubmitting}
              onClick={() =>
                append({ ...DEFAULT_SUBSIDIARY, isActive: agencyIsActive })
              }
            >
              Agregar sucursal
            </SystemButton>
          </div>

          <DataTable
            tableId="agency-form-subsidiaries"
            data={rows}
            columns={columns}
            rowKey="rowId"
            loading={false}
            hoverable={false}
            animated={false}
            selectableColumns={false}
            stickyHeader={false}
            responsiveCards={false}
            tableClassName="text-xs"
            emptyMessage="Agrega al menos una sucursal."
            maxHeight="520px"
            rowClickable={false}
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <SystemButton
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading || isSubmitting}
          >
            Cancelar
          </SystemButton>

          <SystemButton
            type="submit"
            size="md"
            style={saveButtonStyle}
            disabled={loading || isSubmitting}
            loading={loading || isSubmitting}
          >
            Guardar
          </SystemButton>
        </div>
      </form>
    </Modal>
  );
}
