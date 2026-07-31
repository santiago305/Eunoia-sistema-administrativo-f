import { useMemo } from "react";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { SALE_ORDER_PAGE_PERMISSION as PAGE, SALE_ORDER_PERMISSIONS as P } from "./saleOrderPermissions";

export const useSaleOrderCapabilities = () => {
  const { can } = usePermissions();
  return useMemo(() => {
    const canViewDeleted = can(P.viewDeleted);
    const canRestore = canViewDeleted && can(P.restore);
    return {
      canEnter: can(PAGE), canList: can(P.view), canCreate: can(P.create),
      canEdit: can(P.viewDetail) && can(P.update), canViewDeleted, canRestore,
      canSelect: [P.assignAdviser, P.changeState, P.executeWorkflowAction, P.preguideUpdate, P.preparedUpdate, P.delete, P.restore].some(can),
      canBulkDelete: can(P.delete), canBulkRestore: canRestore,
      canBulkAssign: can(P.assignAdviser), canBulkChangeState: can(P.changeState),
      canUpdatePreguide: can(P.preguideUpdate), canUpdatePrepared: can(P.preparedUpdate),
      canBulkUpdateTracking: can(P.preguideUpdate) || can(P.preparedUpdate),
      canViewCustomerData: can(P.viewCustomerData), canViewAmounts: can(P.viewAmounts),
      canViewProducts: can(P.viewProducts), canViewStock: can(P.viewStock),
      canViewPayments: can(P.viewPayments), canViewAttachments: can(P.viewAttachments),
      canViewHistory: can(P.viewHistory), canViewAudit: can(P.viewAudit),
      canExport: can(P.export), canImport: can(P.import), canViewPdf: can(P.viewPdf),
      canManageWorkflows: can(P.manageWorkflows), canViewStatistics: can(P.viewStatistics),
      canAssignWorkflow: can(P.assignWorkflow), canCancel: can(P.cancel),
      canConfirmDelivery: can(P.confirmDelivery),
    };
  }, [can]);
};
