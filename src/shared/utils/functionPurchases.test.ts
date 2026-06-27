import { describe, expect, it } from "vitest";
import { buildEmptyForm } from "./functionPurchases";

describe("buildEmptyForm", () => {
  it("does not preselect a payment form for purchases created without payment setup", () => {
    const form = buildEmptyForm();

    expect(form.paymentForm).toBeUndefined();
  });
});
