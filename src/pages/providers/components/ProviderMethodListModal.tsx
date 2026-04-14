import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AlertModal } from "@/components/AlertModal";
import { Modal } from "@/components/modales/Modal";
import { FloatingInput } from "@/components/FloatingInput";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { PaymentMethodSelectComposed } from "@/pages/payment-methods/components/PaymentMethodSelectComposed";
import { PaymentMethodFormModal } from "@/pages/payment-methods/components/PaymentMethodFormModal";
import {
  createSupplierMethod,
  deleteSupplierMethod,
  getAllPaymentMethods,
  getPaymentMethodsBySupplier,
} from "@/services/paymentMethodService";
import type {
  PaymentMethod,
  PaymentMethodPivot,
} from "@/pages/payment-methods/types/paymentMethod";

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
const softBorder = `color-mix(in srgb, ${primaryColor} 20%, transparent)`;

export function ProviderMethodListModal({
  title,
  close,
  className,
  supplierId,
}: ProviderMethodListModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();

  const [rows, setRows] = useState<PaymentMethodPivot[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [number, setNumber] = useState("");
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [pendingRemoveMethod, setPendingRemoveMethod] = useState<PaymentMethodPivot | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadSupplierMethods = useCallback(
    async (silent = false) => {
      if (!supplierId) return;

      if (!silent) clearFlash();
      setLoading(true);

      try {
        const data = await getPaymentMethodsBySupplier(supplierId);
        setRows(data ?? []);
      } catch {
        setRows([]);
        if (!silent) {
          showFlash(errorResponse("No se pudieron cargar los métodos de pago."));
        }
      } finally {
        setLoading(false);
      }
    },
    [clearFlash, showFlash, supplierId],
  );

  const loadAllMethods = useCallback(
    async (silent = false) => {
      if (!silent) clearFlash();

      try {
        const data = await getAllPaymentMethods();
        setAllMethods(data ?? []);
      } catch {
        setAllMethods([]);
        if (!silent) {
          showFlash(errorResponse("No se pudieron cargar los métodos disponibles."));
        }
      }
    },
    [clearFlash, showFlash],
  );

  useEffect(() => {
    void loadSupplierMethods();
    void loadAllMethods(true);
  }, [loadAllMethods, loadSupplierMethods]);

  const availableOptions = useMemo<SelectOption[]>(() => {
    const selectedSet = new Set(rows.map((row) => row.methodId));

    return allMethods
      .filter((method) => !selectedSet.has(method.methodId))
      .map((method) => ({
        value: method.methodId,
        label: method.name,
      }));
  }, [allMethods, rows]);

  useEffect(() => {
    if (selectedId && !availableOptions.some((option) => option.value === selectedId)) {
      setSelectedId("");
    }
  }, [selectedId, availableOptions]);

  const addMethod = useCallback(async () => {
    if (!supplierId || !selectedId || adding) return;

    clearFlash();
    setAdding(true);

    try {
      await createSupplierMethod({
        supplierId,
        methodId: selectedId,
        number,
      });

      showFlash(successResponse("Método agregado"));
      setSelectedId("");
      setNumber("");
      await loadSupplierMethods(true);
    } catch {
      showFlash(errorResponse("No se pudo agregar el método"));
    } finally {
      setAdding(false);
    }
  }, [adding, clearFlash, loadSupplierMethods, number, selectedId, showFlash, supplierId]);

  const removeMethod = useCallback(
    async (methodId?: string | null) => {
      if (!supplierId || !methodId) return;

      clearFlash();
      setRemoving(true);

      try {
        await deleteSupplierMethod(supplierId, methodId);
        showFlash(successResponse("Método desvinculado"));
        await loadSupplierMethods(true);
        setPendingRemoveMethod(null);
      } catch {
        showFlash(errorResponse("No se pudo desvincular el método"));
      } finally {
        setRemoving(false);
      }
    },
    [clearFlash, loadSupplierMethods, showFlash, supplierId],
  );

  const columns = useMemo<DataTableColumn<PaymentMethodPivot>[]>(
    () => [
      {
        id: "method",
        header: "Método",
        accessorKey: "name",
        className: "text-black/70",
      },
      {
        id: "number",
        header: "Número",
        cell: (row) => <span className="text-black/70">{row.number ?? "-"}</span>,
        className: "text-black/70",
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <div className="flex justify-end">
            <SystemButton
              variant="danger"
              size="custom"
              className="h-7 w-7 rounded-lg p-0"
              onClick={() => setPendingRemoveMethod(row)}
              title="Quitar método"
            >
              <Trash2 className="h-4 w-4" />
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [],
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
              onCreate={() => setOpenCreateMethod(true)}
              onEdit={(methodId) => setEditingMethodId(methodId)}
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
          rowKey="methodId"
          loading={loading}
          emptyMessage="No hay métodos asignados."
          hoverable={false}
          animated={false}
        />
      </div>

      <PaymentMethodFormModal
        open={openCreateMethod || Boolean(editingMethodId)}
        mode={editingMethodId ? "edit" : "create"}
        paymentMethodId={editingMethodId}
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

      <AlertModal
        open={Boolean(pendingRemoveMethod)}
        type="warning"
        title="Desvincular método de pago"
        message={
          pendingRemoveMethod
            ? `Estas por quitar el método ${pendingRemoveMethod.name} de este proveedor. Hazlo solo si estas seguro.`
            : ""
        }
        confirmText="Desvincular"
        loading={removing}
        onClose={() => {
          if (removing) return;
          setPendingRemoveMethod(null);
        }}
        onConfirm={() => {
          void removeMethod(pendingRemoveMethod?.methodId);
        }}
      />
    </Modal>
  );
}
