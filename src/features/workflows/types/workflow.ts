export const CONDITIONS = {
  IS_PAID: "IS_PAID",
  IS_NOT_PAID: "IS_NOT_PAID",
  HAS_STOCK: "HAS_STOCK",
  NOT_CANCELLED: "NOT_CANCELLED",
  DATE_AFTER: "DATE_AFTER",
  DATE_BEFORE: "DATE_BEFORE",
  SCHEDULE_DELIVERY_WINDOW: "SCHEDULE_DELIVERY_WINDOW",
  SALE_ORDER_FIELD_REQUIRED: "SALE_ORDER_FIELD_REQUIRED",
} as const;

export const ACTIONS = {
  RESERVE_STOCK: "RESERVE_STOCK",
  CONSUME_STOCK: "CONSUME_STOCK",
  REVERT_STOCK: "REVERT_STOCK",
  RESTORE_STOCK: "RESTORE_STOCK",
  MARK_INVOICE_SENT: "MARK_INVOICE_SENT",
  MARK_PREGUIDE: "MARK_PREGUIDE",
  UNMARK_PREGUIDE: "UNMARK_PREGUIDE",
  MARK_PREPARED: "MARK_PREPARED",
  UNMARK_PREPARED: "UNMARK_PREPARED",
  ASSIGN_WAREHOUSE_BY_PROVINCE: "ASSIGN_WAREHOUSE_BY_PROVINCE",
  ASSIGN_WAREHOUSE_BY_WORKFLOW: "ASSIGN_WAREHOUSE_BY_WORKFLOW",
} as const;

export const TRANSITION_PURPOSES = {
  STANDARD: "STANDARD",
  CANCEL: "CANCEL",
} as const;

export const TRANSITION_EFFECTS = {
  MOVE_STATE: "MOVE_STATE",
  RUN_ACTIONS: "RUN_ACTIONS",
} as const;

export type WorkflowConditionType = (typeof CONDITIONS)[keyof typeof CONDITIONS];
export type WorkflowActionType = (typeof ACTIONS)[keyof typeof ACTIONS];
export type AssignWarehouseByProvinceConfig = {
  mode: "INCLUDE" | "EXCLUDE";
  provinceIds: string[];
  warehouseId: string;
};
export type AssignWarehouseByWorkflowConfig = {
  workflowId: string;
  warehouseId: string;
};
export type WorkflowTransitionPurpose =
  (typeof TRANSITION_PURPOSES)[keyof typeof TRANSITION_PURPOSES];
export type WorkflowTransitionEffect =
  (typeof TRANSITION_EFFECTS)[keyof typeof TRANSITION_EFFECTS];

export type WorkflowCondition = {
  id?: string;
  transitionId?: string;
  type: WorkflowConditionType;
  config: Record<string, unknown>;
  position?: number;
  sortOrder?: number;
};

export type WorkflowAction = {
  id?: string;
  transitionId?: string;
  type: WorkflowActionType;
  config: Record<string, unknown>;
  position?: number;
  branch?: "THEN" | "ELSE";
};

export type WorkflowState = {
  id: string;
  workflowId: string;
  saleOrderStateId: string;
  name: string;
  code: string;
  color: string | null;
  position?: number;
  positionX: number | null;
  positionY: number | null;
  isInitial: boolean;
  isFinal: boolean;
  isActive: boolean;
  sortOrder?: number;
};

export type WorkflowTransition = {
  id: string;
  workflowId: string;
  fromStateId: string | null;
  toStateId: string | null;
  elseToStateId?: string | null;
  isGlobal: boolean;
  excludedStateIds: string[];
  effect?: WorkflowTransitionEffect;
  purpose: WorkflowTransitionPurpose;
  name: string;
  code: string;
  isActive: boolean;
  autoTrigger?: boolean;
  priority?: number;
  elseEffect?: WorkflowTransitionEffect | null;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
  positionX?: number | null;
  positionY?: number | null;
};

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  createdAt?: string;
  updatedAt?: string | null;
  familyId?: string;
  revision?: number;
  lifecycleStatus?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isCurrent?: boolean;
  basedOnWorkflowId?: string | null;
  publishedAt?: string | null;
};

export type SaleOrderState = {
  id?: string | null;
  code?: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string | null;
};

export type ConditionCatalogItem = {
  type: WorkflowConditionType;
  configSchema: Record<string, unknown>;
};

export type ActionCatalogItem = {
  type: WorkflowActionType;
  configSchema: Record<string, unknown>;
};

export type WorkflowDraftState = Omit<WorkflowState, "id" | "workflowId"> & {
  id?: string;
  clientId: string;
  isSystem?: boolean;
};

