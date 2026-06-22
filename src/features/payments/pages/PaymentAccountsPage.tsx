import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Power } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useCompany } from "@/shared/hooks/useCompany";
import { usePermissions } from "@/shared/hooks/usePermissions";
import {
  listCompanyPaymentAccountsByCompany,
  setCompanyPaymentAccountActive,
} from "@/shared/services/companyPaymentAccountService";
import type { CompanyPaymentAccount } from "../types/payment-account.types";
import { getCompanyPaymentAccountDisplay, getCompanyPaymentAccountTypeLabel } from "../paymentAccountView";
import { CompanyPaymentAccountFormModal } from "../components/CompanyPaymentAccountFormModal";

export default function PaymentAccountsPage() {
  const { company } = useCompany();
  const { can } = usePermissions();
  const [items, setItems] = useState<CompanyPaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const canCreate = can("payment_accounts.create");
  const canDisable = can("payment_accounts.disable");

  const load = useCallback(async () => {
    if (!company?.companyId) return;
    setLoading(true);
    try {
      setItems(await listCompanyPaymentAccountsByCompany(company.companyId));
    } finally {
      setLoading(false);
    }
  }, [company?.companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<DataTableColumn<CompanyPaymentAccount>[]>(
    () => [
      {
        id: "maskedLabel",
        header: "Cuenta",
        cell: (row) => <span className="font-medium text-black/80">{getCompanyPaymentAccountDisplay(row)}</span>,
        hideable: false,
      },
      {
        id: "type",
        header: "Tipo",
        cell: (row) => <span className="text-black/70">{getCompanyPaymentAccountTypeLabel(row.type)}</span>,
      },
      {
        id: "bankName",
        header: "Banco/Billetera",
        cell: (row) => <span className="text-black/70">{row.bankName || row.walletName || "-"}</span>,
      },
      {
        id: "isActive",
        header: "Estado",
        cell: (row) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            row.isActive ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
          }`}>
            {row.isActive ? "Activa" : "Inactiva"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        hideable: false,
        sortable: false,
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (row) => canDisable ? (
          <SystemButton
            size="sm"
            variant="ghost"
            leftIcon={<Power className="h-4 w-4" />}
            onClick={async () => {
              await setCompanyPaymentAccountActive(row.id, !row.isActive);
              await load();
            }}
          >
            {row.isActive ? "Desactivar" : "Activar"}
          </SystemButton>
        ) : null,
      },
    ],
    [canDisable, load],
  );

  return (
    <PageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black/85">Cuentas de pago</h1>
          <p className="text-sm text-black/55">Cuentas, tarjetas, cajas y billeteras usadas para pagos de compras.</p>
        </div>
        {canCreate && company?.companyId ? (
          <SystemButton leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpenCreate(true)}>
            Nueva cuenta
          </SystemButton>
        ) : null}
      </div>

      <DataTable
        tableId="payment-accounts-table"
        data={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        emptyMessage="No hay cuentas de pago registradas."
        hoverable={false}
        animated={false}
      />

      {company?.companyId ? (
        <CompanyPaymentAccountFormModal
          open={openCreate}
          companyId={company.companyId}
          onClose={() => setOpenCreate(false)}
          onSaved={load}
        />
      ) : null}
    </PageShell>
  );
}
