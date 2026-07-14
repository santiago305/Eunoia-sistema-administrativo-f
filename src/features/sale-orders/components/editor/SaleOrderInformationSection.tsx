import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  createAdviser,
  type AdviserOption,
} from "@/shared/services/adviserService";
import { listUsers } from "@/shared/services/userService";
import type { SaleOrderEditorForm } from "./saleOrderEditorForm";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";

type Props = {
  form: SaleOrderEditorForm;
  setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
  workflowOptions: Array<{ value: string; label: string }>;
  warehouseOptions: Array<{ value: string; label: string }>;
  sourceOptions: Array<{ value: string; label: string }>;
  adviserOptions: AdviserOption[];
  onAdviserCreated: (adviser: AdviserOption) => void;
};

export function SaleOrderInformationSection({
  form,
  setForm,
  workflowOptions,
  warehouseOptions,
  sourceOptions,
  adviserOptions,
  onAdviserCreated,
}: Props) {
  const { permissions = [] } = useAuth();
  const canAssignRoles =
    Array.isArray(permissions) && permissions.includes("users.assign_roles");
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const adviserIds = useMemo(
    () => new Set(adviserOptions.map((adviser) => adviser.id)),
    [adviserOptions],
  );
  const inputClassName = "h-9 text-xs";

  useEffect(() => {
    if (!open) return;
    void listUsers({ status: "active", page: 1 })
      .then((response) =>
        setUsers(
          response.items
            .filter((user) => !adviserIds.has(user.id))
            .map((user) => ({
              value: user.id,
              label: `${user.name} (${user.email})`,
            })),
        ),
      )
      .catch(() => setUsers([]));
  }, [adviserIds, open]);

  return (
    <SaleOrderEditorSection title="Información del pedido">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 space-y-1">
         <FloatingDatePicker
            label="Fecha agenda"
            name="sale-order-schedule-date"
            className={inputClassName}
            value={parseDateInputValue(form.scheduleDate)}
            onChange={(date) =>
              setForm((current) => ({
                ...current,
                scheduleDate: date ? toLocalDateKey(date) : "",
              }))
            }
          />
          <FloatingDatePicker
            label="Fecha entrega"
            name="sale-order-delivery-date"
            className={inputClassName}
            value={parseDateInputValue(form.deliveryDate)}
            onChange={(date) =>
              setForm((current) => ({
                ...current,
                deliveryDate: date ? toLocalDateKey(date) : "",
              }))
            }
          />
        <FloatingSelect
          label="Tipo"
          className={inputClassName}
          name="sale-order-workflow"
          value={form.workflowId}
          options={workflowOptions}
          requiredIndicator
          onChange={(workflowId) =>
            setForm((current) => ({ ...current, workflowId }))
          }
          searchable
        />
        <FloatingSelect
          label="Almacén"
          name="sale-order-warehouse"
          className={inputClassName}
          value={form.warehouseId}
          options={warehouseOptions}
          onChange={(warehouseId) =>
            setForm((current) => ({ ...current, warehouseId }))
          }
          searchable
          disabled={!form.editPolicy.warehouseEditable}
        />
        <FloatingSelect
          label="Enganche"
          name="sale-order-source"
          className={inputClassName}
          value={form.sourceId}
          options={sourceOptions}
          onChange={(sourceId) =>
            setForm((current) => ({ ...current, sourceId }))
          }
          searchable
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <FloatingSelect
            label="Asignado"
            className={inputClassName}
            name="sale-order-adviser"
            value={form.assignedBy}
            options={adviserOptions.map((adviser) => ({
              value: adviser.id,
              label: adviser.name,
            }))}
            onChange={(assignedBy) =>
              setForm((current) => ({ ...current, assignedBy }))
            }
            searchable
          />
          {canAssignRoles ? (
            <SystemButton
              type="button"
              size="icon"
              className="h-8 w-9"
              title="Clasificar usuario como asesor"
              aria-label="Clasificar usuario como asesor"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </SystemButton>
          ) : null}
        </div>
        <FloatingInput
          label="Código publicitario"
          name="sale-order-advertising-code"
          className={inputClassName}
          value={form.advertisingCode}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              advertisingCode: event.target.value,
            }))
          }
        />
        <FloatingInput
          label="Observación"
          className={inputClassName}
          name="sale-order-observation"
          value={form.observation}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              observation: event.target.value,
            }))
          }
        />
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Añadir asesor"
        className="w-[440px]"
      >
        <div className="space-y-4">
          <FloatingSelect
            label="Usuario"
            name="new-adviser-user"
            value={selectedUserId}
            options={users}
            onChange={setSelectedUserId}
            searchable
          />
          <div className="flex justify-end gap-2">
            <SystemButton
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </SystemButton>
            <SystemButton
              disabled={!selectedUserId || saving}
              onClick={() => {
                setSaving(true);
                void createAdviser(selectedUserId)
                  .then((adviser) => {
                    onAdviserCreated(adviser);
                    setForm((current) => ({
                      ...current,
                      assignedBy: adviser.id,
                    }));
                    setOpen(false);
                    setSelectedUserId("");
                  })
                  .finally(() => setSaving(false));
              }}
            >
              Añadir
            </SystemButton>
          </div>
        </div>
      </Modal>
    </SaleOrderEditorSection>
  );
}