export type WorkflowDraftTransition = {
  id?: string;
  clientId: string;
  name: string;
  code: string;
  fromStateClientId: string | null;
  toStateClientId: string | null;
  elseToStateClientId: string | null;
  isGlobal: boolean;
  excludedStateClientIds: string[];
  effect?: WorkflowTransitionEffect;
  purpose: WorkflowTransitionPurpose;
  isActive: boolean;
  autoTrigger: boolean;
  priority: number;
  elseEffect: WorkflowTransitionEffect | null;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  elseActions: WorkflowAction[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  isSystem?: boolean;
};

export type WorkflowDraft = {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  states: WorkflowDraftState[];
  transitions: WorkflowDraftTransition[];
  familyId?: string;
  revision?: number;
  lifecycleStatus?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isCurrent?: boolean;
  basedOnWorkflowId?: string | null;
};

export type SaveFullWorkflowRequest = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  states: Array<{
    id?: string;
    clientId: string;
    saleOrderStateId: string;
    position?: number;
    positionX?: number | null;
    positionY?: number | null;
    isInitial?: boolean;
    isFinal?: boolean;
    isActive?: boolean;
  }>;
  transitions: Array<{
    id?: string;
    clientId: string;
    code: string;
    name: string;
    fromStateRef: string | null;
    toStateRef?: string | null;
    elseToStateRef?: string | null;
    isGlobal: boolean;
    excludedStateRefs: string[];
    effect?: WorkflowTransitionEffect;
    purpose: WorkflowTransitionPurpose;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    positionX?: number | null;
    positionY?: number | null;
    isActive?: boolean;
    autoTrigger?: boolean;
    priority?: number;
    elseEffect?: WorkflowTransitionEffect | null;
    conditions?: Array<{
      type: WorkflowConditionType;
      config?: Record<string, unknown>;
      position?: number;
    }>;
    actions?: Array<{
      type: WorkflowActionType;
      config?: Record<string, unknown>;
      position?: number;
    }>;
    elseActions?: Array<{
      type: WorkflowActionType;
      config?: Record<string, unknown>;
      position?: number;
    }>;
  }>;
};

export type SaveFullWorkflowResponse = {
  workflow: {
    id: string;
    name: string;
    normalizedName: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
    familyId?: string;
    revision?: number;
    lifecycleStatus?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    isCurrent?: boolean;
    basedOnWorkflowId?: string | null;
    publishedAt?: string | null;
  };
  states: WorkflowState[];
  transitions: Array<Omit<WorkflowTransition, "conditions">>;
  conditions: Array<Required<Pick<WorkflowCondition, "id" | "transitionId" | "type" | "config" | "position">>>;
  actions: Array<Required<Pick<WorkflowAction, "id" | "transitionId" | "type" | "config" | "position">>>;
};

export type WorkflowDraftTestSession = {
  id: string;
  saleOrderId: string;
  status: 'ACTIVE' | 'REVERTED';
  startedAt: string;
  revertedAt?: string | null;
  serie?: string | null;
  correlative?: number | null;
  currentSaleOrderStateId?: string | null;
};

export type WorkflowPublishPreview = {
  workflowId: string;
  revision: number;
  pendingOrders: number;
  activeTests: number;
  inventoryAdjustments: number;
  items: Array<{
    saleOrderId: string;
    serie?: string | null;
    correlative?: number | null;
    toStateId: string;
    toStateName: string;
    currentStockStatus: string;
    desiredStockStatus: string;
    fromWarehouseId?: string | null;
    toWarehouseId?: string | null;
    warehouseChanged?: boolean;
    stockActions: string[];
    transitionNames: string[];
  }>;
};

export type AvailableTransition = {
  id: string;
  name: string;
  code: string;
  purpose: WorkflowTransitionPurpose;
  fromState: Pick<WorkflowState, "id" | "name" | "code" | "color"> | null;
  toState: Pick<WorkflowState, "id" | "name" | "code" | "color" | "isFinal"> | null;
  available: boolean;
  failures: Array<{ type: string; reason?: string; passed: false }>;
  conditions: WorkflowCondition[];
};

export type SaleOrderWorkflowHistoryItem = {
  id: string;
  workflowId: string;
  transition: Omit<WorkflowTransition, "conditions" | "actions">;
  fromState: WorkflowState;
  toState: WorkflowState;
  executedByUser: { id: string; email: string } | null;
  executedAt: string;
  metadata: Record<string, unknown> | null;
};

export type WorkflowDraftValidation = {
  valid: boolean;
  errors: string[];
};

