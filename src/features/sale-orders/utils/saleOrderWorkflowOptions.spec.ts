import { describe, expect, it } from "vitest";
import { buildSaleOrderWorkflowOptions } from "./saleOrderWorkflowOptions";

describe("buildSaleOrderWorkflowOptions", () => {
  it("shows workflow revisions and orders the newest workflows first", () => {
    expect(
      buildSaleOrderWorkflowOptions([
        {
          id: "abonado-envio-v1",
          name: "Abonado envio",
          isActive: true,
          revision: 1,
          createdAt: "2026-07-01T10:00:00.000Z",
        },
        {
          id: "abonado-envio-v2",
          name: "Abonado envio",
          isActive: true,
          revision: 2,
          createdAt: "2026-08-20T10:00:00.000Z",
        },
        {
          id: "abonado-ce-v1",
          name: "Abonado CE",
          isActive: true,
          revision: 1,
          createdAt: "2026-08-10T10:00:00.000Z",
        },
      ]),
    ).toEqual([
      { value: "abonado-envio-v2", label: "Abonado envio v2" },
      { value: "abonado-ce-v1", label: "Abonado CE v1" },
      { value: "abonado-envio-v1", label: "Abonado envio v1" },
    ]);
  });

  it("falls back to revision and name when workflows have no dates", () => {
    expect(
      buildSaleOrderWorkflowOptions([
        { id: "b-v1", name: "Beta", revision: 1 },
        { id: "a-v1", name: "Alfa", revision: 1 },
        { id: "a-v2", name: "Alfa", revision: 2 },
        { id: "inactive", name: "Inactivo", revision: 3, isActive: false },
      ]),
    ).toEqual([
      { value: "a-v2", label: "Alfa v2" },
      { value: "a-v1", label: "Alfa v1" },
      { value: "b-v1", label: "Beta v1" },
    ]);
  });
});
