import { describe, expect, it } from "vitest";
import { buildIncomeSmartSearchColumns } from "@/features/income/utils/incomeSmartSearch";

describe("incomeSmartSearch", () => {
  it("exposes administrative income filters", () => {
    const columns = buildIncomeSmartSearchColumns({
      methods: [{ label: "Yape", id: "Yape" }],
      accounts: [{ label: "BCP", id: "account-1" }],
    });

    expect(columns.map((column) => column.key)).toEqual([
      "status",
      "paymentMethodId",
      "detail",
      "companyPaymentAccountId",
      "hasEvidence",
    ]);
  });
});
