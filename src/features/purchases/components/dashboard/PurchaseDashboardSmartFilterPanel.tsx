import {
  SmartSearchPanel,
  type DataTableSearchOption,
  type DataTableSavedSearchItem,
  type SmartSearchFieldConfig,
} from "@/shared/components/table/search";
import type {
  PurchaseDashboardFilterField,
  PurchaseDashboardFilterOperator,
  PurchaseDashboardSavedFilterCatalogs,
  PurchaseDashboardSavedFilterRule,
  PurchaseDashboardSavedFilterSnapshot,
} from "@/features/purchases/types/purchase-dashboard.types";

type Props = {
  snapshot: PurchaseDashboardSavedFilterSnapshot;
  saved?: DataTableSavedSearchItem<PurchaseDashboardSavedFilterSnapshot>[];
  catalogs: PurchaseDashboardSavedFilterCatalogs;
  onApplySnapshot: (snapshot: PurchaseDashboardSavedFilterSnapshot) => void;
  onApplyRule: (rule: PurchaseDashboardSavedFilterRule) => void;
  onRemoveRule: (fieldId: PurchaseDashboardFilterField) => void;
  onDeleteMetric?: (metricId: string) => void;
};

const IN_OPERATOR = [{ id: "in", label: "Es" }] satisfies Array<{
  id: PurchaseDashboardFilterOperator;
  label: string;
}>;

export function PurchaseDashboardSmartFilterPanel({
  snapshot,
  saved = [],
  catalogs,
  onApplySnapshot,
  onApplyRule,
  onRemoveRule,
  onDeleteMetric,
}: Props) {
  const fields = buildDashboardFields(catalogs);

  return (
    <SmartSearchPanel
      fields={fields}
      saved={saved}
      snapshot={snapshot}
      onApplySnapshot={onApplySnapshot}
      onApplyRule={onApplyRule}
      onRemoveRule={onRemoveRule}
      onDeleteMetric={onDeleteMetric}
      getRule={findDashboardRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getDashboardRuleSummary(currentSnapshot, fieldId, catalogs)
      }
      getSelectionCount={getDashboardSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Selecciona filtros para el dashboard de compras."
      initialVisibleFields={7}
    />
  );
}

function buildDashboardFields(
  catalogs: PurchaseDashboardSavedFilterCatalogs,
): SmartSearchFieldConfig<PurchaseDashboardFilterField, PurchaseDashboardFilterOperator>[] {
  return [
    {
      id: "purchaseType",
      label: "Tipo de compra",
      kind: "catalog",
      options: catalogs.purchaseTypes ?? [],
      operators: IN_OPERATOR,
    },
    {
      id: "paymentStatus",
      label: "Estado de pago",
      kind: "catalog",
      options: catalogs.paymentStatuses ?? [],
      operators: IN_OPERATOR,
    },
    {
      id: "supplierId",
      label: "Proveedores",
      kind: "catalog",
      options: catalogs.suppliers ?? [],
      operators: IN_OPERATOR,
    },
    {
      id: "userId",
      label: "Usuarios",
      kind: "catalog",
      options: catalogs.users ?? [],
      operators: IN_OPERATOR,
    },
    {
      id: "warehouseId",
      label: "Almacenes",
      kind: "catalog",
      options: catalogs.warehouses ?? [],
      operators: IN_OPERATOR,
    },
    {
      id: "paymentMethodId",
      label: "Metodos de pago",
      kind: "catalog",
      options: catalogs.paymentMethods ?? [],
      operators: IN_OPERATOR,
    },
    {
      id: "companyPaymentAccountId",
      label: "Cuenta o tarjeta",
      kind: "catalog",
      options: catalogs.companyPaymentAccounts ?? [],
      operators: IN_OPERATOR,
    },
  ];
}

function findDashboardRule(
  snapshot: PurchaseDashboardSavedFilterSnapshot,
  fieldId: PurchaseDashboardFilterField,
) {
  return snapshot.filters.find((rule) => rule.field === fieldId) ?? null;
}

function getDashboardRuleSummary(
  snapshot: PurchaseDashboardSavedFilterSnapshot,
  fieldId: PurchaseDashboardFilterField,
  catalogs: PurchaseDashboardSavedFilterCatalogs,
) {
  const rule = findDashboardRule(snapshot, fieldId);
  if (!rule?.values?.length) return null;

  const options = getCatalogOptions(catalogs, fieldId);
  return rule.values
    .map((value) => options.find((option) => option.id === value)?.label ?? value)
    .join(", ");
}

function getDashboardSelectionCount(
  snapshot: PurchaseDashboardSavedFilterSnapshot,
  fieldId: PurchaseDashboardFilterField,
) {
  return findDashboardRule(snapshot, fieldId)?.values?.length ?? 0;
}

function getCatalogOptions(
  catalogs: PurchaseDashboardSavedFilterCatalogs,
  fieldId: PurchaseDashboardFilterField,
): DataTableSearchOption[] {
  switch (fieldId) {
    case "purchaseType":
      return catalogs.purchaseTypes ?? [];
    case "paymentStatus":
      return catalogs.paymentStatuses ?? [];
    case "supplierId":
      return catalogs.suppliers ?? [];
    case "userId":
      return catalogs.users ?? [];
    case "warehouseId":
      return catalogs.warehouses ?? [];
    case "paymentMethodId":
      return catalogs.paymentMethods ?? [];
    case "companyPaymentAccountId":
      return catalogs.companyPaymentAccounts ?? [];
  }
}
