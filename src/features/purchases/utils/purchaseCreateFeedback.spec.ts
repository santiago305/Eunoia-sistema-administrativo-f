import { describe, expect, it } from "vitest";
import { getPurchaseCreateErrorMessage } from "./purchaseCreateFeedback";

describe("getPurchaseCreateErrorMessage", () => {
  it("uses the API message when purchase creation returns an error response", () => {
    expect(
      getPurchaseCreateErrorMessage({
        type: "error",
        message: "No existe equivalencia para convertir KGM a NIU en este producto",
      }),
    ).toBe("No existe equivalencia para convertir KGM a NIU en este producto");
  });

  it("falls back to a generic message when the API does not include one", () => {
    expect(getPurchaseCreateErrorMessage({ type: "error", message: "" })).toBe("Registro fallido");
  });
});
