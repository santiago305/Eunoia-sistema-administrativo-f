import { describe, expect, it } from "vitest";
import {
  applyMapping,
  autoMapColumns,
  getSelectableRows,
  normalizeHeader,
  updateMappedRowValue,
  validateRows,
} from "./excelImporter.utils";
import type { ImportField } from "./excelImporter.types";

const fields: ImportField[] = [
  { key: "clientName", label: "Cliente", required: true, aliases: ["nombre cliente"] },
  { key: "quantity", label: "Cantidad", required: true, type: "number", aliases: ["qty"] },
  { key: "paid", label: "Pagado", type: "boolean", aliases: ["pagado"] },
];

describe("excelImporter utils", () => {
  it("normalizes headers for accent and case insensitive matching", () => {
    expect(normalizeHeader(" NúMero de Documento ")).toBe("numero de documento");
  });

  it("automaps fields using labels and aliases", () => {
    const mapping = autoMapColumns(fields, ["Nombre Cliente", "QTY", "Pagado"]);

    expect(mapping).toEqual({
      clientName: "Nombre Cliente",
      quantity: "QTY",
      paid: "Pagado",
    });
  });

  it("applies mapping and converts supported field types", () => {
    const rows = [{ Cliente: "Juan Pérez", Cantidad: "2", Pagado: "sí" }];
    const mappedRows = applyMapping(rows, { clientName: "Cliente", quantity: "Cantidad", paid: "Pagado" }, fields);

    expect(mappedRows).toEqual([{ clientName: "Juan Pérez", quantity: 2, paid: true }]);
  });

  it("normalizes day-month-year date values for date inputs", () => {
    const mappedRows = applyMapping(
      [{ Fecha: "16-05-2026" }],
      { deliveryDate: "Fecha" },
      [{ key: "deliveryDate", label: "Fecha", type: "date" }],
    );

    expect(mappedRows).toEqual([{ deliveryDate: "2026-05-16" }]);
  });

  it.each([
    ["20/08/2026 14:30", "2026-08-20"],
    ["20/08/26", "2026-08-20"],
    ["8/20/26", "2026-08-20"],
    ["2026-08-20T14:30:00-05:00", "2026-08-20"],
    [46254, "2026-08-20"],
  ])("normalizes common Excel date value %s", (value, expected) => {
    const mappedRows = applyMapping(
      [{ Fecha: value }],
      { deliveryDate: "Fecha" },
      [{ key: "deliveryDate", label: "Fecha", type: "date" }],
    );

    expect(mappedRows).toEqual([{ deliveryDate: expected }]);
  });

  it("reports a filled but invalid date instead of allowing an empty saved date", () => {
    const dateFields: ImportField[] = [
      { key: "deliveryDate", label: "Fecha de entrega", type: "date" },
    ];
    const mappedRows = applyMapping(
      [{ Fecha: "31/02/2026" }],
      { deliveryDate: "Fecha" },
      dateFields,
    );

    expect(validateRows(mappedRows, dateFields).errors).toEqual([
      {
        rowIndex: 0,
        fieldKey: "deliveryDate",
        message: "Fecha de entrega debe ser una fecha válida.",
      },
    ]);
  });

  it("reports required and invalid number row errors", () => {
    const mappedRows = [{ clientName: "", quantity: "abc" }];
    const result = validateRows(mappedRows, fields);

    expect(result.hasErrors).toBe(true);
    expect(result.errors).toEqual([
      { rowIndex: 0, fieldKey: "clientName", message: "Cliente es requerido." },
      { rowIndex: 0, fieldKey: "quantity", message: "Cantidad debe ser un número válido." },
    ]);
  });
  it("updates a mapped row value using field conversion and transform", () => {
    const mappedRows = [{ clientName: "Ana", quantity: 1 }];
    const result = updateMappedRowValue(
      mappedRows,
      0,
      {
        key: "quantity",
        label: "Cantidad",
        type: "number",
        transform: (value) => (typeof value === "number" ? value * 2 : value),
      },
      "3",
    );

    expect(result).toEqual([{ clientName: "Ana", quantity: 6 }]);
    expect(mappedRows).toEqual([{ clientName: "Ana", quantity: 1 }]);
  });

  it("validates only selected preview rows", () => {
    const mappedRows = [
      { clientName: "Ana", quantity: 2 },
      { clientName: "", quantity: "abc" },
    ];

    const result = validateRows(mappedRows, fields, new Set([0]));

    expect(result.hasErrors).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it("returns selected rows in original order", () => {
    const mappedRows = [
      { clientName: "Ana", quantity: 2 },
      { clientName: "Luis", quantity: 5 },
      { clientName: "Eva", quantity: 1 },
    ];

    expect(getSelectableRows(mappedRows, new Set([2, 0]))).toEqual([
      { clientName: "Ana", quantity: 2 },
      { clientName: "Eva", quantity: 1 },
    ]);
  });
});
