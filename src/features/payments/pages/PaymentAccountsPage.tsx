import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useCompany } from "@/shared/hooks/useCompany";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { successResponse } from "@/shared/common/utils/response";
import {
  deleteLocalSearchMetric,
  loadLocalSavedSearchMetrics,
  saveLocalSearchMetric,
} from "@/shared/utils/localSavedSearchMetrics";
import {
  listCompanyPaymentAccountsByCompany,
  setCompanyPaymentAccountActive,
} from "@/shared/services/companyPaymentAccountService";
import type { CompanyPaymentAccount } from "../types/payment-account.types";
import { getCompanyPaymentAccountDisplay, getCompanyPaymentAccountTypeLabel } from "../paymentAccountView";
import { CompanyPaymentAccountFormModal } from "../components/CompanyPaymentAccountFormModal";
import { PaymentAccountActionsMenu } from "../components/PaymentAccountActionsMenu";
import { PaymentAccountSmartSearchPanel } from "../components/PaymentAccountSmartSearchPanel";
import { PaymentAccountStatusBadge } from "../components/PaymentAccountStatusBadge";
import {
  PaymentAccountSearchFields,
  type PaymentAccountSearchRule,
  type PaymentAccountSearchSnapshot,
} from "../types/payment-account-search.types";
import {
  buildPaymentAccountSearchChips,
  buildPaymentAccountSmartSearchColumns,
  createEmptyPaymentAccountSearchFilters,
  getDefaultPaymentAccountSearchState,
  hasPaymentAccountSearchCriteria,
  removePaymentAccountSearchKey,
  sanitizePaymentAccountSearchSnapshot,
  upsertPaymentAccountSearchRule,
  type PaymentAccountSearchFilterKey,
} from "../utils/paymentAccountSmartSearch";

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
const PAYMENT_ACCOUNT_SAVED_METRICS_KEY = "eunoia:payment-accounts:saved-search-metrics";

