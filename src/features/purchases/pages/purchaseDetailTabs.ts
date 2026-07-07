export type PurchaseDetailTab = "summary" | "items" | "reception" | "payments" | "documents" | "timeline" | "approvals";

export type PurchaseDetailTabItem = {
  value: PurchaseDetailTab;
  label: string;
  permission?: string;
};

export const purchaseDetailTabItems: PurchaseDetailTabItem[] = [
  { value: "summary", label: "Resumen" },
  { value: "items", label: "Items" },
  { value: "reception", label: "Recepción" },
  { value: "payments", label: "Pagos" },
  { value: "documents", label: "Documentos" },
  { value: "timeline", label: "Historial", permission: "purchases.view_history" },
  { value: "approvals", label: "Aprobaciones" },
];

export const resolvePurchaseDetailTabFromPath = (pathname: string): PurchaseDetailTab => {
  if (pathname.endsWith("/pagos")) return "payments";
  if (pathname.endsWith("/documentos")) return "documents";
  if (pathname.endsWith("/historial")) return "timeline";
  return "summary";
};

export const getVisiblePurchaseDetailTabs = (can: (permission: string) => boolean): PurchaseDetailTabItem[] =>
  purchaseDetailTabItems.filter((tab) => !tab.permission || can(tab.permission));
