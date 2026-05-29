import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  createBankAccount,
  listBankAccountsByCompany,
  updateBankAccount,
  updateBankAccountActive,
} from "@/shared/services/bankAccountService";
import { BankAccount } from "../types/bankAccounts";

type BankAccountListModalProps = {
  title: string;
  close: () => void;
  className?: string;
  companyId: string;
};

type BankAccountForm = {
  name: string;
  number: string;
};

const PRIMARY = "hsl(var(--primary))";

const emptyForm: BankAccountForm = {
  name: "",
  number: "",
};

export function BankAccountListModal({
  title,
  close,
  className,
  companyId,
}: BankAccountListModalProps) {
  const { showFeedback, clearFeedback } = useFeedbackToast();

  const [rows, setRows] = useState<BankAccount[]>([]);
  const [form, setForm] = useState<BankAccountForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingId);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
  }, []);

  const loadBankAccounts = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!companyId) return;
      if (!options?.silent) clearFeedback();

      setLoading(true);

      try {
        const data = await listBankAccountsByCompany(companyId);
        setRows(data ?? []);
      } catch {
        setRows([]);
        if (!options?.silent) {
          showFeedback(errorResponse("No se pudieron cargar las cuentas bancarias."));
        }
      } finally {
        setLoading(false);
      }
    },
    [clearFeedback, companyId, showFeedback],
  );

  useEffect(() => {
    void loadBankAccounts();
  }, [loadBankAccounts]);

  const saveBankAccount = useCallback(async () => {
    if (saving) return;

    const name = form.name.trim();
    const number = form.number.trim();

    if (!name) {
      showFeedback(errorResponse("El nombre de la cuenta es obligatorio."));
      return;
    }

    clearFeedback();
    setSaving(true);

    try {
      if (editingId) {
        await updateBankAccount(editingId, {
          name,
          number,
        });

        showFeedback(successResponse("Cuenta bancaria actualizada"));
      } else {
        await createBankAccount({
          companyId,
          name,
          number,
          isActive: true,
        });

        showFeedback(successResponse("Cuenta bancaria agregada"));
      }

      resetForm();
      await loadBankAccounts({ silent: true });
    } catch {
      showFeedback(errorResponse("No se pudo guardar la cuenta bancaria."));
    } finally {
      setSaving(false);
    }
  }, [
    clearFeedback,
    companyId,
    editingId,
    form.name,
    form.number,
    loadBankAccounts,
    resetForm,
    saving,
    showFeedback,
  ]);

  const startEdit = useCallback((row: BankAccount) => {
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      number: row.number ?? "",
    });
  }, []);

  const toggleActive = useCallback(
    async (row: BankAccount) => {
      clearFeedback();

      try {
        await updateBankAccountActive(row.id, {
          isActive: !row.isActive,
        });

        showFeedback(
          successResponse(row.isActive ? "Cuenta bancaria desactivada" : "Cuenta bancaria activada"),
        );

        await loadBankAccounts({ silent: true });
      } catch {
        showFeedback(errorResponse("No se pudo actualizar el estado de la cuenta bancaria."));
      }
    },
    [clearFeedback, loadBankAccounts, showFeedback],
  );

  const columns = useMemo<DataTableColumn<BankAccount>[]>(
    () => [
      {
        id: "name",
        header: "Cuenta",
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
        id: "status",
        header: "Estado",
        cell: (row) => (
          <span
            className={[
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            ].join(" ")}
          >
            {row.isActive ? "Activa" : "Inactiva"}
          </span>
        ),
        className: "text-black/70",
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <div className="flex justify-end gap-1">
            <SystemButton
              variant="outline"
              size="custom"
              className="h-7 w-7 rounded-lg p-0"
              onClick={() => startEdit(row)}
              title="Editar cuenta"
            >
              <Pencil className="h-4 w-4" />
            </SystemButton>

            <SystemButton
              variant={row.isActive ? "danger" : "outline"}
              size="custom"
              className="h-7 w-7 rounded-lg p-0"
              onClick={() => toggleActive(row)}
              title={row.isActive ? "Eliminar" : "Restaurar"}
            >
              {row.isActive ? <Trash2 className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </SystemButton>
          </div>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideable: false,
      },
    ],
    [startEdit, toggleActive],
  );

  const modalClassName = ["w-full max-w-xl", className].filter(Boolean).join(" ");

  return (
    <Modal onClose={close} title={title} className={modalClassName}>
      <div className="space-y-3">
        <div className="mb-3 flex flex-col gap-3 text-xs text-black/60">
            <div
              className={[
                "grid gap-3 lg:items-end",
                isEditing
                  ? "lg:grid-cols-[0.8fr_1.2fr_0.2fr_0.2fr]"
                  : "lg:grid-cols-[0.8fr_1.2fr_0.2fr]",
              ].join(" ")}
            >            
            <FloatingInput
              label="Nombre"
              name="bank-account-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              disabled={saving}
              className="h-10 text-xs"
            />

            <FloatingInput
              label="Número"
              name="bank-account-number"
              value={form.number}
              onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))}
              disabled={saving}
              className="h-10 text-xs"
            />

            {isEditing && (
              <SystemButton
                size="sm"
                variant="outline"
                className="h-10"
                disabled={saving}
                onClick={resetForm}
              >
                Cancelar
              </SystemButton>
            )}

            <SystemButton
              size="sm"
              className="h-10"
              leftIcon={isEditing ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              disabled={!form.name.trim() || saving}
              onClick={saveBankAccount}
              style={{
                backgroundColor: PRIMARY,
                borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
              }}
            >
              {saving ? "Guardando..." : isEditing ? "Actualizar" : "Añadir"}
            </SystemButton>
          </div>
        </div>

        <DataTable
          tableId="company-bank-accounts-table"
          data={rows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay cuentas bancarias registradas."
          hoverable={false}
          animated={false}
          responsiveMode="table"
        />
      </div>
    </Modal>
  );
}