export default function PaymentAccountsPage() {
  const { company } = useCompany();
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();
  const [items, setItems] = useState<CompanyPaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CompanyPaymentAccount | null>(null);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyPaymentAccountSearchFilters());
  const [savingMetric, setSavingMetric] = useState(false);
  const [savedMetrics, setSavedMetrics] = useState<DataTableSavedSearchItem<PaymentAccountSearchSnapshot>[]>(() =>
    loadLocalSavedSearchMetrics<PaymentAccountSearchSnapshot>(PAYMENT_ACCOUNT_SAVED_METRICS_KEY),
  );
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

  const searchState = useMemo(() => getDefaultPaymentAccountSearchState(), []);
  const draftSnapshot = useMemo(
    () => sanitizePaymentAccountSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );
  const executedSnapshot = useMemo(
    () => sanitizePaymentAccountSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const filteredItems = useMemo(() => {
    const snapshot = sanitizePaymentAccountSearchSnapshot(executedSnapshot);
    const query = normalize(snapshot.q);
    const typeRule = snapshot.filters.find((rule) => rule.field === PaymentAccountSearchFields.TYPE);
    const statusRule = snapshot.filters.find((rule) => rule.field === PaymentAccountSearchFields.STATUS);
    const currencyRule = snapshot.filters.find((rule) => rule.field === PaymentAccountSearchFields.CURRENCY);
    const defaultRule = snapshot.filters.find((rule) => rule.field === PaymentAccountSearchFields.DEFAULT);

    return items.filter((account) => {
      if (typeRule?.values?.length && typeRule.mode !== "exclude" && !typeRule.values.includes(account.type)) return false;
      if (typeRule?.values?.length && typeRule.mode === "exclude" && typeRule.values.includes(account.type)) return false;

      const statusValue = account.isActive ? "ACTIVE" : "INACTIVE";
      if (statusRule?.values?.length && statusRule.mode !== "exclude" && !statusRule.values.includes(statusValue)) return false;
      if (statusRule?.values?.length && statusRule.mode === "exclude" && statusRule.values.includes(statusValue)) return false;

      if (currencyRule?.values?.length && currencyRule.mode !== "exclude" && !currencyRule.values.includes(account.currency)) return false;
      if (currencyRule?.values?.length && currencyRule.mode === "exclude" && currencyRule.values.includes(account.currency)) return false;

      const defaultValue = account.isDefault ? "DEFAULT" : "NOT_DEFAULT";
      if (defaultRule?.values?.length && defaultRule.mode !== "exclude" && !defaultRule.values.includes(defaultValue)) return false;
      if (defaultRule?.values?.length && defaultRule.mode === "exclude" && defaultRule.values.includes(defaultValue)) return false;

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
  }, [executedSnapshot, items]);

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

  const submitSearch = useCallback(() => {
    startTransition(() => setAppliedSearchText(searchText.trim()));
  }, [searchText]);

  const applySmartSnapshot = useCallback((snapshot: PaymentAccountSearchSnapshot) => {
    const normalized = sanitizePaymentAccountSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
    });
  }, []);

  const handleApplySearchRule = useCallback((rule: PaymentAccountSearchRule) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = upsertPaymentAccountSearchRule(
          sanitizePaymentAccountSearchSnapshot({ q: searchText, filters: current }),
          rule,
        );
        return next.filters;
      });
    });
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: PaymentAccountSearchFilterKey) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = removePaymentAccountSearchKey(
          sanitizePaymentAccountSearchSnapshot({ q: searchText, filters: current }),
          fieldId,
        );
        return next.filters;
      });
    });
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | PaymentAccountSearchFilterKey) => {
    const nextSnapshot = removePaymentAccountSearchKey(executedSnapshot, key);
    startTransition(() => {
      setSearchText(nextSnapshot.q ?? "");
      setAppliedSearchText(nextSnapshot.q ?? "");
      setSearchFilters(nextSnapshot.filters);
    });
  }, [executedSnapshot]);

  const handleSaveMetric = useCallback(async (name: string) => {
    const snapshot = sanitizePaymentAccountSearchSnapshot({
      q: appliedSearchText,
      filters: searchFilters,
    });
    if (!hasPaymentAccountSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const next = saveLocalSearchMetric<PaymentAccountSearchSnapshot>(PAYMENT_ACCOUNT_SAVED_METRICS_KEY, {
        name,
        label: buildPaymentAccountSearchChips(snapshot, searchState).map((chip) => chip.label).join(" · ") || name,
        snapshot,
      });
      setSavedMetrics(next);
      showFeedback(successResponse("Metrica de cuentas de pago guardada."));
      return true;
    } finally {
      setSavingMetric(false);
    }
  }, [appliedSearchText, searchFilters, searchState, showFeedback]);

  const handleDeleteMetric = useCallback((metricId: string) => {
    const next = deleteLocalSearchMetric<PaymentAccountSearchSnapshot>(PAYMENT_ACCOUNT_SAVED_METRICS_KEY, metricId);
    setSavedMetrics(next);
    showFeedback(successResponse("Metrica de cuentas de pago eliminada."));
  }, [showFeedback]);

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
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
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

  const smartSearchColumns = useMemo(
    () => buildPaymentAccountSmartSearchColumns(searchState),
    [searchState],
  );
  const searchChips = useMemo(
    () => buildPaymentAccountSearchChips(executedSnapshot, searchState),
    [executedSnapshot, searchState],
  );

  const toolbarSearchContent = (
    <DataTableSearchBar
      value={searchText}
      onChange={(value) => startTransition(() => setSearchText(value))}
      onSubmitSearch={submitSearch}
      searchLabel="Buscar cuentas de pago"
      searchName="payment-accounts-smart-search"
      canSaveMetric={hasPaymentAccountSearchCriteria(executedSnapshot)}
      saveLoading={savingMetric}
      onSaveMetric={handleSaveMetric}
    >
      <PaymentAccountSmartSearchPanel
        recent={[]}
        saved={savedMetrics}
        columns={smartSearchColumns}
        snapshot={draftSnapshot}
        searchState={searchState}
        filterQuery={searchText}
        onApplySnapshot={applySmartSnapshot}
        onApplyRule={handleApplySearchRule}
        onRemoveRule={handleRemoveSearchRule}
        onDeleteMetric={handleDeleteMetric}
      />
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

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => handleRemoveChip(chip.removeKey)}
      />

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
