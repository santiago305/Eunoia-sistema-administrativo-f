import { useCallback, useMemo } from "react";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { SALE_ORDER_PAGE_PERMISSION as PAGE, SALE_ORDER_PERMISSIONS as P } from "./saleOrderPermissions";

export const useSaleOrderCapabilities = () => {
  const { can, permissions } = usePermissions();
  const allowed = useCallback(
    (permission: string) => permissions === undefined ? true : can(permission),
    [can, permissions],
  );
  return useMemo(() => {
    const canViewDeleted = allowed(P.viewDeleted);
    const canRestore = canViewDeleted && allowed(P.restore);
    return {
      canEnter: allowed(PAGE), canList: allowed(P.view), canCreate: allowed(P.create),
      canEdit: allowed(P.viewDetail) && allowed(P.update), canViewDeleted, canRestore,
      canManageAdvancedOrders: allowed(P.advancedOrders),
      canSelect: [P.assignAdviser, P.changeState, P.executeWorkflowAction, P.delete, P.restore].some(allowed),
      canBulkDelete: allowed(P.delete), canBulkRestore: canRestore,
      canBulkAssign: allowed(P.assignAdviser), canBulkChangeState: allowed(P.changeState),
      canViewCustomerData: allowed(P.viewCustomerData), canViewAmounts: allowed(P.viewAmounts),
      canViewProducts: allowed(P.viewProducts), canViewStock: allowed(P.viewStock),
      canViewPayments: allowed(P.viewPayments), canViewAttachments: allowed(P.viewAttachments),
      canViewHistory: allowed(P.viewHistory), canViewAudit: allowed(P.viewAudit),
      canExport: allowed(P.export), canImport: allowed(P.import), canViewPdf: allowed(P.viewPdf),
      canViewImportLotes: allowed(P.viewImportLotes),
      canViewSkuRecognitionCodes: allowed(P.viewSkuRecognitionCodes),
      canManageSkuRecognitionCodes: allowed(P.manageSkuRecognitionCodes),
      canManageWorkflows: allowed(P.manageWorkflows), canViewStatistics: allowed(P.viewStatistics),
      canAssignWorkflow: allowed(P.assignWorkflow), canCancel: allowed(P.cancel),
      canConfirmDelivery: allowed(P.confirmDelivery),
    };
  }, [allowed]);
};
