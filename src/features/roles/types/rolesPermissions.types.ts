import type { MailLabelItem } from "@/features/mail/types/message.types";
import type { AccessPermissionItem } from "@/shared/services/accessControlService";

export type RoleOption = {
  id: string;
  description: string;
};

export type ModuleLabelConfigItem = {
  id: string;
  moduleKey: string;
  labelId: string | null;
  updatedByUserId: string | null;
  updatedAt: string;
};

export type PermissionModuleGroup = {
  module: string;
  label: string;
  permissions: AccessPermissionItem[];
};

export type ModuleLabelConfigMap = Record<string, string | null>;

export type ModuleLabelSelectOption = {
  value: string;
  label: string;
};

export type VisibleMailLabelItem = MailLabelItem;
