export const CONDITIONS = {
  IS_PAID: "IS_PAID",
  HAS_STOCK: "HAS_STOCK",
  NOT_CANCELLED: "NOT_CANCELLED",
  DATE_AFTER: "DATE_AFTER",
  DATE_BEFORE: "DATE_BEFORE",
} as const;

export const ACTIONS = {
  RESERVE_STOCK: "RESERVE_STOCK",
  CONSUME_STOCK: "CONSUME_STOCK",
  REVERT_STOCK: "REVERT_STOCK",
  MARK_INVOICE_SENT: "MARK_INVOICE_SENT",
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
  isGlobal: boolean;
  excludedStateIds: string[];
  effect?: WorkflowTransitionEffect;
  purpose: WorkflowTransitionPurpose;
  name: string;
  code: string;
  isActive: boolean;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
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
  isGlobal: boolean;
  excludedStateClientIds: string[];
  effect?: WorkflowTransitionEffect;
  purpose: WorkflowTransitionPurpose;
  isActive: boolean;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
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
    isGlobal: boolean;
    excludedStateRefs: string[];
    effect?: WorkflowTransitionEffect;
    purpose: WorkflowTransitionPurpose;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    isActive?: boolean;
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
  };
  states: WorkflowState[];
  transitions: Array<Omit<WorkflowTransition, "conditions">>;
  conditions: Array<Required<Pick<WorkflowCondition, "id" | "transitionId" | "type" | "config" | "position">>>;
  actions: Array<Required<Pick<WorkflowAction, "id" | "transitionId" | "type" | "config" | "position">>>;
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
