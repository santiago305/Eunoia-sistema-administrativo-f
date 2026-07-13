import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { DataTableSearchBar } from "@/shared/components/table/search";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
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
import { PaymentAccountActionsMenu } from "../components/PaymentAccountActionsMenu";
import { PaymentAccountStatusBadge } from "../components/PaymentAccountStatusBadge";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type TypeFilter = "ALL" | CompanyPaymentAccount["type"];

const typeFilterOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "ALL", label: "Todos los tipos" },
  { value: "BANK_ACCOUNT", label: "Cuenta bancaria" },
  { value: "CREDIT_CARD", label: "Tarjeta de credito" },
  { value: "CASH", label: "Caja" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
];

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activas" },
  { value: "INACTIVE", label: "Inactivas" },
];

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

export default function PaymentAccountsPage() {
  const { company } = useCompany();
  const { can } = usePermissions();
  const [items, setItems] = useState<CompanyPaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CompanyPaymentAccount | null>(null);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const canCreate = can("payment_accounts.create");
  const canEdit = can("payment_accounts.edit");
  const canDisable = can("payment_accounts.disable");
  const canViewSensitive = can("payment_accounts.view_sensitive");

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

  const filteredItems = useMemo(() => {
    const query = normalize(searchText);

    return items.filter((account) => {
      if (typeFilter !== "ALL" && account.type !== typeFilter) return false;
      if (statusFilter === "ACTIVE" && !account.isActive) return false;
      if (statusFilter === "INACTIVE" && account.isActive) return false;
      if (!query) return true;

      const searchableText = [
        account.name,
        account.maskedLabel,
        account.bankName,
        account.walletName,
        account.currency,
        getCompanyPaymentAccountTypeLabel(account.type),
      ].map(normalize).join(" ");

      return searchableText.includes(query);
    });
  }, [items, searchText, statusFilter, typeFilter]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingAccount(null);
  }, []);

  const handleEdit = useCallback((account: CompanyPaymentAccount) => {
    setEditingAccount(account);
    setFormOpen(true);
  }, []);

  const handleToggleActive = useCallback(async (account: CompanyPaymentAccount) => {
    if (busyAccountId || !canDisable) return;
    setBusyAccountId(account.id);
    try {
      await setCompanyPaymentAccountActive(account.id, !account.isActive);
      await load();
    } finally {
      setBusyAccountId(null);
    }
  }, [busyAccountId, canDisable, load]);

  const columns = useMemo<DataTableColumn<CompanyPaymentAccount>[]>(
    () => [
      {
        id: "maskedLabel",
        header: "Cuenta",
        searchValue: (row) => getCompanyPaymentAccountDisplay(row),
        cell: (row) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-black/80">{getCompanyPaymentAccountDisplay(row)}</span>
              {row.isDefault ? (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Predeterminada
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-black/45">{row.name}</p>
          </div>
        ),
        hideable: false,
      },
      {
        id: "type",
        header: "Tipo",
        accessorKey: "type",
        searchValue: (row) => getCompanyPaymentAccountTypeLabel(row.type),
        cell: (row) => <span className="text-black/70">{getCompanyPaymentAccountTypeLabel(row.type)}</span>,
      },
      {
        id: "bankName",
        header: "Banco/Billetera",
        searchValue: (row) => row.bankName || row.walletName || "",
        cell: (row) => <span className="text-black/70">{row.bankName || row.walletName || "-"}</span>,
      },
      {
        id: "identifier",
        header: "Identificador",
        visible: false,
        searchValue: (row) => row.maskedLabel,
        cell: (row) => {
          const sensitiveValue = row.accountNumber || row.cardLastFour || row.accountLastFour || null;
          return (
            <span className="text-black/70">
              {canViewSensitive && sensitiveValue ? sensitiveValue : row.maskedLabel || "-"}
            </span>
          );
        },
      },
      {
        id: "currency",
        header: "Moneda",
        accessorKey: "currency",
        cell: (row) => <span className="font-medium text-black/70">{row.currency}</span>,
      },
      {
        id: "isActive",
        header: "Estado",
        accessorKey: "isActive",
        sortAccessor: "isActive",
        cell: (row) => <PaymentAccountStatusBadge isActive={row.isActive} />,
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        hideable: false,
        sortable: false,
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (row) => (
          <PaymentAccountActionsMenu
            account={row}
            canEdit={canEdit}
            canDisable={canDisable}
            busy={busyAccountId === row.id}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
          />
        ),
      },
    ],
    [busyAccountId, canDisable, canEdit, canViewSensitive, handleEdit, handleToggleActive],
  );

  const toolbarSearchContent = (
    <DataTableSearchBar
      value={searchText}
      onChange={setSearchText}
      onSubmitSearch={() => undefined}
      searchLabel="Buscar cuentas de pago"
      searchName="payment-accounts-search"
      helperText="Busca por cuenta, banco, billetera, moneda o tipo."
    >
      <div className="space-y-3">
        <FloatingSelect
          label="Tipo"
          name="payment-account-type-filter"
          value={typeFilter}
          options={typeFilterOptions}
          onChange={(value) => setTypeFilter(value as TypeFilter)}
        />
        <FloatingSelect
          label="Estado"
          name="payment-account-status-filter"
          value={statusFilter}
          options={statusFilterOptions}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        />
      </div>
    </DataTableSearchBar>
  );

  return (
    <PageShell>
      <PageActionsRow>
        {canCreate && company?.companyId ? (
          <SystemButton
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingAccount(null);
              setFormOpen(true);
            }}
          >
            Nueva cuenta
          </SystemButton>
        ) : null}
      </PageActionsRow>

      <DataTable
        tableId="payment-accounts-table"
        data={filteredItems}
        columns={columns}
        rowKey="id"
        loading={loading}
        emptyMessage="No hay cuentas de pago registradas."
        selectableColumns
        toolbarSearchContent={toolbarSearchContent}
        hoverable={false}
        animated={false}
      />

      {company?.companyId ? (
        <CompanyPaymentAccountFormModal
          open={formOpen}
          companyId={company.companyId}
          account={editingAccount}
          onClose={closeForm}
          onSaved={load}
        />
      ) : null}
    </PageShell>
  );
}
