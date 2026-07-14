import type { SmartSearchFieldConfig, SmartSearchOperatorOption } from "@/shared/components/table/search";
import type { IncomeSearchCatalogs, IncomeSearchField, IncomeSearchOperator } from "../types/income.types";

type IncomeSmartSearchColumn = SmartSearchFieldConfig<IncomeSearchField, IncomeSearchOperator> & {
  key: IncomeSearchField;
};

const TEXT_OPERATORS: SmartSearchOperatorOption<IncomeSearchOperator>[] = [
  { id: "contains", label: "Contiene", inputMode: "text" },
  { id: "eq", label: "Es", inputMode: "text" },
];

const CATALOG_OPERATORS: SmartSearchOperatorOption<IncomeSearchOperator>[] = [
  { id: "eq", label: "Es" },
];

const RANGE_OPERATORS: SmartSearchOperatorOption<IncomeSearchOperator>[] = [
  { id: "range", label: "Entre", inputMode: "date-range" },
];

const NUMBER_OPERATORS: SmartSearchOperatorOption<IncomeSearchOperator>[] = [
  { id: "gte", label: "Mayor o igual", inputMode: "number" },
  { id: "lte", label: "Menor o igual", inputMode: "number" },
];

export function buildIncomeSmartSearchColumns(catalogs: IncomeSearchCatalogs = {}): IncomeSmartSearchColumn[] {
  return [
    {
      key: "client",
      id: "client",
      label: "Cliente",
      kind: "text",
      operators: TEXT_OPERATORS,
      placeholder: "Nombre del cliente",
    },
    {
      key: "saleOrderId",
      id: "saleOrderId",
      label: "Pedido",
      kind: "text",
      operators: TEXT_OPERATORS,
      placeholder: "UUID o correlativo",
    },
    {
      key: "method",
      id: "method",
      label: "Metodo",
      kind: "catalog",
      options: catalogs.methods ?? [],
      operators: CATALOG_OPERATORS,
    },
    {
      key: "account",
      id: "account",
      label: "Cuenta",
      kind: "catalog",
      options: catalogs.accounts ?? [],
      operators: CATALOG_OPERATORS,
    },
    {
      key: "date",
      id: "date",
      label: "Fecha",
      kind: "date",
      operators: RANGE_OPERATORS,
    },
    {
      key: "amount",
      id: "amount",
      label: "Monto",
      kind: "number",
      operators: NUMBER_OPERATORS,
    },
    {
      key: "hasEvidence",
      id: "hasEvidence",
      label: "Evidencia",
      kind: "catalog",
      options: [
        { id: "true", label: "Con evidencia" },
        { id: "false", label: "Sin evidencia" },
      ],
      operators: CATALOG_OPERATORS,
    },
  ];
}
