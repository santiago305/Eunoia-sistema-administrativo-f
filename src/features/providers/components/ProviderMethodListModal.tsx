import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { PaymentMethodSelectComposed } from "@/features/payment-methods/components/PaymentMethodSelectComposed";
import { PaymentMethodFormModal } from "@/features/payment-methods/components/PaymentMethodFormModal";
import {
  createSupplierMethod,
  deleteSupplierMethod,
  getAllPaymentMethods,
  listSupplierMethodsBySupplier,
} from "@/shared/services/paymentMethodService";
import type {
  PaymentMethod,
  SupplierMethodRelation,
} from "@/features/payment-methods/types/paymentMethod";
import { IconButton } from "@/shared/components/components/IconBoton";

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

export function ProviderMethodListModal({
  title,
  close,
  className,
  supplierId,
}: ProviderMethodListModalProps) {
  const { showFlash, clearFlash } = useFlashMessage();

  const [rows, setRows] = useState<SupplierMethodRelation[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [number, setNumber] = useState("");
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [pendingRemoveMethod, setPendingRemoveMethod] = useState<SupplierMethodRelation | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadSupplierMethods = useCallback(
    async (silent = false) => {
      if (!supplierId) return;

      if (!silent) clearFlash();
      setLoading(true);

      try {
        const data = await listSupplierMethodsBySupplier(supplierId);
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

  const addMethod = useCallback(async () => {
    if (!supplierId || !selectedId || adding) return;

    clearFlash();
    setAdding(true);

    try {
      await createSupplierMethod({
        supplierId,
        methodId: selectedId,
        number: number.trim() || undefined,
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
    async (supplierMethodId?: string | null) => {
      if (!supplierMethodId) return;

      clearFlash();
      setRemoving(true);

      try {
        await deleteSupplierMethod(supplierMethodId);
        showFlash(successResponse("Método desvinculado"));
        await loadSupplierMethods(true);
        setPendingRemoveMethod(null);
      } catch {
        showFlash(errorResponse("No se pudo desvincular el método"));
      } finally {
        setRemoving(false);
      }
    },
    [clearFlash, loadSupplierMethods, showFlash],
  );

  const columns = useMemo<DataTableColumn<SupplierMethodRelation>[]>(
    () => [
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
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        cell: (row) => (
          <div className="flex justify-end">
            <IconButton
              title="Eliminar"
              onClick={() => setPendingRemoveMethod(row)}
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
          rowKey="supplierMethodId"
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
