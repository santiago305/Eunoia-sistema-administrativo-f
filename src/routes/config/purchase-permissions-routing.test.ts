import { describe, expect, it } from "vitest";
import { routesConfig } from "./routesConfig";
import { RoutesPaths } from "./routesPaths";

const permissionsFor = (path: string) =>
  routesConfig.find((route) => route.path === path)?.permissionsAllowed ?? [];

describe("purchase permissions routing", () => {
  it("protects purchase dashboard with dashboard-specific permission", () => {
    expect(permissionsFor(RoutesPaths.purchaseDashboard)).toEqual([
      "purchases_dashboard.view",
    ]);
  });

  it("protects purchase subpages with final action permissions", () => {
    expect(permissionsFor(RoutesPaths.purchaseCreate)).toEqual([
      "page.purchases.view",
      "purchases.create",
    ]);
    expect(permissionsFor(RoutesPaths.purchaseReception)).toEqual([
      "page.purchase-receptions.view",
      "purchases.receive",
    ]);
    expect(permissionsFor(RoutesPaths.purchasePayments)).toEqual([
      "page.payments.view",
      "payments.read",
    ]);
    expect(permissionsFor(RoutesPaths.purchaseDocuments)).toEqual([
      "page.purchases.view",
      "purchases.attach_documents",
    ]);
    expect(permissionsFor(RoutesPaths.purchaseDetail)).toEqual([
      "page.purchases.view",
      "purchases.view_detail",
    ]);
  });

  it("protects payment pages with final action permissions", () => {
    expect(permissionsFor(RoutesPaths.payments)).toEqual([
      "page.payments.view",
      "payments.read",
    ]);
    expect(permissionsFor(RoutesPaths.accountsPayable)).toEqual([
      "page.accounts-payable.view",
      "accounts-payable.view",
    ]);
    expect(permissionsFor(RoutesPaths.paymentAccounts)).toEqual([
      "page.payment-accounts.view",
      "payment_accounts.view",
    ]);
  });
});
