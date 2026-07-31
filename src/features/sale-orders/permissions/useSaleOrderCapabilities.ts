import { useMemo } from "react";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { SALE_ORDER_PAGE_PERMISSION as PAGE, SALE_ORDER_PERMISSIONS as P } from "./saleOrderPermissions";

export const useSaleOrderCapabilities = () => {
  const { can, permissions } = usePermissions();
  const allowed = (permission: string) => permissions === undefined ? true : can(permission);
  return useMemo(() => {
    const canViewDeleted = allowed(P.viewDeleted);
    const canRestore = canViewDeleted && allowed(P.restore);
    return {
      canEnter: allowed(PAGE), canList: allowed(P.view), canCreate: allowed(P.create),
      canEdit: allowed(P.viewDetail) && allowed(P.update), canViewDeleted, canRestore,
      canSelect: [P.assignAdviser, P.changeState, P.executeWorkflowAction, P.preguideUpdate, P.preparedUpdate, P.delete, P.restore].some(allowed),
      canBulkDelete: allowed(P.delete), canBulkRestore: canRestore,
      canBulkAssign: allowed(P.assignAdviser), canBulkChangeState: allowed(P.changeState),
      canUpdatePreguide: allowed(P.preguideUpdate), canUpdatePrepared: allowed(P.preparedUpdate),
      canBulkUpdateTracking: allowed(P.preguideUpdate) || allowed(P.preparedUpdate),
      canViewCustomerData: allowed(P.viewCustomerData), canViewAmounts: allowed(P.viewAmounts),
      canViewProducts: allowed(P.viewProducts), canViewStock: allowed(P.viewStock),
      canViewPayments: allowed(P.viewPayments), canViewAttachments: allowed(P.viewAttachments),
      canViewHistory: allowed(P.viewHistory), canViewAudit: allowed(P.viewAudit),
      canExport: allowed(P.export), canImport: allowed(P.import), canViewPdf: allowed(P.viewPdf),
      canViewImportLotes: allowed(P.viewImportLotes),
      canManageWorkflows: allowed(P.manageWorkflows), canViewStatistics: allowed(P.viewStatistics),
      canAssignWorkflow: allowed(P.assignWorkflow), canCancel: allowed(P.cancel),
      canConfirmDelivery: allowed(P.confirmDelivery),
    };
  }, [can, permissions]);
};
