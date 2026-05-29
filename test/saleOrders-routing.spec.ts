import { describe, expect, it } from "vitest";
import { RoutesPaths } from "@/routes/config/routesPaths";

describe("sale orders routing", () => {
  it("expone /pedidos", () => {
    expect(RoutesPaths.saleOrders).toBe("/pedidos");
  });
});

