import { ChevronRight, Tag } from "lucide-react";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import type {
  ModuleLabelConfigMap,
  ModuleLabelSelectOption,
  VisibleMailLabelItem,
} from "@/features/roles/types/rolesPermissions.types";
import {
  cn,
  EMPTY_LABEL_OPTION_VALUE,
  MODULE_LABEL_KEYS,
} from "@/features/roles/utils/rolesPermissions.utils";
import { getPermissionModuleLabel } from "@/features/users/utils/permissionPresentation";

type RoleModuleConfigPanelProps = {
  configsOpen: boolean;
  moduleConfigs: ModuleLabelConfigMap;
  mailLabels: VisibleMailLabelItem[];
  canManageNotifications: boolean;
  savingModuleKey: string | null;
  onToggleConfigs: () => void;
  onSaveModuleConfig: (moduleKey: string, nextLabelId: string | null) => void;
};

export function RoleModuleConfigPanel({
  configsOpen,
  moduleConfigs,
  mailLabels,
  canManageNotifications,
  savingModuleKey,
  onToggleConfigs,
  onSaveModuleConfig,
}: RoleModuleConfigPanelProps) {
  const moduleLabelOptions: ModuleLabelSelectOption[] = [
    { value: EMPTY_LABEL_OPTION_VALUE, label: "Sin etiqueta" },
    ...mailLabels.map((label) => ({ value: label.id, label: label.name })),
  ];

  return (
    <section className="border-b border-zinc-200/70 pb-3 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4">
      <button
        type="button"
        onClick={onToggleConfigs}
        className="flex w-full items-center gap-3 rounded-sm px-1 py-2 text-left transition hover:bg-zinc-50"
      >
        <ChevronRight className={cn("h-4 w-4 text-zinc-400 transition", configsOpen && "rotate-90")} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-950">Configuración modular</p>
          <p className="mt-0.5 text-xs text-zinc-500">Etiqueta conectada por módulo</p>
        </div>
        <Tag className="h-4 w-4 text-zinc-400" />
      </button>

      {configsOpen ? (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
          {MODULE_LABEL_KEYS.map((moduleKey) => (
            <div
              key={moduleKey}
              className="group grid gap-2 rounded-sm px-1 py-2 transition hover:bg-zinc-50/80"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-zinc-800">
                  {getPermissionModuleLabel(moduleKey)}
                </span>
                {moduleConfigs[moduleKey] ? (
                  <span className="rounded-sm bg-gradient-to-r from-emerald-50 to-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                    Activa
                  </span>
                ) : null}
              </span>

              <FloatingSelect
                label={`Etiqueta ${getPermissionModuleLabel(moduleKey)}`}
                name={`module-label-${moduleKey}`}
                value={moduleConfigs[moduleKey] ?? EMPTY_LABEL_OPTION_VALUE}
                options={moduleLabelOptions}
                onChange={(nextValue) => {
                  const nextLabelId = nextValue === EMPTY_LABEL_OPTION_VALUE ? null : nextValue;
                  const currentLabelId = moduleConfigs[moduleKey] ?? null;
                  if (currentLabelId === nextLabelId) return;
                  onSaveModuleConfig(moduleKey, nextLabelId);
                }}
                disabled={!canManageNotifications || savingModuleKey === moduleKey}
                className="h-9 rounded-sm text-xs"
              />
            </div>
          ))}

          {!canManageNotifications ? (
            <p className="px-1 pt-1 text-xs text-zinc-500 sm:col-span-2 xl:col-span-1">
              Solo lectura: falta permiso notifications.manage.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
