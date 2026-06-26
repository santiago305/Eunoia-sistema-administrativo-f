export type PurchaseDetailTab = "summary" | "items" | "reception" | "payments" | "documents" | "timeline" | "approvals";

export const resolvePurchaseDetailTabFromPath = (pathname: string): PurchaseDetailTab => {
  if (pathname.endsWith("/pagos")) return "payments";
  if (pathname.endsWith("/documentos")) return "documents";
  return "summary";
};
