import { describe, expect, it } from "vitest";
import { buildIncomeSmartSearchColumns, buildIncomeSearchChips, upsertIncomeRule } from "./incomeSmartSearch";

describe("income reconciliation smart search", () => {
  it("offers all three reconciliation states as a separate filter", () => {
    expect(buildIncomeSmartSearchColumns().find((field) => field.id === "reconciliationStatus")?.options).toEqual([
      { id: "UNRECONCILED", label: "Sin conciliar" },
      { id: "PARTIALLY_RECONCILED", label: "Conciliación parcial" },
      { id: "RECONCILED", label: "Conciliado" },
    ]);
  });

  it("preserves reconciliation status in saved-search chips", () => {
    const snapshot = upsertIncomeRule({ q: "", filters: [] }, {
      field: "reconciliationStatus", operator: "in", mode: "include", values: ["PARTIALLY_RECONCILED"],
    });
    expect(buildIncomeSearchChips(snapshot)).toEqual([
      { id: "reconciliationStatus", label: "Conciliación bancaria: Conciliación parcial", removeKey: "reconciliationStatus" },
    ]);
  });

  it("offers available-credit choices and renders the selected credit filter chip", () => {
    expect(buildIncomeSmartSearchColumns().find((field) => field.id === "customerCreditStatus")?.options).toEqual([
      { id: "HAS_BALANCE", label: "Con saldo disponible" },
      { id: "NO_BALANCE", label: "Sin saldo disponible" },
    ]);
    const snapshot = upsertIncomeRule({ q: "", filters: [] }, {
      field: "customerCreditStatus", operator: "in", values: ["HAS_BALANCE"],
    });
    expect(buildIncomeSearchChips(snapshot)).toEqual([
      { id: "customerCreditStatus", label: "Saldo a favor: Con saldo disponible", removeKey: "customerCreditStatus" },
    ]);
  });
});
