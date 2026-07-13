import { describe, expect, it } from "vitest";
import { getRouteMetaByPath, getRouteMetaByUrl } from "@/routes/config/routesConfig";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { getSidebarItems } from "@/shared/config/sidebarConfig";

describe("purchase pages routing", () => {
  it("exposes the page-based purchase routes without removing legacy purchase routes", () => {
    expect(RoutesPaths.purchase).toBe("/compra");
    expect(RoutesPaths.purchaseEdit).toBe("/compra/:poId");
    expect(RoutesPaths.purchases).toBe("/compras");
    expect(RoutesPaths.purchaseDashboard).toBe("/compras/dashboard");
    expect(RoutesPaths.purchaseDetail).toBe("/compras/:id");
    expect(RoutesPaths.purchaseEditPage).toBe("/compras/:id/editar");
    expect(RoutesPaths.purchasePayments).toBe("/compras/:id/pagos");
    expect(RoutesPaths.purchaseDocuments).toBe("/compras/:id/documentos");
    expect(RoutesPaths.purchaseHistory).toBe("/compras/:id/historial");
    expect(RoutesPaths.recurringPurchases).toBe("/compras/recurrentes");
    expect(RoutesPaths.paymentMethods).toBe("/metodos-pago");
  });

  it("keeps purchase page metadata protected with final purchase permissions", () => {
    const expectations = [
      [RoutesPaths.purchaseDashboard, ["purchases_dashboard.view"]],
      [RoutesPaths.purchaseDetail, ["page.purchases.view", "purchases.view_detail"]],
      [RoutesPaths.purchaseEditPage, ["page.purchases.view"]],
      [RoutesPaths.purchasePayments, ["page.payments.view", "payments.read"]],
      [RoutesPaths.purchaseDocuments, ["page.purchases.view", "purchases.attach_documents"]],
      [RoutesPaths.purchaseHistory, ["page.purchases.view", "purchases.view_detail", "purchases.view_history"]],
      [RoutesPaths.recurringPurchases, ["page.recurring-purchases.view", "recurring_purchases.view"]],
    ] as const;

    expectations.forEach(([path, permissions]) => {
      const meta = getRouteMetaByPath(path);
      expect(meta?.isProtected).toBe(true);
      expect(meta?.permissionsAllowed).toEqual(permissions);
    });
  });

  it("resolves concrete purchase urls to the correct page metadata", () => {
    expect(getRouteMetaByUrl("/compras/PO-123")?.path).toBe(RoutesPaths.purchaseDetail);
    expect(getRouteMetaByUrl("/compras/PO-123/editar")?.path).toBe(RoutesPaths.purchaseEditPage);
    expect(getRouteMetaByUrl("/compras/PO-123/pagos")?.path).toBe(RoutesPaths.purchasePayments);
    expect(getRouteMetaByUrl("/compras/PO-123/documentos")?.path).toBe(RoutesPaths.purchaseDocuments);
    expect(getRouteMetaByUrl("/compras/PO-123/historial")?.path).toBe(RoutesPaths.purchaseHistory);
    expect(getRouteMetaByUrl("/compra/PO-123")?.path).toBe(RoutesPaths.purchaseEdit);
  });

  it("adds page-based purchase entries to the sidebar", () => {
    const purchaseMenu = getSidebarItems().find((item) => item.label === "Compras");
    const purchaseHrefs = purchaseMenu?.children?.map((child) => child.href) ?? [];

    expect(purchaseHrefs).toContain(RoutesPaths.purchaseDashboard);
    expect(purchaseHrefs).toContain(RoutesPaths.purchases);
    expect(purchaseHrefs).not.toContain("/compras/nueva");
    expect(purchaseHrefs).not.toContain("/compras/historial");
    expect(purchaseHrefs).toContain(RoutesPaths.recurringPurchases);
  });

  it("adds payment methods to the payment sidebar group", () => {
    const paymentsMenu = getSidebarItems().find((item) => item.label === "Pagos");
    const paymentHrefs = paymentsMenu?.children?.map((child) => child.href) ?? [];

    expect(paymentHrefs).toContain(RoutesPaths.payments);
    expect(paymentHrefs).toContain(RoutesPaths.accountsPayable);
    expect(paymentHrefs).toContain(RoutesPaths.paymentAccounts);
    expect(paymentHrefs).toContain(RoutesPaths.paymentMethods);
  });
});
