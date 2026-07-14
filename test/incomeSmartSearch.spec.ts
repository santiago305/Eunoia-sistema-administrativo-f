import { describe, expect, it } from "vitest";
import { buildIncomeSmartSearchColumns } from "@/features/income/utils/incomeSmartSearch";

describe("incomeSmartSearch", () => {
  it("exposes administrative income filters", () => {
    const columns = buildIncomeSmartSearchColumns({
      methods: [{ label: "Yape", value: "Yape" }],
      accounts: [{ label: "BCP", value: "account-1" }],
    });

    expect(columns.map((column) => column.key)).toEqual([
      "client",
      "saleOrderId",
      "method",
      "account",
      "date",
      "amount",
      "hasEvidence",
    ]);
  });
});
