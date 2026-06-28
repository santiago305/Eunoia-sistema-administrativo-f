import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { PaymentMethodSelectComposed } from "@/features/payment-methods/components/PaymentMethodSelectComposed";
import { PaymentMethodFormModal } from "@/features/payment-methods/components/PaymentMethodFormModal";
import {
  createSupplierMethod,
  deleteSupplierMethod,
  getAllPaymentMethods,
  listSupplierMethodsBySupplier,
  updateSupplierMethod,
} from "@/shared/services/paymentMethodService";
import type {
  PaymentMethod,
  SupplierMethodRelation,
} from "@/features/payment-methods/types/paymentMethod";
import { IconButton } from "@/shared/components/components/IconBoton";
import { usePermissions } from "@/shared/hooks/usePermissions";

type ProviderMethodListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  supplierId: string;
};

type SelectOption = {
  value: string;
  label: string;
};

const primaryColor = "hsl(var(--primary))";
const primaryHover = "#1aa392";
const softBorder = `color-mix(in srgb, ${primaryColor} 20%, transparent)`;
const defaultRequiresVoucher = (methodName?: string | null) =>
  (methodName ?? "").trim().toUpperCase() !== "EFECTIVO";

export function ProviderMethodListModal({
  title,
  close,
  className,
  supplierId,
}: ProviderMethodListModalProps) {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canManageGlobalPaymentMethods = can("payment-methods.manage");

  const [rows, setRows] = useState<SupplierMethodRelation[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [number, setNumber] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [requiresVoucher, setRequiresVoucher] = useState(true);
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [editingSupplierMethod, setEditingSupplierMethod] = useState<SupplierMethodRelation | null>(null);
  const [editSelectedId, setEditSelectedId] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editRequiresVoucher, setEditRequiresVoucher] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingRemoveMethod, setPendingRemoveMethod] = useState<SupplierMethodRelation | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadSupplierMethods = useCallback(
    async (silent = false) => {
      if (!supplierId) return;

      if (!silent) clearFeedback();
      setLoading(true);

      try {
        const data = await listSupplierMethodsBySupplier(supplierId);
        setRows(data ?? []);
      } catch {
        setRows([]);
        if (!silent) {
          showFeedback(errorResponse("No se pudieron cargar los métodos de pago."));
        }
      } finally {
        setLoading(false);
      }
    },
    [clearFeedback, showFeedback, supplierId],
  );

  const loadAllMethods = useCallback(
    async (silent = false) => {
      if (!silent) clearFeedback();

      try {
        const data = await getAllPaymentMethods();
        setAllMethods(data ?? []);
      } catch {
        setAllMethods([]);
        if (!silent) {
          showFeedback(errorResponse("No se pudieron cargar los métodos disponibles."));
        }
      }
    },
    [clearFeedback, showFeedback],
  );

  useEffect(() => {
    void loadSupplierMethods();
    void loadAllMethods(true);
  }, [loadAllMethods, loadSupplierMethods]);

  const availableOptions = useMemo<SelectOption[]>(() => {
    return allMethods
      .map((method) => ({
        value: method.methodId,
        label: method.name,
      }));
  }, [allMethods]);

  useEffect(() => {
    if (selectedId && !availableOptions.some((option) => option.value === selectedId)) {
      setSelectedId("");
    }
  }, [selectedId, availableOptions]);

  useEffect(() => {
    const methodName = allMethods.find((method) => method.methodId === selectedId)?.name;
    setRequiresVoucher(defaultRequiresVoucher(methodName));
  }, [allMethods, selectedId]);

  const addMethod = useCallback(async () => {
    if (!supplierId || !selectedId || adding) return;

    clearFeedback();
    setAdding(true);

    try {
      await createSupplierMethod({
        supplierId,
        methodId: selectedId,
        number: number.trim() || undefined,
        isDefault,
        requiresVoucher,
      });

      showFeedback(successResponse("Método agregado"));
      setSelectedId("");
      setNumber("");
      setIsDefault(false);
      setRequiresVoucher(true);
      await loadSupplierMethods(true);
    } catch {
      showFeedback(errorResponse("No se pudo agregar el método"));
    } finally {
      setAdding(false);
    }
  }, [adding, clearFeedback, isDefault, loadSupplierMethods, number, requiresVoucher, selectedId, showFeedback, supplierId]);

  const removeMethod = useCallback(
    async (supplierMethodId?: string | null) => {
      if (!supplierMethodId) return;

      clearFeedback();
      setRemoving(true);

      try {
        await deleteSupplierMethod(supplierMethodId);
        showFeedback(successResponse("Método desvinculado"));
        await loadSupplierMethods(true);
        setPendingRemoveMethod(null);
      } catch {
        showFeedback(errorResponse("No se pudo desvincular el método"));
      } finally {
        setRemoving(false);
      }
    },
    [clearFeedback, loadSupplierMethods, showFeedback],
  );

  const openEditSupplierMethod = useCallback((row: SupplierMethodRelation) => {
    setEditingSupplierMethod(row);
    setEditSelectedId(row.methodId);
    setEditNumber(row.number ?? "");
    setEditIsDefault(Boolean(row.isDefault));
    setEditRequiresVoucher(row.requiresVoucher ?? defaultRequiresVoucher(row.methodName));
  }, []);

  const saveSupplierMethodEdit = useCallback(async () => {
    if (!editingSupplierMethod || !editSelectedId || savingEdit) return;

    clearFeedback();
    setSavingEdit(true);

    try {
      await updateSupplierMethod(editingSupplierMethod.supplierMethodId, {
        methodId: editSelectedId,
        number: editNumber.trim() || undefined,
        isDefault: editIsDefault,
        requiresVoucher: editRequiresVoucher,
      });
      showFeedback(successResponse("Método actualizado"));
      setEditingSupplierMethod(null);
      setEditSelectedId("");
      setEditNumber("");
      setEditIsDefault(false);
      setEditRequiresVoucher(true);
      await loadSupplierMethods(true);
    } catch {
      showFeedback(errorResponse("No se pudo actualizar el método"));
    } finally {
      setSavingEdit(false);
    }
  }, [clearFeedback, editIsDefault, editNumber, editRequiresVoucher, editSelectedId, editingSupplierMethod, loadSupplierMethods, savingEdit, showFeedback]);

  const columns = useMemo<DataTableColumn<SupplierMethodRelation>[]>(
    () => {
      const baseColumns: DataTableColumn<SupplierMethodRelation>[] = [
      {
        id: "method",
        header: "Método",
        cell: (row) => <span className="text-black/70">{row.methodName}</span>,
        className: "text-black/70",
      },
      {
        id: "number",
        header: "Número",
        cell: (row) => <span className="text-black/70">{row.number ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "requiresVoucher",
        header: "Voucher",
        cell: (row) => row.requiresVoucher ? (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Obligatorio</span>
        ) : <span className="text-black/45">No</span>,
      },
      {
        id: "isDefault",
        header: "Predeterminada",
        cell: (row) => row.isDefault ? (
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Default</span>
        ) : <span className="text-black/45">-</span>,
      },
      ];

      return [
        ...baseColumns,
        {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        cell: (row) => (
          <div className="flex justify-end">
            <IconButton
              title="Editar"
              onClick={() => openEditSupplierMethod(row)}
              PRIMARY={primaryColor}
              PRIMARY_HOVER={primaryHover}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              title="Eliminar"
              onClick={() => {
                setPendingRemoveMethod(row);
              }}
              tone="danger"
              PRIMARY={primaryColor}
              PRIMARY_HOVER={primaryHover}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        hideable: false,
        sortable: false,
      },
      ];
    },
    [openEditSupplierMethod],
  );

  return (
    <Modal open={true} onClose={close} title={title} className={className}>
      <div className="space-y-3">
        <div className="flex gap-3">
            <div className="flex-1">
              <PaymentMethodSelectComposed
                label="Método de pago"
                value={selectedId}
                onChange={setSelectedId}
                options={availableOptions}
                onCreate={canManageGlobalPaymentMethods ? () => setOpenCreateMethod(true) : undefined}
                onEdit={canManageGlobalPaymentMethods ? (methodId) => setEditingMethodId(methodId) : undefined}
                className="h-10"
                textSize="text-xs"
                disabled={adding}
                emptyLabel="Sin resultados"
              />
            </div>

            <div className="flex-1">
              <FloatingInput
                label="Número"
                name="supplier-payment-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="h-10 text-xs"
                disabled={adding}
              />
            </div>

            <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-black/70">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
                className="h-4 w-4 accent-primary"
                disabled={adding}
              />
              Predeterminada
            </label>

            <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-black/70">
              <input
                type="checkbox"
                checked={requiresVoucher}
                onChange={(event) => setRequiresVoucher(event.target.checked)}
                className="h-4 w-4 accent-primary"
                disabled={adding}
              />
              Voucher obligatorio
            </label>

            <SystemButton
              size="sm"
              className="sm:mb-1 h-10"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={!selectedId || adding}
              onClick={addMethod}
              style={{
                backgroundColor: primaryColor,
                borderColor: softBorder,
              }}
            >
              {adding ? "Añadiendo..." : "Agregar"}
            </SystemButton>
        </div>


        <DataTable
          tableId="supplier-methods-table"
          data={rows}
          columns={columns}
          rowKey="supplierMethodId"
          loading={loading}
          emptyMessage="No hay métodos asignados."
          hoverable={false}
          animated={false}
        />
      </div>

      <PaymentMethodFormModal
        open={canManageGlobalPaymentMethods && (openCreateMethod || Boolean(editingMethodId))}
        mode={editingMethodId ? "edit" : "create"}
        paymentMethodId={editingMethodId}
        canManage
        onClose={() => {
          setOpenCreateMethod(false);
          setEditingMethodId(null);
        }}
        onSaved={() => {
          void loadAllMethods(true);
          void loadSupplierMethods(true);
        }}
        primaryColor={primaryColor}
        entityLabel="método de pago"
      />

      {editingSupplierMethod ? (
        <Modal
          open={Boolean(editingSupplierMethod)}
          title="Editar método del proveedor"
          onClose={() => {
            if (savingEdit) return;
            setEditingSupplierMethod(null);
          }}
          className="w-[420px] max-h-[360px]"
        >
          <div className="space-y-3">
            <PaymentMethodSelectComposed
              label="Método de pago"
              value={editSelectedId}
              onChange={setEditSelectedId}
              options={availableOptions}
              className="h-10"
              textSize="text-xs"
              disabled={savingEdit}
              emptyLabel="Sin resultados"
            />
            <FloatingInput
              label="Número"
              name="supplier-payment-edit-number"
              value={editNumber}
              onChange={(event) => setEditNumber(event.target.value)}
              className="h-10 text-xs"
              disabled={savingEdit}
            />
            <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-black/70">
              <input
                type="checkbox"
                checked={editIsDefault}
                onChange={(event) => setEditIsDefault(event.target.checked)}
                className="h-4 w-4 accent-primary"
                disabled={savingEdit}
              />
              Predeterminada
            </label>
            <label className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-black/70">
              <input
                type="checkbox"
                checked={editRequiresVoucher}
                onChange={(event) => setEditRequiresVoucher(event.target.checked)}
                className="h-4 w-4 accent-primary"
                disabled={savingEdit}
              />
              Voucher obligatorio
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <SystemButton
              variant="outline"
              size="md"
              onClick={() => setEditingSupplierMethod(null)}
              disabled={savingEdit}
            >
              Cancelar
            </SystemButton>
            <SystemButton
              size="md"
              onClick={() => void saveSupplierMethodEdit()}
              disabled={!editSelectedId || savingEdit}
              loading={savingEdit}
              style={{
                backgroundColor: primaryColor,
                borderColor: softBorder,
              }}
            >
              Guardar cambios
            </SystemButton>
          </div>
        </Modal>
      ) : null}

      <AlertModal
        open={Boolean(pendingRemoveMethod)}
        type="warning"
        title="Desvincular método de pago"
        message={
          pendingRemoveMethod
            ? `Estas por quitar el método ${pendingRemoveMethod.methodName} de este proveedor. Hazlo solo si estas seguro.`
            : ""
        }
        confirmText="Desvincular"
        loading={removing}
        onClose={() => {
          if (removing) return;
          setPendingRemoveMethod(null);
        }}
        onConfirm={() => {
          void removeMethod(pendingRemoveMethod?.supplierMethodId);
        }}
      />
    </Modal>
  );
}

