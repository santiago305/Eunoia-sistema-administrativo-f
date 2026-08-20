import { describe, expect, it } from "vitest";
import { normalizePeruvianMobile, saleOrderImportFields } from "./saleImporter";

describe("sale order phone import", () => {
  it.each([
    ["+51 918 536 756", "918536756"],
    ["51918536756", "918536756"],
    ["0051 918-536-756", "918536756"],
    ["918536756", "918536756"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePeruvianMobile(input)).toBe(expected);
  });

  it("validates exactly 9 digits beginning with 9", () => {
    const phoneField = saleOrderImportFields.find((field) => field.key === "phone");
    expect(phoneField?.validate?.("918536756", {})).toBeUndefined();
    expect(phoneField?.validate?.("818536756", {})).toContain("9 dígitos");
    expect(phoneField?.validate?.("91853675", {})).toContain("9 dígitos");
  });
});
