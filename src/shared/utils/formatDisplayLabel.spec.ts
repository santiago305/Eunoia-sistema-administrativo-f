import { describe, expect, it } from "vitest";
import { formatDisplayLabel } from "./formatDisplayLabel";

describe("formatDisplayLabel", () => {
  it.each([
    ["producción", "Producción"],
    ["GESTIÓN COMERCIAL", "Gestión Comercial"],
    ["administración_de_niños", "Administración De Niños"],
    ["  control   de-calidad  ", "Control De Calidad"],
  ])("formats %s without capitalizing letters after accents", (input, expected) => {
    expect(formatDisplayLabel(input)).toBe(expected);
  });
});
